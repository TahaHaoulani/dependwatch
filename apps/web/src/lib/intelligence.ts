/**
 * API Intelligence layer: structured insights and anomaly detection from event data.
 * Surfaces cost drivers, slow operations, failing operations, reliability issues,
 * cost anomalies, and traffic anomalies without requiring manual dashboards.
 *
 * Part of the External API Control Plane: Observability → Intelligence → Control.
 */

import {
  getProjectStatsByProvider,
  getProjectStatsByOperation,
  getProjectGuardrails,
  getProjectInsights,
  getWindow,
} from './analytics';
import type { GuardrailAlert } from './analytics';

export type CostDriver = { provider: string; share: number; costUsd: number };
export type ReliabilityIssue = { provider: string; endpoint?: string | null; errorRate: number };
export type CostAnomaly = { provider: string; increase: number };
export type TrafficAnomaly = { provider: string; endpoint: string | null; currentCalls: number; baselineCalls: number; multiplier: number };

/** Top cost drivers by provider (share of total spend). */
export async function getTopCostDrivers(
  projectId: string,
  range: string,
  limit = 10,
  retentionDays?: number
): Promise<CostDriver[]> {
  const byProvider = await getProjectStatsByProvider(projectId, range, retentionDays);
  const totalCost = byProvider.reduce((s, p) => s + p.costUsd, 0);
  if (totalCost <= 0) return [];
  return byProvider
    .filter((p) => p.costUsd > 0)
    .map((p) => ({ provider: p.provider, share: p.costUsd / totalCost, costUsd: p.costUsd }))
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, limit);
}

/** Re-export: top operations by P95 latency (slowest first). */
export { getTopSlowOperations } from './analytics';

/** Re-export: top operations by cost. */
export { getTopCostlyOperations } from './analytics';

/** Re-export: top operations by error rate (failing first). */
export { getTopFailingOperations } from './analytics';

/** Reliability issues: providers/endpoints with error rate above threshold. */
export async function getReliabilityIssues(
  projectId: string,
  range: string,
  retentionDays?: number
): Promise<ReliabilityIssue[]> {
  const insights = await getProjectInsights(projectId, range, retentionDays);
  return insights
    .filter((i): i is Extract<typeof i, { type: 'reliability_issue' }> => i.type === 'reliability_issue')
    .map((i) => ({ provider: i.provider, endpoint: i.endpoint, errorRate: i.errorRate }));
}

/** Cost anomalies from guardrails (cost spike detection). */
export async function getCostAnomalies(
  projectId: string,
  range: string,
  retentionDays?: number
): Promise<CostAnomaly[]> {
  const guardrails = await getProjectGuardrails(projectId, range, retentionDays);
  return guardrails
    .filter((g): g is Extract<GuardrailAlert, { type: 'cost_spike' }> => g.type === 'cost_spike')
    .map((g) => ({ provider: g.provider, increase: g.increase }));
}

/** Traffic anomalies from guardrails (volume spike detection). */
export async function getTrafficAnomalies(
  projectId: string,
  range: string,
  retentionDays?: number
): Promise<TrafficAnomaly[]> {
  const guardrails = await getProjectGuardrails(projectId, range, retentionDays);
  return guardrails
    .filter((g): g is Extract<GuardrailAlert, { type: 'traffic_anomaly' }> => g.type === 'traffic_anomaly')
    .map((g) => ({
      provider: g.provider,
      endpoint: g.endpoint,
      currentCalls: g.currentCalls,
      baselineCalls: g.baselineCalls,
      multiplier: g.currentCalls / g.baselineCalls,
    }));
}
