/**
 * Dashboard data layer: project stats, events, timeseries, insights, guardrails.
 * Uses Prisma + ApiCallEvent. PostHog product analytics live in posthog.ts.
 */

import { subHours, subDays, startOfHour, startOfDay, parseISO, isValid } from 'date-fns';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/** Start of day in UTC (matches PostgreSQL date_trunc('day', timestamptz)). */
function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
/** Start of hour in UTC (matches PostgreSQL date_trunc('hour', timestamptz)). */
function startOfHourUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0));
}

export type RangePreset = '24h' | '7d' | '30d';

export type ProjectStats = {
  totalCalls: number;
  errors: number;
  errorRate: number;
  avgLatencyMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  costUsd: number;
};

export type ProviderStats = {
  provider: string;
  calls: number;
  errors: number;
  errorRate: number;
  p50Ms: number | null;
  p95Ms: number | null;
  costUsd: number;
};

export type OperationStats = {
  operation: string;
  provider: string;
  endpoint: string | null;
  calls: number;
  errors: number;
  errorRate: number;
  avgLatencyMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  costUsd: number;
};

export type TimeseriesBucket = {
  time: string;
  calls: number;
  avgLatencyMs: number | null;
  costUsd?: number;
};

export type RecentFailure = {
  id: string;
  timestamp: string;
  provider: string;
  endpoint: string | null;
  errorMessage: string | null;
  statusCode: number | null;
};

export type ErrorSpike = {
  provider: string;
  timestamp: string;
  errorRate: number;
  calls: number;
  errors: number;
};

/** GuardrailAlert — used by intelligence.ts and dashboard. */
export type GuardrailAlert =
  | { type: 'cost_spike'; provider: string; increase: number }
  | { type: 'error_spike'; provider: string; endpoint?: string | null; errorRate: number }
  | { type: 'latency_spike'; provider: string; endpoint: string; p95Ms: number }
  | { type: 'traffic_anomaly'; provider: string; endpoint: string | null; currentCalls: number; baselineCalls: number };

export type ProjectInsight =
  | { type: 'cost_driver'; provider: string; share: number }
  | { type: 'cost_driver_operation'; provider: string; endpoint: string; share: number }
  | { type: 'reliability_issue'; provider: string; endpoint?: string | null; errorRate: number }
  | { type: 'slow_endpoint'; provider: string; endpoint: string; p95Ms: number }
  | { type: 'cost_spike'; percentIncrease: number };

export type GenericInsight = {
  type: string;
  title: string;
  description: string;
  provider?: string;
  value?: string;
};

export type DependencyMap = {
  providers: {
    provider: string;
    calls: number;
    reliabilityScore: number;
    p95Ms: number | null;
    costUsd: number;
  }[];
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function decimalToNum(d: Prisma.Decimal | null | undefined): number {
  if (d == null) return 0;
  return toNum(typeof d === 'object' && 'toNumber' in d ? (d as { toNumber(): number }).toNumber() : d);
}

/**
 * Parse range to start/end Date. Cap by retentionDays so window length does not exceed retention.
 * Supports presets 24h, 7d, 30d and custom range: "custom:YYYY-MM-DD:YYYY-MM-DD".
 */
export function getWindow(
  range: string,
  retentionDays?: number
): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  const customMatch = range.startsWith('custom:') ? range.slice(7).split(':') : null;
  if (customMatch?.length === 2) {
    const fromDate = parseISO(customMatch[0]!);
    const toDate = parseISO(customMatch[1]!);
    if (isValid(fromDate) && isValid(toDate) && fromDate <= toDate) {
      start = startOfDay(fromDate);
      const endDay = startOfDay(toDate);
      const endOfTo = new Date(endDay);
      endOfTo.setHours(23, 59, 59, 999);
      const customEnd = endOfTo > end ? end : endOfTo;
      if (retentionDays != null && retentionDays > 0) {
        const retentionStart = subDays(end, retentionDays);
        if (start < retentionStart) start = retentionStart;
      }
      return { start, end: customEnd };
    }
  }

  switch (range as RangePreset) {
    case '24h':
      start = subHours(end, 24);
      break;
    case '7d':
      start = subDays(end, 7);
      break;
    case '30d':
      start = subDays(end, 30);
      break;
    default:
      start = subDays(end, 7);
  }
  if (retentionDays != null && retentionDays > 0) {
    const retentionStart = subDays(end, retentionDays);
    if (start < retentionStart) start = retentionStart;
  }
  return { start, end };
}

