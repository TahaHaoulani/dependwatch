/**
 * DependWatch-branded Slack alert format for incidents.
 * Use this when sending guardrail/incident alerts to Slack (e.g. from webhook handler).
 */

export type SlackIncidentPayload = {
  provider: string;
  endpoint?: string | null;
  detectionType: 'latency_spike' | 'error_spike' | 'cost_anomaly' | 'traffic_anomaly';
  message: string;
  metrics?: {
    errorRateBefore?: number;
    errorRateAfter?: number;
    p95Ms?: number;
    percentIncrease?: number;
    currentCalls?: number;
    baselineCalls?: number;
  };
  incidentUrl?: string;
};

function providerDisplay(provider: string): string {
  const lower = provider.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Plain text message for Slack (simple post).
 * Example:
 *   🚨 DependWatch alert
 *   Provider: Stripe
 *   Endpoint: paymentIntent.create
 *   Error rate: 0.3% → 3.8%
 *   Link: View incident
 */
export function formatSlackIncidentText(payload: SlackIncidentPayload): string {
  const lines: string[] = ['🚨 *DependWatch alert*', '', `*Provider:* ${providerDisplay(payload.provider)}`];
  if (payload.endpoint) {
    lines.push(`*Endpoint:* ${payload.endpoint}`);
  }
  lines.push(`*Detection:* ${payload.detectionType.replace(/_/g, ' ')}`);
  lines.push('', payload.message);

  const m = payload.metrics;
  if (m) {
    if (m.errorRateBefore != null && m.errorRateAfter != null) {
      lines.push(`*Error rate:* ${(m.errorRateBefore * 100).toFixed(1)}% → ${(m.errorRateAfter * 100).toFixed(1)}%`);
    } else if (m.errorRateAfter != null) {
      lines.push(`*Error rate:* ${(m.errorRateAfter * 100).toFixed(1)}%`);
    }
    if (m.p95Ms != null) {
      lines.push(`*P95 latency:* ${(m.p95Ms / 1000).toFixed(1)}s`);
    }
    if (m.percentIncrease != null) {
      lines.push(`*Change:* +${m.percentIncrease}% vs baseline`);
    }
  }

  if (payload.incidentUrl) {
    lines.push('', `<${payload.incidentUrl}|View incident>`);
  }

  return lines.join('\n');
}

/**
 * Slack Block Kit blocks for a rich incident message.
 * Use with payload: { blocks: formatSlackIncidentBlocks(...) }
 */
export function formatSlackIncidentBlocks(payload: SlackIncidentPayload): unknown[] {
  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🚨 DependWatch alert', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Provider:*\n${providerDisplay(payload.provider)}` },
        ...(payload.endpoint
          ? [{ type: 'mrkdwn' as const, text: `*Endpoint:*\n\`${payload.endpoint}\`` }]
          : []),
      ].filter(Boolean),
    },
    { type: 'section', text: { type: 'mrkdwn', text: payload.message } },
  ];

  const m = payload.metrics;
  if (m && (m.errorRateAfter != null || m.p95Ms != null || m.percentIncrease != null)) {
    const metrics: string[] = [];
    if (m.errorRateBefore != null && m.errorRateAfter != null) {
      metrics.push(`Error rate: ${(m.errorRateBefore * 100).toFixed(1)}% → ${(m.errorRateAfter * 100).toFixed(1)}%`);
    } else if (m.errorRateAfter != null) {
      metrics.push(`Error rate: ${(m.errorRateAfter * 100).toFixed(1)}%`);
    }
    if (m.p95Ms != null) metrics.push(`P95: ${(m.p95Ms / 1000).toFixed(1)}s`);
    if (m.percentIncrease != null) metrics.push(`+${m.percentIncrease}% vs baseline`);
    if (metrics.length > 0) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: metrics.join(' · ') } });
    }
  }

  if (payload.incidentUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View incident', emoji: true },
          url: payload.incidentUrl,
        },
      ],
    });
  }

  return blocks;
}
