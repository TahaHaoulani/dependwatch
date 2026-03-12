import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import {
  getProjectStatsByOperation,
  getOperationTimeseries,
  getOperationRecentFailures,
} from '@/lib/analytics';

/** GET /api/projects/:projectId/operations/detail?provider=x&endpoint=y&range=7d */
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
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider') ?? '';
  const endpointParam = searchParams.get('endpoint');
  const endpoint = endpointParam === '' || endpointParam === null ? null : (endpointParam ?? null);
  const range = searchParams.get('range') ?? '7d';

  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }

  const [byOperation, timeseries, recentFailures] = await Promise.all([
    getProjectStatsByOperation(projectId, range),
    getOperationTimeseries(projectId, provider, endpoint, range),
    getOperationRecentFailures(projectId, provider, endpoint, 15),
  ]);

  const stats = byOperation.find((r) => {
    if (r.provider !== provider) return false;
    if (endpoint == null || endpoint === '') return r.endpoint == null || r.endpoint === '';
    return r.endpoint === endpoint;
  });
  if (!stats) {
    return NextResponse.json({
      operation: endpoint ? `${provider}.${endpoint}` : provider,
      provider,
      endpoint,
      stats: null,
      timeseries,
      recentFailures,
      latencyDistribution: null,
    });
  }

  return NextResponse.json({
    operation: stats.operation,
    provider: stats.provider,
    endpoint: stats.endpoint,
    stats: {
      calls: stats.calls,
      errors: stats.errors,
      errorRate: stats.errorRate,
      avgLatencyMs: stats.avgLatencyMs,
      p50Ms: stats.p50Ms,
      p95Ms: stats.p95Ms,
      p99Ms: stats.p99Ms,
      costUsd: stats.costUsd,
    },
    timeseries,
    recentFailures,
    latencyDistribution: {
      p50Ms: stats.p50Ms,
      p95Ms: stats.p95Ms,
      p99Ms: stats.p99Ms,
    },
  });
}