function baseWhere(
  projectId: string,
  range: string,
  retentionDays?: number
): Prisma.ApiCallEventWhereInput {
  const { start, end } = getWindow(range, retentionDays);
  return {
    projectId,
    timestamp: { gte: start, lte: end },
  };
}

/** Where clause excluding demo events (for usage and cost only; dashboard counts include demo). */
function baseWhereExcludeDemo(
  projectId: string,
  range: string,
  retentionDays?: number
): Prisma.ApiCallEventWhereInput {
  return { ...baseWhere(projectId, range, retentionDays), source: { not: 'demo' } };
}

/** Project-level aggregate stats. Dashboard counts include all events; cost excludes demo. */
export async function getProjectStats(
  projectId: string,
  range: string,
  retentionDays?: number
): Promise<ProjectStats> {
  const { start, end } = getWindow(range, retentionDays);
  const where = baseWhere(projectId, range, retentionDays);
  const whereExcludeDemo = baseWhereExcludeDemo(projectId, range, retentionDays);

  const [agg, costAgg, percentiles] = await Promise.all([
    prisma.apiCallEvent.aggregate({
      where,
      _count: true,
      _avg: { durationMs: true },
    }),
    prisma.apiCallEvent.aggregate({
      where: whereExcludeDemo,
      _sum: { estimatedCostUsd: true },
    }),
    prisma.$queryRaw<
      { p50: number | null; p95: number | null; p99: number | null }[]
    >`
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS p50,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS p95,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS p99
      FROM "ApiCallEvent"
      WHERE "projectId" = ${projectId}
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
    `,
  ]);

  const totalCalls = agg._count ?? 0;
  const errorsAgg = await prisma.apiCallEvent.count({
    where: { ...where, success: false },
  });
  const errorRate = totalCalls > 0 ? errorsAgg / totalCalls : 0;
  const row = percentiles?.[0];

  return {
    totalCalls,
    errors: errorsAgg,
    errorRate,
    avgLatencyMs: agg._avg?.durationMs ?? null,
    p50Ms: row?.p50 != null ? Math.round(row.p50) : null,
    p95Ms: row?.p95 != null ? Math.round(row.p95) : null,
    p99Ms: row?.p99 != null ? Math.round(row.p99) : null,
    costUsd: decimalToNum(costAgg._sum?.estimatedCostUsd),
  };
}

/**
 * Stats grouped by provider. Dashboard counts include all events; cost excludes demo.
 */
export async function getProjectStatsByProvider(
  projectId: string,
  range: string,
  retentionDays?: number
): Promise<ProviderStats[]> {
  const { start, end } = getWindow(range, retentionDays);
  const where = baseWhere(projectId, range, retentionDays);
  const whereExcludeDemo = baseWhereExcludeDemo(projectId, range, retentionDays);

  const [groups, costByProvider, errorsByProvider, percentilesByProvider] = await Promise.all([
    prisma.apiCallEvent.groupBy({
      by: ['provider'],
      where,
      _count: true,
      _avg: { durationMs: true },
    }),
    prisma.apiCallEvent.groupBy({
      by: ['provider'],
      where: whereExcludeDemo,
      _sum: { estimatedCostUsd: true },
    }),
    prisma.apiCallEvent.groupBy({
      by: ['provider'],
      where: { ...where, success: false },
      _count: true,
    }),
    prisma.$queryRaw<
      { provider: string; p50: number | null; p95: number | null }[]
    >`
      SELECT "provider",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS p50,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS p95
      FROM "ApiCallEvent"
      WHERE "projectId" = ${projectId}
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY "provider"
    `,
  ]);

  const errorCountMap = new Map(errorsByProvider.map((g) => [g.provider, g._count]));
  const percentileMap = new Map(percentilesByProvider.map((r) => [r.provider, { p50: r.p50, p95: r.p95 }]));
  const costMap = new Map(costByProvider.map((g) => [g.provider, decimalToNum(g._sum?.estimatedCostUsd)]));

  const result: ProviderStats[] = groups.map((g) => {
    const calls = g._count;
    const errors = errorCountMap.get(g.provider) ?? 0;
    const errorRate = calls > 0 ? errors / calls : 0;
    const row = percentileMap.get(g.provider);
    return {
      provider: g.provider,
      calls,
      errors,
      errorRate,
      p50Ms: row?.p50 != null ? Math.round(row.p50) : null,
      p95Ms: row?.p95 != null ? Math.round(row.p95) : null,
      costUsd: costMap.get(g.provider) ?? 0,
    };
  });
  return result.sort((a, b) => b.calls - a.calls);
}

