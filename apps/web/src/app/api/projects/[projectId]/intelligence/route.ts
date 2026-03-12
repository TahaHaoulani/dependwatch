import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getPlanLimits } from '@/lib/stripe';
import {
  getProjectStatsByProvider,
  getProjectStatsByOperation,
  getInsights,
  getProjectInsights,
  getProjectGuardrails,
  getProjectDependencyMap,
} from '@/lib/analytics';
import { cacheGetOrSet, cacheKey } from '@/lib/cache';
import type { PlanId } from '@/lib/stripe';

const INTELLIGENCE_CACHE_TTL_SEC = 60;

/**
 * Secondary payload: insights, guardrails, dependency map. Cached by projectId + range.
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
  const key = cacheKey(['intelligence', projectId, range]);

  const payload = await cacheGetOrSet(
    key,
    async () => {
      const { getWorkspaceSubscription } = await import('@/lib/subscription');
      const subscription = await getWorkspaceSubscription(project.workspaceId);
      const planId = (subscription.planId ?? 'free') as PlanId;
      const limits = getPlanLimits(planId);
      const retentionDays = limits.retentionDays;

      const [byProvider, byOperation] = await Promise.all([
        getProjectStatsByProvider(projectId, range, retentionDays),
        getProjectStatsByOperation(projectId, range, retentionDays),
      ]);
      const precomputed = { byProvider, byOperation };
      const [insightsRaw, projectInsightsRaw, guardrailsRaw, dependencyMapRaw] = await Promise.all([
        getInsights(projectId, range, retentionDays, byProvider),
        getProjectInsights(projectId, range, retentionDays, precomputed),
        getProjectGuardrails(projectId, range, retentionDays, precomputed),
        limits.dependencyGraph ? getProjectDependencyMap(projectId, range, retentionDays, byProvider) : Promise.resolve(null),
      ]);
      const guardrails =
        planId === 'builder'
          ? guardrailsRaw.filter((g) => g.type !== 'traffic_anomaly')
          : guardrailsRaw;
      return {
        insights: insightsRaw,
        projectInsights: projectInsightsRaw,
        guardrails,
        dependencyMap: limits.dependencyGraph ? dependencyMapRaw : null,
        insightsLimited: planId === 'free',
      };
    },
    { ttlSeconds: INTELLIGENCE_CACHE_TTL_SEC }
  );

  return NextResponse.json(payload);
}
