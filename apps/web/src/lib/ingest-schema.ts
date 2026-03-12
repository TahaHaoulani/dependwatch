import { z } from 'zod';

/** Normalized event shape for ingest. Extensible via metadata (e.g. model, provider_request_id). */
export const apiCallEventSchema = z.object({
  timestamp: z.union([z.string().datetime(), z.number()]).optional(),
  provider: z.string().min(1).max(64),
  service_name: z.string().max(128).optional(),
  endpoint: z.string().max(256).optional(),
  method: z.string().max(16).optional(),
  environment: z.enum(['dev', 'staging', 'prod', 'test']).optional(),
  duration_ms: z.number().min(0).optional(),
  status_code: z.number().int().min(0).max(999).optional(),
  success: z.boolean().optional(),
  error_type: z.string().max(64).optional(),
  error_message: z.string().max(512).optional(),
  request_count: z.number().int().min(1).max(10000).optional(),
  estimated_cost_usd: z.number().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
  region: z.string().max(32).optional(),
  /** Optional: e.g. gpt-4, gpt-3.5-turbo. Stored in metadata if present. */
  model: z.string().max(128).optional(),
  /** Optional: provider request id for correlation. Stored in metadata if present. */
  provider_request_id: z.string().max(256).optional(),
});

export const batchSchema = z.object({
  events: z.array(apiCallEventSchema).min(1).max(100),
});

/** Source of ingestion for attribution. Passed to ingestEventsForProject. */
export type IngestionSource = 'sdk' | 'ui_test' | 'mcp';