/**
 * Stats grouped by operation (provider + endpoint). Dashboard counts include all events; cost excludes demo.
 */
export async function getProjectStatsByOperation(
  projectId: string,
  range: string,
  retentionDays?: number
): Promise<OperationStats[]> {
  const { start, end } = getWindow(range, retentionDays);
  const where = baseWhere(projectId, range, retentionDays);
  const whereExcludeDemo = baseWhereExcludeDemo(projectId, range, retentionDays);

  const [groups, costByOp, errorsByOp, percentilesByOp] = await Promise.all([
    prisma.apiCallEvent.groupBy({
      by: ['provider', 'endpoint'],
      where,
      _count: true,
      _avg: { durationMs: true },
    }),
    prisma.apiCallEvent.groupBy({
      by: ['provider', 'endpoint'],
      where: whereExcludeDemo,
      _sum: { estimatedCostUsd: true },
    }),
    prisma.apiCallEvent.groupBy({
      by: ['provider', 'endpoint'],
      where: { ...where, success: false },
      _count: true,
    }),
    prisma.$queryRaw<
      { provider: string; endpoint: string | null; p50: number | null; p95: number | null; p99: number | null }[]
    >`
      SELECT "provider", "endpoint",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS p50,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS p95,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY "durationMs") FILTER (WHERE "durationMs" IS NOT NULL) AS p99
      FROM "ApiCallEvent"
      WHERE "projectId" = ${projectId}
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
      GROUP BY "provider", "endpoint"
    `,
  ]);

  const errorKey = (p: string, e: string | null) => `${p}\0${e ?? ''}`;
  const errorMap = new Map(errorsByOp.map((g) => [errorKey(g.provider, g.endpoint), g._count]));
  const percentileMap = new Map(
    percentilesByOp.map((r) => [errorKey(r.provider, r.endpoint), { p50: r.p50, p95: r.p95, p99: r.p99 }])
  );
  const costMap = new Map(costByOp.map((g) => [errorKey(g.provider, g.endpoint), decimalToNum(g._sum?.estimatedCostUsd)]));

  const result: OperationStats[] = groups.map((g) => {
    const calls = g._count;
    const errors = errorMap.get(errorKey(g.provider, g.endpoint)) ?? 0;
    const errorRate = calls > 0 ? errors / calls : 0;
    const row = percentileMap.get(errorKey(g.provider, g.endpoint));
    const operation = g.endpoint ? `${g.provider}.${g.endpoint}` : g.provider;
    return {
      operation,
      provider: g.provider,
      endpoint: g.endpoint,
      calls,
      errors,
      errorRate,
      avgLatencyMs: g._avg?.durationMs ?? null,
      p50Ms: row?.p50 != null ? Math.round(row.p50) : null,
      p95Ms: row?.p95 != null ? Math.round(row.p95) : null,
      p99Ms: row?.p99 != null ? Math.round(row.p99) : null,
      costUsd: costMap.get(errorKey(g.provider, g.endpoint)) ?? 0,
    };
  });
  return result.sort((a, b) => b.calls - a.calls);
}

/**
 * Timeseries buckets (calls, avgLatencyMs per bucket). Uses DB aggregation only; no full-event scan.
 */
