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
  getTopIssue,
} from '@/lib/analytics';
import { getProjectUsage } from '@/lib/usage';
import { cacheGetOrSet, cacheKey } from '@/lib/cache';
import type { PlanId } from '@/lib/stripe';

const OVERVIEW_CACHE_TTL_SEC = 60;

/**
 * Lightweight overview for fast first paint: KPIs, usage, charts, tables, top issue.
 * Cached by projectId + range (Redis or in-memory fallback). Invalidated on ingest/test-events.
 */
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

  const range = new URL(req.url).searchParams.get('range') ?? '7d';
  const key = cacheKey(['overview', projectId, range]);

  const payload = await cacheGetOrSet(
    key,
    async () => {
      const { getWorkspaceSubscription } = await import('@/lib/subscription');
      const subscription = await getWorkspaceSubscription(project.workspaceId);
      const planId = (subscription.planId ?? 'free') as PlanId;
      const limits = getPlanLimits(planId);
      const retentionDays = limits.retentionDays;
      const granularity = range === '24h' ? 'hour' : 'day';
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

      const [stats, byProvider, byOperation, recentFailuresResult, projectedMonthly, errorSpikes, timeseries, timeseriesByProvider, usage, liveEventsLast5Min] = await Promise.all([
        getProjectStats(projectId, range, retentionDays),
        getProjectStatsByProvider(projectId, range, retentionDays),
        getProjectStatsByOperation(projectId, range, retentionDays),
        getRecentFailures(projectId, 15, { includeTestSourceFlag: true }),
        getProjectProjectedMonthlyCost(projectId, range, retentionDays),
        getErrorSpikes(projectId, range, 10, retentionDays),
        getProjectTimeseries(projectId, range, granularity, retentionDays),
        getProjectTimeseriesByProvider(projectId, range, granularity, retentionDays),
        getProjectUsage(projectId, session.user.id, range),
        prisma.apiCallEvent.count({ where: { projectId, source: 'sdk', timestamp: { gte: fiveMinAgo } } }),
      ]);
      const recentFailures = recentFailuresResult.failures;
      const recentFailuresFromTestEvents = recentFailuresResult.fromTestEvents;
      const topIssue = getTopIssue(byProvider, byOperation, [], []);

      return {
        stats: { ...stats, projectedMonthlyCostUsd: projectedMonthly },
        byProvider,
        byOperation,
        timeseries,
        timeseriesByProvider,
        recentFailures,
        recentFailuresFromTestEvents,
        errorSpikes,
        topIssue,
        usage: usage ?? undefined,
        planLimits: {
          dependencyGraph: limits.dependencyGraph,
          operationAnalytics: limits.operationAnalytics,
          apiIntelligence: limits.apiIntelligence,
          retentionDays: limits.retentionDays,
          maxProviders: limits.maxProviders,
          eventsPerMonth: limits.eventsPerMonth,
        },
        liveEventsLast5Min: liveEventsLast5Min ?? 0,
      };
    },
    { ttlSeconds: OVERVIEW_CACHE_TTL_SEC }
  );

  return NextResponse.json(payload);
}
