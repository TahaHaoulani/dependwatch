/**
 * Alert evaluation: run project alert rules against current metrics and send to Slack.
 * Call from POST /api/projects/:projectId/alerts/evaluate (manual or cron).
 */

import { prisma } from '@/lib/db';
import { getProjectStats } from '@/lib/analytics';
import { formatSlackIncidentBlocks } from '@/lib/slack-alert-format';
import type { AlertRule } from '@prisma/client';

const EVALUATION_WINDOW_LATENCY_ERROR = '24h';
const EVALUATION_WINDOW_BUDGET = '30d';

export type TriggerReason =
  | { type: 'latency'; p95Ms: number; thresholdMs: number }
  | { type: 'error_rate'; errorRatePercent: number; thresholdPercent: number }
  | { type: 'budget'; costUsd: number; thresholdUsd: number };

export type EvaluationResult = {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  reason?: TriggerReason;
  slackSent: number;
  slackFailed: number;
  inCooldown?: boolean;
};

function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === 'number' && !Number.isNaN(d)) return d;
  if (typeof d === 'object' && d !== null && 'toNumber' in d) return (d as { toNumber(): number }).toNumber();
  const n = Number(d);
  return Number.isNaN(n) ? 0 : n;
}

/** Last time this rule sent an alert (any channel). Used for cooldown. */
async function getLastTriggeredAt(ruleId: string): Promise<Date | null> {
  const last = await prisma.alertEvent.findFirst({
    where: { ruleId },
    orderBy: { sentAt: 'desc' },
    select: { sentAt: true },
  });
  return last?.sentAt ?? null;
}

function isInCooldown(lastSent: Date | null, cooldownMinutes: number): boolean {
  if (cooldownMinutes <= 0 || !lastSent) return false;
  const cutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  return lastSent > cutoff;
}

/** Send alert payload to all enabled Slack webhooks for the project. Returns { sent, failed }. */
async function sendAlertToSlack(
  projectId: string,
  rule: AlertRule,
  reason: TriggerReason,
  projectName?: string
): Promise<{ sent: number; failed: number }> {
  const webhooks = await prisma.slackWebhookConfig.findMany({
    where: { projectId, enabled: true },
  });
  if (webhooks.length === 0) return { sent: 0, failed: 0 };

  let message: string;
  let detectionType: 'latency_spike' | 'error_spike' | 'cost_anomaly';
  const metrics: { p95Ms?: number; errorRateAfter?: number; percentIncrease?: number } = {};

  if (reason.type === 'latency') {
    message = `P95 latency is ${(reason.p95Ms / 1000).toFixed(1)}s (threshold: ${(reason.thresholdMs / 1000).toFixed(1)}s). ${projectName ? `Project: ${projectName}.` : ''}`;
    detectionType = 'latency_spike';
    metrics.p95Ms = reason.p95Ms;
  } else if (reason.type === 'error_rate') {
    message = `Error rate is ${reason.errorRatePercent.toFixed(1)}% (threshold: ${reason.thresholdPercent}%). ${projectName ? `Project: ${projectName}.` : ''}`;
    detectionType = 'error_spike';
    metrics.errorRateAfter = reason.errorRatePercent / 100;
  } else {
    message = `API cost is $${reason.costUsd.toFixed(2)} (monthly budget: $${reason.thresholdUsd}). ${projectName ? `Project: ${projectName}.` : ''}`;
    detectionType = 'cost_anomaly';
    metrics.percentIncrease = reason.thresholdUsd > 0 ? (reason.costUsd / reason.thresholdUsd) * 100 : 0;
  }

  const payload = {
    blocks: formatSlackIncidentBlocks({
      provider: 'project',
      endpoint: rule.name,
      detectionType,
      message: `Alert: ${rule.name}. ${message}`,
      metrics,
    }),
  };

  let sent = 0;
  let failed = 0;
  for (const w of webhooks) {
    try {
      const res = await fetch(w.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

/**
 * Evaluate all enabled alert rules for a project against current metrics.
 * Sends to Slack for triggered rules and records AlertEvent.
 * Caller must have verified project access.
 */
export async function evaluateAlertRules(
  projectId: string,
  options?: { retentionDays?: number; projectName?: string }
): Promise<EvaluationResult[]> {
  const retentionDays = options?.retentionDays;
  const projectName = options?.projectName;

  const [rules, stats24h, stats30d] = await Promise.all([
    prisma.alertRule.findMany({
      where: { projectId, enabled: true },
      orderBy: { createdAt: 'asc' },
    }),
    getProjectStats(projectId, EVALUATION_WINDOW_LATENCY_ERROR, retentionDays),
    getProjectStats(projectId, EVALUATION_WINDOW_BUDGET, retentionDays),
  ]);

  const results: EvaluationResult[] = [];

  for (const rule of rules) {
    const lastTriggered = await getLastTriggeredAt(rule.id);
    const cooldownMin = rule.cooldownMinutes ?? 60;
    if (isInCooldown(lastTriggered, cooldownMin)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        triggered: false,
        slackSent: 0,
        slackFailed: 0,
        inCooldown: true,
      });
      continue;
    }

    let reason: TriggerReason | undefined;

    if (rule.latencyThresholdMs != null && rule.latencyThresholdMs > 0 && stats24h.p95Ms != null) {
      if (stats24h.p95Ms >= rule.latencyThresholdMs) {
        reason = {
          type: 'latency',
          p95Ms: stats24h.p95Ms,
          thresholdMs: rule.latencyThresholdMs,
        };
      }
    }

    if (!reason && rule.errorRateThresholdPercent != null) {
      const thresholdPercent = toNum(rule.errorRateThresholdPercent);
      if (thresholdPercent > 0) {
        const currentPercent = stats24h.errorRate * 100;
        if (currentPercent >= thresholdPercent) {
          reason = {
            type: 'error_rate',
            errorRatePercent: currentPercent,
            thresholdPercent,
          };
        }
      }
    }

    if (!reason && rule.monthlyBudgetUsd != null) {
      const budgetUsd = toNum(rule.monthlyBudgetUsd);
      if (budgetUsd > 0 && stats30d.costUsd >= budgetUsd) {
        reason = {
          type: 'budget',
          costUsd: stats30d.costUsd,
          thresholdUsd: budgetUsd,
        };
      }
    }

    if (!reason) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        triggered: false,
        slackSent: 0,
        slackFailed: 0,
      });
      continue;
    }

    const { sent, failed } = await sendAlertToSlack(projectId, rule, reason, projectName);

    const alertType = reason.type === 'latency' ? 'latency' : reason.type === 'error_rate' ? 'error_rate' : 'budget';
    await prisma.alertEvent.create({
      data: {
        projectId,
        ruleId: rule.id,
        type: alertType,
        severity: 'warning',
        message: `Alert "${rule.name}" triggered: ${reason.type}`,
        payload: reason as unknown as object,
        channel: 'slack',
      },
    });

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: true,
      reason,
      slackSent: sent,
      slackFailed: failed,
    });
  }

  return results;
}