export async function getProjectTimeseries(
  projectId: string,
  range: string,
  granularity: 'hour' | 'day',
  retentionDays?: number
): Promise<TimeseriesBucket[]> {
  const { start, end } = getWindow(range, retentionDays);
  const trunc = granularity === 'hour' ? 'hour' : 'day';

  // Force UTC truncation so bucket keys match our UTC iteration (session TZ can vary). Cost excludes demo.
  const rows = await prisma.$queryRaw<
    { bucket: Date; calls: bigint; sum_ms: number | string | null; cost_usd: Prisma.Decimal | null }[]
  >(Prisma.sql`
    SELECT bucket, count(*)::bigint AS calls, sum("durationMs") AS sum_ms,
      sum("estimatedCostUsd") FILTER (WHERE "source" IS DISTINCT FROM 'demo') AS cost_usd
    FROM (
      SELECT (date_trunc(${trunc}, "timestamp" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS bucket, "durationMs", "estimatedCostUsd", "source"
      FROM "ApiCallEvent"
      WHERE "projectId" = ${projectId}
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
    ) sub
    GROUP BY bucket
    ORDER BY bucket ASC
  `);

  const bucketMap = new Map<string, { calls: number; sumMs: number; costUsd: number }>();
  const normalizeKey = (d: Date) =>
    (granularity === 'hour' ? startOfHourUTC(d) : startOfDayUTC(d)).toISOString();
  for (const r of rows) {
    const key = normalizeKey(new Date(r.bucket));
    const calls = Number(r.calls);
    const sumMs = toNum(r.sum_ms);
    const costUsd = decimalToNum(r.cost_usd);
    bucketMap.set(key, { calls, sumMs, costUsd });
  }

  const bucketStart = granularity === 'hour' ? startOfHourUTC : startOfDayUTC;
  const iter = bucketStart(start);
  const stepMs = granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const buckets: TimeseriesBucket[] = [];
  for (let t = iter.getTime(); t <= end.getTime(); ) {
    const d = new Date(t);
    const key = d.toISOString();
    const cur = bucketMap.get(key) ?? { calls: 0, sumMs: 0, costUsd: 0 };
    buckets.push({
      time: key,
      calls: cur.calls,
      avgLatencyMs: cur.calls > 0 && cur.sumMs > 0 ? Math.round(cur.sumMs / cur.calls) : null,
      costUsd: cur.costUsd,
    });
    t += stepMs;
  }
  return buckets.sort((a, b) => a.time.localeCompare(b.time));
}

/** Per-provider timeseries (bucket + provider). For provider overlay on charts. */
export type TimeseriesBucketByProvider = {
  time: string;
  provider: string;
  calls: number;
  avgLatencyMs: number | null;
  costUsd: number;
};

export async function getProjectTimeseriesByProvider(
  projectId: string,
  range: string,
  granularity: 'hour' | 'day',
  retentionDays?: number
): Promise<TimeseriesBucketByProvider[]> {
  const { start, end } = getWindow(range, retentionDays);
  const trunc = granularity === 'hour' ? 'hour' : 'day';

  const rows = await prisma.$queryRaw<
    { bucket: Date; provider: string; calls: bigint; sum_ms: number | string | null; cost_usd: Prisma.Decimal | null }[]
  >(Prisma.sql`
    SELECT bucket, "provider", count(*)::bigint AS calls, sum("durationMs") AS sum_ms,
      sum("estimatedCostUsd") FILTER (WHERE "source" IS DISTINCT FROM 'demo') AS cost_usd
    FROM (
      SELECT (date_trunc(${trunc}, "timestamp" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS bucket, "provider", "durationMs", "estimatedCostUsd", "source"
      FROM "ApiCallEvent"
      WHERE "projectId" = ${projectId}
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
    ) sub
    GROUP BY bucket, "provider"
    ORDER BY bucket ASC, "provider"
  `);

  const bucketStart = granularity === 'hour' ? startOfHourUTC : startOfDayUTC;
  const normalizeKey = (d: Date) => bucketStart(d).toISOString();

  return rows.map((r) => {
    const calls = Number(r.calls);
    const sumMs = toNum(r.sum_ms);
    return {
      time: normalizeKey(new Date(r.bucket)),
      provider: r.provider,
      calls,
      avgLatencyMs: calls > 0 && sumMs > 0 ? Math.round(sumMs / calls) : null,
      costUsd: decimalToNum(r.cost_usd),
    };
  });
}

/** Recent failed events. Optionally returns whether any are from test/demo events (ui_test). */
export async function getRecentFailures(
  projectId: string,
  limit: number
): Promise<RecentFailure[]>;
export async function getRecentFailures(
  projectId: string,
  limit: number,
  opts: { includeTestSourceFlag: true }
): Promise<{ failures: RecentFailure[]; fromTestEvents: boolean }>;
export async function getRecentFailures(
  projectId: string,
  limit: number,
  opts?: { includeTestSourceFlag?: true }
): Promise<RecentFailure[] | { failures: RecentFailure[]; fromTestEvents: boolean }> {
  const rows = await prisma.apiCallEvent.findMany({
    where: { projectId, success: false },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: { id: true, timestamp: true, provider: true, endpoint: true, errorMessage: true, statusCode: true, metadata: true, source: true },
  });
  const failures: RecentFailure[] = rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    provider: r.provider,
    endpoint: r.endpoint,
    errorMessage: r.errorMessage,
    statusCode: r.statusCode,
  }));
  if (opts?.includeTestSourceFlag) {
    const fromTestEvents = rows.some((r) => r.source === 'demo' || (r.metadata as { _source?: string } | null)?._source === 'ui_test');
    return { failures, fromTestEvents };
  }
  return failures;
}

