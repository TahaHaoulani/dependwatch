/**
 * Shared event ingestion service. Single path for persisting API call events
 * to ApiCallEvent. Used by: ingest API route, UI "Send test event" route, MCP send_test_event.
 */

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiCallEventSchema, type IngestionSource } from '@/lib/ingest-schema';

export type RawIngestEvent = z.infer<typeof apiCallEventSchema>;

/** Persisted event source: 'sdk' (ingest API / app) or 'demo' (Send test events). Demo is excluded from usage/cost. */
export type EventSource = 'sdk' | 'demo';

type DbEventRow = {
  projectId: string;
  timestamp: Date;
  provider: string;
  serviceName: string | null;
  endpoint: string | null;
  method: string | null;
  environment: string | null;
  durationMs: number | null;
  statusCode: number | null;
  success: boolean;
  errorType: string | null;
  errorMessage: string | null;
  requestCount: number;
  estimatedCostUsd: number | null;
  metadata: object | undefined;
  region: string | null;
  source: EventSource;
};

function mergeMetadata(
  e: RawIngestEvent,
  source?: IngestionSource
): object | undefined {
  const base = (e.metadata ?? undefined) as Record<string, unknown> | undefined;
  const extras: Record<string, unknown> = {};
  if (e.model != null) extras.model = String(e.model).slice(0, 128);
  if (e.provider_request_id != null) extras.provider_request_id = String(e.provider_request_id).slice(0, 256);
  if (source != null) extras._source = source;
  if (Object.keys(extras).length === 0 && !base) return undefined;
  return { ...base, ...extras } as object;
}

/** Maps ingestion source to persisted source: ui_test -> demo, sdk/mcp -> sdk. */
function toEventSource(ingestionSource?: IngestionSource): EventSource {
  return ingestionSource === 'ui_test' ? 'demo' : 'sdk';
}

/**
 * Normalizes a single raw (API-shaped) event into a DB row for ApiCallEvent.
 * Uses defaultTimestamp when e.timestamp is missing (e.g. for test events that set it per event).
 * @param source - Ingestion source: 'ui_test' -> stored as 'demo', 'sdk'|'mcp' -> stored as 'sdk'.
 */
export function normalizeToDbEvent(
  projectId: string,
  e: RawIngestEvent,
  defaultTimestamp: Date = new Date(),
  source?: IngestionSource
): DbEventRow {
  const eventSource = toEventSource(source);
  const ts =
    e.timestamp == null
      ? defaultTimestamp
      : typeof e.timestamp === 'number'
        ? new Date(e.timestamp)
        : new Date(e.timestamp as string);
  const endpoint = e.endpoint != null ? String(e.endpoint).slice(0, 256) : null;
  const method = e.method != null ? String(e.method).slice(0, 16) : null;
  const errorType = e.error_type != null ? String(e.error_type).slice(0, 64) : null;
  const errorMessage = e.error_message != null ? String(e.error_message).slice(0, 512) : null;
  const serviceName = e.service_name != null ? String(e.service_name) : null;
  const environment = e.environment != null ? String(e.environment) : null;
  const durationMs = e.duration_ms != null ? Math.round(Number(e.duration_ms)) : null;
  const statusCode = e.status_code != null ? Number(e.status_code) : null;
  const region = e.region != null ? String(e.region) : null;
  const estimatedCostUsd = e.estimated_cost_usd != null ? Number(e.estimated_cost_usd) : null;
  const requestCount =
    e.request_count != null ? Math.max(1, Math.min(10000, Math.round(Number(e.request_count)))) : 1;
  const success = Boolean(e.success ?? (statusCode != null && statusCode < 400));

  return {
    projectId,
    timestamp: ts,
    provider: String(e.provider).toLowerCase(),
    serviceName,
    endpoint,
    method,
    environment,
    durationMs,
    statusCode,
    success,
    errorType,
    errorMessage,
    requestCount,
    estimatedCostUsd,
    metadata: mergeMetadata(e, source),
    region,
    source: eventSource,
  };
}

/**
 * Persists a batch of raw events for a project. Single source of truth for event writes.
 * Used by ingest API, UI test-events route, and MCP send_test_event.
 * @param source - Optional attribution: 'sdk' | 'ui_test' | 'mcp'. Stored in event metadata.
 * @param allowedProviders - When set (e.g. Free plan), only events for these providers are stored; rest are skipped.
 */
export async function ingestEventsForProject(
  projectId: string,
  events: RawIngestEvent[],
  options?: { defaultTimestamp?: Date; source?: IngestionSource; allowedProviders?: Set<string> | null }
): Promise<{ count: number; skipped?: number }> {
  if (events.length === 0) return { count: 0 };
  const defaultTs = options?.defaultTimestamp ?? new Date();
  const source = options?.source;
  const allowed = options?.allowedProviders ?? null;
  const data = events.map((e) => normalizeToDbEvent(projectId, e, defaultTs, source));
  const toWrite =
    allowed != null ? data.filter((row) => allowed.has(row.provider.toLowerCase())) : data;
  const skipped = data.length - toWrite.length;
  if (toWrite.length > 0) {
    await prisma.apiCallEvent.createMany({ data: toWrite });
    const { invalidateProjectDashboardCache } = await import('@/lib/cache/invalidate');
    invalidateProjectDashboardCache(projectId).catch(() => {});
  }
  return { count: toWrite.length, skipped: skipped > 0 ? skipped : undefined };
}

const SAMPLE_COUNT = 10;

