import { z } from 'zod';

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
  metadata: z.record(z.unknown()).max(10).optional(),
  region: z.string().max(32).optional(),
});

export type ApiCallEventPayload = z.infer<typeof apiCallEventSchema>;

export const batchSchema = z.object({
  events: z.array(apiCallEventSchema).min(1).max(100),
});

export type BatchPayload = z.infer<typeof batchSchema>;