/** Projected monthly cost from range average daily cost. */
export async function getProjectProjectedMonthlyCost(
  projectId: string,
  range: string,
  retentionDays?: number
): Promise<number> {
  const stats = await getProjectStats(projectId, range, retentionDays);
  if (stats.totalCalls === 0) return 0;
  const { start, end } = getWindow(range, retentionDays);
  const days = Math.max(1, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const dailyCost = stats.costUsd / days;
  return Math.round(dailyCost * 30 * 100) / 100;
}

/**
 * Error spikes: periods where a provider had high error rate. Uses DB aggregation; no full-event scan.
 */
export async function getErrorSpikes(
  projectId: string,
  range: string,
  limit: number,
  retentionDays?: number
): Promise<ErrorSpike[]> {
  const { start, end } = getWindow(range, retentionDays);
  const trunc = range === '30d' ? 'day' : 'hour';

  const rows = await prisma.$queryRaw<
    { bucket: Date; provider: string; calls: bigint; errors: bigint }[]
  >(Prisma.sql`
    SELECT bucket, "provider", count(*)::bigint AS calls, count(*) FILTER (WHERE "success" = false)::bigint AS errors
    FROM (
      SELECT date_trunc(${trunc}, "timestamp") AS bucket, "provider", "success"
      FROM "ApiCallEvent"
      WHERE "projectId" = ${projectId}
        AND "timestamp" >= ${start}
        AND "timestamp" <= ${end}
    ) sub
    GROUP BY bucket, "provider"
  `);

  const ERROR_RATE_THRESHOLD = 0.1;
  const MIN_CALLS = 5;
  const spikes: ErrorSpike[] = [];
  for (const r of rows) {
    const calls = Number(r.calls);
    const errors = Number(r.errors);
    if (calls < MIN_CALLS) continue;
    const errorRate = errors / calls;
    if (errorRate >= ERROR_RATE_THRESHOLD) {
      spikes.push({
        provider: r.provider,
        timestamp: new Date(r.bucket).toISOString(),
        errorRate,
        calls,
        errors,
      });
    }
  }
  spikes.sort((a, b) => b.errorRate - a.errorRate);
  return spikes.slice(0, limit);
}

/** Minimum calls for insights/guardrails; lowered for small datasets (e.g. test events). */
function minCallsForInsight(totalCalls: number, defaultMin: number): number {
  return totalCalls < 25 ? Math.max(2, Math.min(defaultMin, totalCalls)) : defaultMin;
}

/**
 * Generic insights (title/description). Accepts optional precomputed byProvider to avoid redundant fetch.
 * Uses lower thresholds when totalCalls < 25 so test/small datasets still produce insights.
 */
export async function getInsights(
  projectId: string,
  range: string,
  retentionDays?: number,
  byProvider?: ProviderStats[]
): Promise<GenericInsight[]> {
  const data = byProvider ?? (await getProjectStatsByProvider(projectId, range, retentionDays));
  const totalCalls = data.reduce((s, p) => s + p.calls, 0);
  const minCalls = minCallsForInsight(totalCalls, 10);
  const out: GenericInsight[] = [];
  const totalCost = data.reduce((s, x) => s + x.costUsd, 0);
  for (const p of data) {
    if (p.calls >= minCalls && p.errorRate >= 0.05) {
      out.push({
        type: 'reliability_issue',
        title: 'Elevated error rate',
        description: `${p.provider} has ${(p.errorRate * 100).toFixed(1)}% error rate in this period.`,
        provider: p.provider,
        value: `${(p.errorRate * 100).toFixed(1)}%`,
      });
    }
    if (p.costUsd > 0 && totalCost > 0) {
      const share = p.costUsd / totalCost;
      if (share >= 0.5) {
        out.push({
          type: 'cost_driver',
          title: 'Cost driver',
          description: `${p.provider} represents ${Math.round(share * 100)}% of projected spend.`,
          provider: p.provider,
          value: `${Math.round(share * 100)}%`,
        });
      }
    }
  }
  return out;
}

/**
 * Project insights (structured). Accepts optional precomputed byProvider and byOperation.
 * Uses lower thresholds when totalCalls < 25 so test/small datasets produce actionable insights.
 */
export async function getProjectInsights(
  projectId: string,
  range: string,
  retentionDays?: number,
  precomputed?: { byProvider: ProviderStats[]; byOperation: OperationStats[] }
): Promise<ProjectInsight[]> {
  const [byProvider, byOperation] = precomputed
    ? [precomputed.byProvider, precomputed.byOperation]
    : await Promise.all([
        getProjectStatsByProvider(projectId, range, retentionDays),
        getProjectStatsByOperation(projectId, range, retentionDays),
      ]);
  const totalCalls = byProvider.reduce((s, p) => s + p.calls, 0);
  const totalCost = byProvider.reduce((s, p) => s + p.costUsd, 0);
  const minCallsProvider = minCallsForInsight(totalCalls, 10);
  const minCallsOp = minCallsForInsight(totalCalls, 5);
  const costShareProvider = totalCalls < 25 ? 0.15 : 0.2;
  const costShareOp = totalCalls < 25 ? 0.1 : 0.15;
  const out: ProjectInsight[] = [];

  for (const p of byProvider) {
    if (totalCost > 0 && p.costUsd > 0) {
      const share = p.costUsd / totalCost;
      if (share >= costShareProvider) out.push({ type: 'cost_driver', provider: p.provider, share });
    }
    if (p.calls >= minCallsProvider && p.errorRate >= 0.05) {
      out.push({ type: 'reliability_issue', provider: p.provider, endpoint: null, errorRate: p.errorRate });
    }
  }
  for (const op of byOperation) {
    if (op.calls >= minCallsOp && op.p95Ms != null && op.p95Ms >= 2000 && op.endpoint) {
      out.push({ type: 'slow_endpoint', provider: op.provider, endpoint: op.endpoint, p95Ms: op.p95Ms });
    }
    if (totalCost > 0 && op.costUsd > 0 && op.endpoint) {
      const share = op.costUsd / totalCost;
      if (share >= costShareOp) out.push({ type: 'cost_driver_operation', provider: op.provider, endpoint: op.endpoint, share });
    }
    if (op.calls >= minCallsOp && op.errorRate >= 0.05) {
      out.push({ type: 'reliability_issue', provider: op.provider, endpoint: op.endpoint, errorRate: op.errorRate });
    }
  }
  return out;
}

/**
 * Guardrail alerts. Accepts optional precomputed byProvider and byOperation.
 * Uses lower thresholds for small datasets so test events surface meaningful signals.
 */
export async function getProjectGuardrails(
  projectId: string,
  range: string,
  retentionDays?: number,
  precomputed?: { byProvider: ProviderStats[]; byOperation: OperationStats[] }
): Promise<GuardrailAlert[]> {
  const byProvider = precomputed?.byProvider ?? (await getProjectStatsByProvider(projectId, range, retentionDays));
  const byOperation = precomputed?.byOperation ?? (await getProjectStatsByOperation(projectId, range, retentionDays));
  const totalCalls = byProvider.reduce((s, p) => s + p.calls, 0);
  const minCallsProvider = minCallsForInsight(totalCalls, 10);
  const minCallsOp = minCallsForInsight(totalCalls, 5);
  const out: GuardrailAlert[] = [];
  for (const p of byProvider) {
    if (p.calls >= minCallsProvider && p.errorRate >= 0.1) {
      out.push({ type: 'error_spike', provider: p.provider, endpoint: null, errorRate: p.errorRate });
    }
  }
  for (const op of byOperation) {
    if (op.calls >= minCallsOp && op.p95Ms != null && op.p95Ms >= 4000 && op.endpoint) {
      out.push({ type: 'latency_spike', provider: op.provider, endpoint: op.endpoint, p95Ms: op.p95Ms });
    }
  }
  return out;
}

/** Single most important issue for "What needs attention" / "Top issue" section. */
export type TopIssue =
  | { kind: 'reliability'; provider: string; endpoint?: string | null; errorRate: number; message: string }
  | { kind: 'latency'; provider: string; endpoint: string; p95Ms: number; message: string }
  | { kind: 'cost'; provider: string; share: number; message: string }
  | null;

/**
 * Derives the single highest-priority issue from current data for dashboard "What needs attention".
 * Priority: reliability (error spike) > latency (slow endpoint) > cost driver.
 */
export function getTopIssue(
  byProvider: ProviderStats[],
  byOperation: OperationStats[],
  projectInsights: ProjectInsight[],
  guardrails: GuardrailAlert[]
): TopIssue {
  const totalCost = byProvider.reduce((s, p) => s + p.costUsd, 0);
  const formatOp = (p: string, e?: string | null) => (e ? `${p}.${e}` : p);

  // 1. Worst reliability (operation-level first, then provider)
  const reliabilityOps = byOperation.filter((o) => o.calls >= 2 && o.errorRate >= 0.2);
  const worstRelOp = reliabilityOps.sort((a, b) => b.errorRate - a.errorRate)[0];
  if (worstRelOp) {
    return {
      kind: 'reliability',
      provider: worstRelOp.provider,
      endpoint: worstRelOp.endpoint,
      errorRate: worstRelOp.errorRate,
      message: `${formatOp(worstRelOp.provider, worstRelOp.endpoint)} has ${(worstRelOp.errorRate * 100).toFixed(0)}% failure rate in this period`,
    };
  }
  const reliabilityProviders = byProvider.filter((p) => p.calls >= 2 && p.errorRate >= 0.1);
  const worstRelProvider = reliabilityProviders.sort((a, b) => b.errorRate - a.errorRate)[0];
  if (worstRelProvider) {
    return {
      kind: 'reliability',
      provider: worstRelProvider.provider,
      endpoint: null,
      errorRate: worstRelProvider.errorRate,
      message: `${worstRelProvider.provider} has ${(worstRelProvider.errorRate * 100).toFixed(0)}% error rate`,
    };
  }

  // 2. Slowest endpoint (P95)
  const slowOps = byOperation.filter((o) => o.p95Ms != null && o.calls >= 2);
  const slowest = slowOps.sort((a, b) => (b.p95Ms ?? 0) - (a.p95Ms ?? 0))[0];
  if (slowest?.p95Ms != null && slowest.p95Ms >= 2000) {
    return {
      kind: 'latency',
      provider: slowest.provider,
      endpoint: slowest.endpoint ?? '',
      p95Ms: slowest.p95Ms,
      message: `${formatOp(slowest.provider, slowest.endpoint)} is slow — P95 ${(slowest.p95Ms / 1000).toFixed(1)}s`,
    };
  }

  // 3. Top cost driver
  if (totalCost > 0) {
    const byCost = [...byProvider].filter((p) => p.costUsd > 0).sort((a, b) => b.costUsd - a.costUsd);
    const top = byCost[0];
    if (top && top.costUsd / totalCost >= 0.5) {
      return {
        kind: 'cost',
        provider: top.provider,
        share: top.costUsd / totalCost,
        message: `${top.provider} accounts for ${Math.round((top.costUsd / totalCost) * 100)}% of your monitored API spend`,
      };
    }
  }

  return null;
}

/**
 * Dependency map: providers with calls, reliability, p95, cost. Accepts optional precomputed byProvider.
 */
export async function getProjectDependencyMap(
  projectId: string,
  range: string,
  retentionDays?: number,
  byProvider?: ProviderStats[]
): Promise<DependencyMap | null> {
  const data = byProvider ?? (await getProjectStatsByProvider(projectId, range, retentionDays));
  if (data.length === 0) return null;
  return {
    providers: data.map((p) => ({
      provider: p.provider,
      calls: p.calls,
      reliabilityScore: 1 - p.errorRate,
      p95Ms: p.p95Ms,
      costUsd: p.costUsd,
    })),
  };
}

/** Recent events for event stream. Includes source so UI can show "Demo" badge. */
export async function getRecentEvents(
  projectId: string,
  limit: number
): Promise<{ id: string; timestamp: string; provider: string; endpoint: string | null; durationMs: number | null; success: boolean; statusCode: number | null; source: string }[]> {
  const rows = await prisma.apiCallEvent.findMany({
    where: { projectId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: { id: true, timestamp: true, provider: true, endpoint: true, durationMs: true, success: true, statusCode: true, source: true },
  });
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    provider: r.provider,
    endpoint: r.endpoint,
    durationMs: r.durationMs,
    success: r.success,
    statusCode: r.statusCode,
    source: r.source ?? 'sdk',
  }));
}