/**
 * Free plan: 2 providers only (OpenAI, Stripe). Demonstrates latency, cost, failures, provider table, operations.
 * Used when maxProviders <= 2.
 */
function getFreePlanSampleEvents(baseTime: Date): RawIngestEvent[] {
  const c = SAMPLE_COUNT;
  return [
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      duration_ms: 2100,
      success: true,
      estimated_cost_usd: 0.002,
      timestamp: new Date(baseTime.getTime() - (c - 1) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      duration_ms: 1800,
      success: true,
      estimated_cost_usd: 0.0018,
      timestamp: new Date(baseTime.getTime() - (c - 2) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      duration_ms: 1900,
      success: true,
      estimated_cost_usd: 0.002,
      timestamp: new Date(baseTime.getTime() - (c - 3) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'openai',
      endpoint: 'embeddings',
      duration_ms: 420,
      success: true,
      estimated_cost_usd: 0.0001,
      timestamp: new Date(baseTime.getTime() - (c - 4) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      duration_ms: 5300,
      success: false,
      status_code: 503,
      error_type: 'TimeoutError',
      error_message: 'Request timed out',
      timestamp: new Date(baseTime.getTime() - (c - 5) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'stripe',
      endpoint: 'customers.create',
      duration_ms: 450,
      success: true,
      timestamp: new Date(baseTime.getTime() - (c - 6) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'stripe',
      endpoint: 'payment_intents.create',
      duration_ms: 380,
      success: true,
      timestamp: new Date(baseTime.getTime() - (c - 7) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'stripe',
      endpoint: 'payment_intents.create',
      duration_ms: 520,
      success: true,
      timestamp: new Date(baseTime.getTime() - (c - 8) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'stripe',
      endpoint: 'customers.create',
      duration_ms: 610,
      success: false,
      status_code: 422,
      error_type: 'ValidationError',
      timestamp: new Date(baseTime.getTime() - (c - 9) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'stripe',
      endpoint: 'payment_intents.create',
      duration_ms: 290,
      success: true,
      timestamp: new Date(baseTime.getTime() - (c - 10) * 60_000).toISOString(),
      environment: 'dev',
    },
  ];
}

/**
 * Pro/Scale: 4 providers (OpenAI, Stripe, Twilio, Resend). Richer demo.
 */
function getFullPlanSampleEvents(baseTime: Date): RawIngestEvent[] {
  const c = SAMPLE_COUNT;
  return [
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      duration_ms: 2100,
      success: true,
      estimated_cost_usd: 0.002,
      timestamp: new Date(baseTime.getTime() - (c - 1) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      duration_ms: 1800,
      success: true,
      estimated_cost_usd: 0.0018,
      timestamp: new Date(baseTime.getTime() - (c - 2) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      duration_ms: 1900,
      success: true,
      estimated_cost_usd: 0.002,
      timestamp: new Date(baseTime.getTime() - (c - 3) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'openai',
      endpoint: 'embeddings',
      duration_ms: 420,
      success: true,
      estimated_cost_usd: 0.0001,
      timestamp: new Date(baseTime.getTime() - (c - 4) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      duration_ms: 5300,
      success: false,
      status_code: 503,
      error_type: 'TimeoutError',
      error_message: 'Request timed out',
      timestamp: new Date(baseTime.getTime() - (c - 5) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'stripe',
      endpoint: 'customers.create',
      duration_ms: 450,
      success: true,
      timestamp: new Date(baseTime.getTime() - (c - 6) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'stripe',
      endpoint: 'payment_intents.create',
      duration_ms: 380,
      success: true,
      timestamp: new Date(baseTime.getTime() - (c - 7) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'twilio',
      endpoint: 'messages.create',
      duration_ms: 980,
      success: true,
      estimated_cost_usd: 0.0079,
      timestamp: new Date(baseTime.getTime() - (c - 8) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'twilio',
      endpoint: 'messages.create',
      duration_ms: 720,
      success: false,
      status_code: 429,
      error_type: 'RateLimitError',
      timestamp: new Date(baseTime.getTime() - (c - 9) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'resend',
      endpoint: 'emails.send',
      duration_ms: 310,
      success: true,
      estimated_cost_usd: 0.00025,
      timestamp: new Date(baseTime.getTime() - (c - 10) * 60_000).toISOString(),
      environment: 'dev',
    },
    {
      provider: 'clerk',
      endpoint: 'users.getUser',
      duration_ms: 85,
      success: true,
      timestamp: new Date(baseTime.getTime() - (c - 11) * 60_000).toISOString(),
      environment: 'dev',
    },
  ];
}

/**
 * Returns a fixed set of sample events in API (raw) shape for demo/test.
 * Timestamps are spread over the last N minutes from baseTime.
 * Respects plan limits: Free (maxProviders <= 2) gets OpenAI + Stripe only; Pro/Scale get 4 providers.
 * Single implementation used by both UI test-events route and MCP send_test_event.
 * @param baseTime - Base time for event timestamps
 * @param options.maxProviders - Plan limit (-1 = unlimited). If <= 2, returns 2-provider (OpenAI, Stripe) set.
 */
export function getSampleTestEvents(
  baseTime: Date,
  options?: { maxProviders: number }
): RawIngestEvent[] {
  const maxProviders = options?.maxProviders ?? -1;
  if (maxProviders <= 2) return getFreePlanSampleEvents(baseTime);
  return getFullPlanSampleEvents(baseTime);
}
