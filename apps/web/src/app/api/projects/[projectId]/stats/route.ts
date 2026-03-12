import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getPlanLimits } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import {
  getProjectStats,
  getProjectStatsByProvider,
  getProjectStatsByOperation,
  getProjectTimeseries,
  getProjectTimeseriesByProvider,
  getRecentFailures,
  getProjectProjectedMonthlyCost,
  getErrorSpikes,
  getInsights,
  getProjectInsights,
  getProjectGuardrails,
  getProjectDependencyMap,
  getTopIssue,
} from '@/lib/analytics';
import type { PlanId } from '@/lib/stripe';

async function getStatsPayload(
  projectId: string,
  range: string,
  retentionDays: number,
  planId: PlanId,
  dependencyGraph: boolean
) {
  const [stats, byProvider, byOperation, recentFailures, projectedMonthly, errorSpikes] = await Promise.all([
    getProjectStats(projectId, range, retentionDays),
    getProjectStatsByProvider(projectId, range, retentionDays),
    getProjectStatsByOperation(projectId, range, retentionDays),
    getRecentFailures(projectId, 15),
    getProjectProjectedMonthlyCost(projectId, range, retentionDays),
    getErrorSpikes(projectId, range, 10, retentionDays),
  ]);

  // Use hour granularity for 24h so small datasets (e.g. test events) show shape in charts
  const granularity = range === '24h' ? 'hour' : 'day';
  const [timeseries, timeseriesByProvider] = await Promise.all([
    getProjectTimeseries(projectId, range, granularity, retentionDays),
    getProjectTimeseriesByProvider(projectId, range, granularity, retentionDays),
  ]);

  const precomputed = { byProvider, byOperation };
  const [insightsRaw, projectInsightsRaw, guardrailsRaw, dependencyMapRaw] = await Promise.all([
    getInsights(projectId, range, retentionDays, byProvider),
    getProjectInsights(projectId, range, retentionDays, precomputed),
    getProjectGuardrails(projectId, range, retentionDays, precomputed),
    dependencyGraph ? getProjectDependencyMap(projectId, range, retentionDays, byProvider) : Promise.resolve(null),
  ]);

  // Free: show real insights and guardrails so post-test dashboard feels intelligent (activation).
  // Pro/Scale: full set; builder excludes traffic_anomaly.
  const insights = insightsRaw;
  const projectInsights = projectInsightsRaw;
  const guardrails =
    planId === 'builder'
      ? guardrailsRaw.filter((g) => g.type !== 'traffic_anomaly')
      : guardrailsRaw;
  const dependencyMap = dependencyGraph ? dependencyMapRaw : null;

  const topIssue = getTopIssue(byProvider, byOperation, projectInsightsRaw, guardrailsRaw);

  return {
    stats: { ...stats, projectedMonthlyCostUsd: projectedMonthly },
    byProvider,
    byOperation,
    timeseries,
    timeseriesByProvider,
    recentFailures,
    errorSpikes,
    insights,
    projectInsights,
    guardrails,
    dependencyMap,
    topIssue,
    insightsLimited: planId === 'free',
  };
}

export async function GET(
  req: Request,
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

  const { getWorkspaceSubscription } = await import('@/lib/subscription');
  const subscription = await getWorkspaceSubscription(project.workspaceId);
  const planId = (subscription.planId ?? 'free') as PlanId;
  const limits = getPlanLimits(planId);
  const retentionDays = limits.retentionDays;

  const range = new URL(req.url).searchParams.get('range') ?? '7d';

  const payload = await getStatsPayload(
    projectId,
    range,
    retentionDays,
    planId,
    limits.dependencyGraph ?? false
  );

  return NextResponse.json({
    ...payload,
    planLimits: {
      dependencyGraph: limits.dependencyGraph,
      operationAnalytics: limits.operationAnalytics,
      apiIntelligence: limits.apiIntelligence,
      retentionDays: limits.retentionDays,
    },
  });
}