/** Single event by id. */
export async function getEventById(
  projectId: string,
  eventId: string
): Promise<Record<string, unknown> | null> {
  const e = await prisma.apiCallEvent.findFirst({
    where: { id: eventId, projectId },
  });
  if (!e) return null;
  return {
    id: e.id,
    projectId: e.projectId,
    timestamp: e.timestamp.toISOString(),
    provider: e.provider,
    serviceName: e.serviceName,
    endpoint: e.endpoint,
    method: e.method,
    environment: e.environment,
    durationMs: e.durationMs,
    statusCode: e.statusCode,
    success: e.success,
    errorType: e.errorType,
    errorMessage: e.errorMessage,
    requestCount: e.requestCount,
    estimatedCostUsd: e.estimatedCostUsd != null ? decimalToNum(e.estimatedCostUsd) : null,
    metadata: e.metadata as Record<string, unknown> | null,
    region: e.region,
  };
}

/** Operation-level timeseries (provider + optional endpoint). */
export async function getOperationTimeseries(
  projectId: string,
  provider: string,
  endpoint: string | null,
  range: string
): Promise<TimeseriesBucket[]> {
  const { start, end } = getWindow(range);
  const where: Prisma.ApiCallEventWhereInput = {
    projectId,
    provider,
    timestamp: { gte: start, lte: end },
  };
  if (endpoint != null && endpoint !== '') where.endpoint = endpoint;
  else where.endpoint = null;

  const events = await prisma.apiCallEvent.findMany({
    where,
    select: { timestamp: true, durationMs: true, estimatedCostUsd: true },
  });

  const bucketStart = range === '30d' ? startOfDay : startOfHour;
  const bucketMap = new Map<string, { calls: number; sumMs: number; costUsd: number }>();
  for (const e of events) {
    const key = bucketStart(e.timestamp).toISOString();
    const cur = bucketMap.get(key) ?? { calls: 0, sumMs: 0, costUsd: 0 };
    cur.calls += 1;
    if (e.durationMs != null) cur.sumMs += e.durationMs;
    cur.costUsd += decimalToNum(e.estimatedCostUsd);
    bucketMap.set(key, cur);
  }

  const buckets: TimeseriesBucket[] = [];
  const iter = bucketStart(start);
  const step = range === '30d' ? (d: Date) => new Date(d.getTime() + 24 * 60 * 60 * 1000) : (d: Date) => new Date(d.getTime() + 60 * 60 * 1000);
  for (let t = iter.getTime(); t <= end.getTime(); ) {
    const d = new Date(t);
    const key = d.toISOString();
    const cur = bucketMap.get(key) ?? { calls: 0, sumMs: 0, costUsd: 0 };
    buckets.push({
      time: key,
      calls: cur.calls,
      avgLatencyMs: cur.calls > 0 && cur.sumMs > 0 ? Math.round(cur.sumMs / cur.calls) : null,
      costUsd: cur.costUsd,
    });
    t = step(d).getTime();
  }
  return buckets.sort((a, b) => a.time.localeCompare(b.time));
}

