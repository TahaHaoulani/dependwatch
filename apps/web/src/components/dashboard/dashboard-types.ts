/**
 * Shared types and helpers for dashboard components.
 */

export type ApiKeyInfo = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | string | null;
  createdAt: Date | string;
};

export type ProjectInsight =
  | { type: 'cost_driver'; provider: string; share: number }
  | { type: 'cost_driver_operation'; provider: string; endpoint: string; share: number }
  | { type: 'reliability_issue'; provider: string; endpoint?: string | null; errorRate: number }
  | { type: 'slow_endpoint'; provider: string; endpoint: string; p95Ms: number }
  | { type: 'cost_spike'; percentIncrease: number };

export type GuardrailAlert =
  | { type: 'cost_spike'; provider: string; increase: number }
  | { type: 'error_spike'; provider: string; endpoint?: string | null; errorRate: number }
  | { type: 'latency_spike'; provider: string; endpoint: string; p95Ms: number }
  | { type: 'traffic_anomaly'; provider: string; endpoint: string | null; currentCalls: number; baselineCalls: number };

export function operationLabel(provider: string, endpoint?: string | null): string {
  return endpoint ? `${provider}.${endpoint}` : provider;
}
