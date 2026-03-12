export interface DependWatchConfig {
  ingestKey: string;
  baseUrl?: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  environment?: 'dev' | 'staging' | 'prod' | 'test';
}

export interface ApiCallEvent {
  provider: string;
  service_name?: string;
  endpoint?: string;
  method?: string;
  environment?: 'dev' | 'staging' | 'prod' | 'test';
  duration_ms?: number;
  status_code?: number;
  success?: boolean;
  error_type?: string;
  error_message?: string;
  request_count?: number;
  estimated_cost_usd?: number;
  metadata?: Record<string, unknown>;
  region?: string;
}