/** Recent failures for a single operation. */
export async function getOperationRecentFailures(
  projectId: string,
  provider: string,
  endpoint: string | null,
  limit: number
): Promise<RecentFailure[]> {
  const where: Prisma.ApiCallEventWhereInput = { projectId, provider, success: false };
  if (endpoint != null && endpoint !== '') where.endpoint = endpoint;
  else where.endpoint = null;

  const rows = await prisma.apiCallEvent.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: { id: true, timestamp: true, provider: true, endpoint: true, errorMessage: true, statusCode: true },
  });
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    provider: r.provider,
    endpoint: r.endpoint,
    errorMessage: r.errorMessage,
    statusCode: r.statusCode,
  }));
}

/** Top operations by P95 latency (slowest first). */
export async function getTopSlowOperations(
  projectId: string,
  range: string,
  limit = 10,
  retentionDays?: number
): Promise<OperationStats[]> {
  const ops = await getProjectStatsByOperation(projectId, range, retentionDays);
  return ops
    .filter((o) => o.p95Ms != null)
    .sort((a, b) => (b.p95Ms ?? 0) - (a.p95Ms ?? 0))
    .slice(0, limit);
}

/** Top operations by cost. */
export async function getTopCostlyOperations(
  projectId: string,
  range: string,
  limit = 10,
  retentionDays?: number
): Promise<OperationStats[]> {
  const ops = await getProjectStatsByOperation(projectId, range, retentionDays);
  return ops
    .filter((o) => o.costUsd > 0)
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, limit);
}

/** Top operations by error rate (failing first). */
export async function getTopFailingOperations(
  projectId: string,
  range: string,
  limit = 10,
  retentionDays?: number
): Promise<OperationStats[]> {
  const ops = await getProjectStatsByOperation(projectId, range, retentionDays);
  return ops
    .filter((o) => o.calls >= 3)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, limit);
}
