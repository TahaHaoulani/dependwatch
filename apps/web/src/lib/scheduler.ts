/**
 * Internal scheduler: alert evaluation and digest delivery.
 * Multi-instance safe via Redis or DB locks. Call from POST /api/cron/scheduler (CRON_SECRET).
 */

import { prisma } from '@/lib/db';
import { acquireLock, releaseLock } from '@/lib/locks';
import { evaluateAlertRules } from '@/lib/alert-evaluate';
import { runDigestDelivery } from '@/lib/digest-delivery';
import { getWorkspaceSubscription } from '@/lib/subscription';
import { getPlanLimits } from '@/lib/stripe';

const ALERT_LOCK_PREFIX = 'alert:';
const DIGEST_LOCK_PREFIX = 'digest:';

/** Returns projects that are due for alert evaluation (frequency set and interval elapsed). */
async function getProjectsDueForAlerts(): Promise<{ projectId: string; retentionDays: number; projectName: string }[]> {
  const now = new Date();
  const configs = await prisma.projectScheduleConfig.findMany({
    where: {
      alertEvaluationFrequencyMinutes: { not: null },
    },
    include: {
      project: {
        select: { id: true, name: true, workspaceId: true },
      },
    },
  });
  const out: { projectId: string; retentionDays: number; projectName: string }[] = [];
  for (const c of configs) {
    const min = c.alertEvaluationFrequencyMinutes!;
    const last = c.lastAlertEvaluationAt;
    const nextDue = last
      ? new Date(last.getTime() + min * 60 * 1000)
      : new Date(0);
    if (now >= nextDue && c.project) {
      const sub = await getWorkspaceSubscription(c.project.workspaceId);
      const limits = getPlanLimits(sub.planId ?? 'free');
      out.push({
        projectId: c.project.id,
        retentionDays: limits.retentionDays,
        projectName: c.project.name,
      });
    }
  }
  return out;
}

/** Returns project IDs due for digest (enabled, frequency/time match). */
async function getProjectsDueForDigest(range: string): Promise<string[]> {
  const now = new Date();
  const configs = await prisma.projectScheduleConfig.findMany({
    where: {
      digestEnabled: true,
      digestFrequency: { not: null },
      digestTimeOfDay: { not: null },
      digestTimezone: { not: null },
    },
    include: { project: { select: { id: true } } },
  });
  const due: string[] = [];
  for (const c of configs) {
    if (!c.project) continue;
    const tz = c.digestTimezone ?? 'UTC';
    const timeOfDay = c.digestTimeOfDay ?? '09:00';
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const current = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    if (current !== timeOfDay) continue;
    const dayFormatter = new Intl.DateTimeFormat('en', { timeZone: tz, weekday: 'short' });
    const dayNum = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayFormatter.format(now));
    if (c.digestFrequency === 'weekly' && c.digestDayOfWeek != null && c.digestDayOfWeek !== dayNum) continue;
    const last = c.lastDigestAt;
    if (c.digestFrequency === 'daily' && last) {
      const hoursSince = (now.getTime() - last.getTime()) / (60 * 60 * 1000);
      if (hoursSince < 23) continue;
    }
    if (c.digestFrequency === 'weekly' && last) {
      const daysSince = (now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince < 6) continue;
    }
    due.push(c.project.id);
  }
  return due;
}

export type SchedulerRunResult = {
  alerts: { projectId: string; evaluated: number; triggered: number; error?: string }[];
  digests: { projectId: string; sent: number; failed: number; error?: string }[];
};

/**
 * Run scheduled alert evaluations and digest deliveries. Idempotent; uses locks per project.
 */
export async function runScheduler(rangeForDigest = '7d'): Promise<SchedulerRunResult> {
  const alerts: SchedulerRunResult['alerts'] = [];
  const digests: SchedulerRunResult['digests'] = [];

  const alertProjects = await getProjectsDueForAlerts();
  for (const { projectId, retentionDays, projectName } of alertProjects) {
    const lockKey = ALERT_LOCK_PREFIX + projectId;
    if (!(await acquireLock(lockKey))) continue;
    try {
      const results = await evaluateAlertRules(projectId, { retentionDays, projectName });
      const triggered = results.filter((r) => r.triggered).length;
      await prisma.projectScheduleConfig.updateMany({
        where: { projectId },
        data: { lastAlertEvaluationAt: new Date() },
      });
      alerts.push({ projectId, evaluated: results.length, triggered });
      console.info('[scheduler] Alert evaluation', { projectId, evaluated: results.length, triggered });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[scheduler] Alert evaluation failed', { projectId, error: msg });
      alerts.push({ projectId, evaluated: 0, triggered: 0, error: msg });
    } finally {
      await releaseLock(lockKey);
    }
  }

  const digestProjectIds = await getProjectsDueForDigest(rangeForDigest);
  for (const projectId of digestProjectIds) {
    const lockKey = DIGEST_LOCK_PREFIX + projectId;
    if (!(await acquireLock(lockKey))) continue;
    try {
      const result = await runDigestDelivery(projectId, rangeForDigest);
      if (result.skipped) {
        console.info('[scheduler] Digest skipped', { projectId, reason: result.error });
        continue;
      }
      await prisma.projectScheduleConfig.updateMany({
        where: { projectId },
        data: { lastDigestAt: new Date() },
      });
      digests.push({ projectId, sent: result.sent, failed: result.failed });
      console.info('[scheduler] Digest delivered', { projectId, sent: result.sent, failed: result.failed });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[scheduler] Digest delivery failed', { projectId, error: msg });
      digests.push({ projectId, sent: 0, failed: 0, error: msg });
    } finally {
      await releaseLock(lockKey);
    }
  }

  return { alerts, digests };
}
