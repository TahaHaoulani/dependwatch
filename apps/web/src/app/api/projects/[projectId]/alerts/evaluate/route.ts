import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { ensureCanEditProject } from '@/lib/workspace';
import { evaluateAlertRules } from '@/lib/alert-evaluate';
import { getPlanLimits } from '@/lib/stripe';
import { prisma } from '@/lib/db';

/**
 * POST /api/projects/:projectId/alerts/evaluate
 * Runs alert rules against current project metrics and sends to Slack when thresholds are exceeded.
 * Call manually from UI or from a cron/scheduler. Requires edit access.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await ensureCanEditProject(project.workspaceId, session.user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { getWorkspaceSubscription } = await import('@/lib/subscription');
  const subscription = await getWorkspaceSubscription(project.workspaceId);
  const planId = subscription.planId ?? 'free';
  const limits = getPlanLimits(planId);

  const results = await evaluateAlertRules(projectId, {
    retentionDays: limits.retentionDays,
    projectName: project.name,
  });

  const triggered = results.filter((r) => r.triggered);
  return NextResponse.json({
    ok: true,
    evaluated: results.length,
    triggered: triggered.length,
    results: results.map((r) => ({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      triggered: r.triggered,
      inCooldown: r.inCooldown ?? false,
      reason: r.reason,
      slackSent: r.slackSent,
      slackFailed: r.slackFailed,
    })),
    note: 'Scheduled evaluation (e.g. every 5–15 min) can be added via cron or external scheduler. This endpoint runs evaluation on demand.',
  });
}
