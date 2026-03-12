/**
 * Digest generation: daily/weekly summary content for projects.
 * Used by preview API and (when scheduler exists) by scheduled jobs.
 * Delivery: email/Slack hooks are called from job or API; this module only produces content.
 */

import {
  getProjectStats,
  getProjectStatsByProvider,
  getProjectStatsByOperation,
  getRecentFailures,
  getProjectInsights,
  getProjectGuardrails,
} from './analytics';

export type DigestContent = {
  period: string;
  projectName?: string;
  totalCalls: number;
  errorRate: number;
  topCostDriver: { provider: string; share: number } | null;
  highestErrorProvider: { provider: string; errorRate: number } | null;
  slowestOperation: { provider: string; endpoint: string; p95Ms: number } | null;
  recentFailures: { provider: string; endpoint: string | null; errorMessage: string | null }[];
  insightsSummary: string[];
  guardrailsSummary: string[];
};

export async function generateDigestContent(
  projectId: string,
  range: string,
  retentionDays?: number,
  projectName?: string
): Promise<DigestContent> {
  const [stats, byProvider, byOperation, recentFailures, insights, guardrails] = await Promise.all([
    getProjectStats(projectId, range, retentionDays),
    getProjectStatsByProvider(projectId, range, retentionDays),
    getProjectStatsByOperation(projectId, range, retentionDays),
    getRecentFailures(projectId, 5),
    getProjectInsights(projectId, range, retentionDays),
    getProjectGuardrails(projectId, range, retentionDays),
  ]);

  const totalCost = byProvider.reduce((s, p) => s + p.costUsd, 0);
  const topCostDriver =
    totalCost > 0
      ? byProvider
          .filter((p) => p.costUsd > 0)
          .sort((a, b) => b.costUsd - a.costUsd)[0]
      : null;
  const topCost =
    topCostDriver && totalCost > 0
      ? { provider: topCostDriver.provider, share: topCostDriver.costUsd / totalCost }
      : null;

  const highestError =
    byProvider.filter((p) => p.calls >= 2).sort((a, b) => b.errorRate - a.errorRate)[0] ?? null;

  const slowestOp = byOperation
    .filter((o) => o.p95Ms != null && o.calls >= 2)
    .sort((a, b) => (b.p95Ms ?? 0) - (a.p95Ms ?? 0))[0];

  const insightsSummary = insights.slice(0, 5).map((i) => {
    if (i.type === 'cost_driver') return `${i.provider}: ${Math.round(i.share * 100)}% of spend`;
    if (i.type === 'reliability_issue') return `${i.provider} error rate ${(i.errorRate * 100).toFixed(1)}%`;
    if (i.type === 'slow_endpoint') return `${i.provider}.${i.endpoint} P95 ${(i.p95Ms / 1000).toFixed(1)}s`;
    return '';
  }).filter(Boolean);

  const guardrailsSummary = guardrails.slice(0, 5).map((g) => {
    if (g.type === 'error_spike') return `${g.provider} error spike ${(g.errorRate * 100).toFixed(1)}%`;
    if (g.type === 'latency_spike') return `${g.provider}.${g.endpoint} latency ${(g.p95Ms / 1000).toFixed(1)}s`;
    if (g.type === 'cost_spike') return `${g.provider} cost spike`;
    return `${g.provider} alert`;
  });

  return {
    period: range === '24h' ? 'Last 24 hours' : range === '7d' ? 'Last 7 days' : 'Last 30 days',
    projectName,
    totalCalls: stats.totalCalls,
    errorRate: stats.errorRate,
    topCostDriver: topCost,
    highestErrorProvider: highestError ? { provider: highestError.provider, errorRate: highestError.errorRate } : null,
    slowestOperation:
      slowestOp?.endpoint && slowestOp.p95Ms != null
        ? { provider: slowestOp.provider, endpoint: slowestOp.endpoint, p95Ms: slowestOp.p95Ms }
        : null,
    recentFailures: recentFailures.map((f) => ({
      provider: f.provider,
      endpoint: f.endpoint,
      errorMessage: f.errorMessage,
    })),
    insightsSummary,
    guardrailsSummary,
  };
}

/** Plain-text digest for email or Slack. */
export function formatDigestAsText(d: DigestContent): string {
  const lines: string[] = [
    `DependWatch digest — ${d.period}`,
    d.projectName ? `Project: ${d.projectName}` : '',
    '',
    `Total API calls: ${d.totalCalls.toLocaleString()}`,
    `Error rate: ${(d.errorRate * 100).toFixed(2)}%`,
    '',
  ].filter(Boolean);

  if (d.topCostDriver) {
    lines.push(`Top cost driver: ${d.topCostDriver.provider} (${Math.round(d.topCostDriver.share * 100)}% of spend)`);
  }
  if (d.highestErrorProvider) {
    lines.push(`Highest error rate: ${d.highestErrorProvider.provider} (${(d.highestErrorProvider.errorRate * 100).toFixed(1)}%)`);
  }
  if (d.slowestOperation) {
    lines.push(`Slowest operation: ${d.slowestOperation.provider}.${d.slowestOperation.endpoint} (P95 ${(d.slowestOperation.p95Ms / 1000).toFixed(1)}s)`);
  }

  if (d.insightsSummary.length > 0) {
    lines.push('', 'Insights:', ...d.insightsSummary.map((s) => `• ${s}`));
  }
  if (d.guardrailsSummary.length > 0) {
    lines.push('', 'Guardrail alerts:', ...d.guardrailsSummary.map((s) => `• ${s}`));
  }
  if (d.recentFailures.length > 0) {
    lines.push('', 'Recent failures:', ...d.recentFailures.slice(0, 3).map((f) => `• ${f.provider}${f.endpoint ? `.${f.endpoint}` : ''}: ${f.errorMessage ?? '—'}`));
  }

  return lines.join('\n');
}
