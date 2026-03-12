import { randomBytes } from 'crypto';
import { prisma } from './db';

const PUBLIC_ID_LENGTH = 12;

export function generatePublicId(): string {
  return randomBytes(PUBLIC_ID_LENGTH).toString('base64url').slice(0, PUBLIC_ID_LENGTH);
}

export type DetectionType = 'latency_spike' | 'error_spike' | 'cost_anomaly' | 'traffic_anomaly';

export type GuardrailPayload =
  | { type: 'cost_spike'; provider: string; increase: number }
  | { type: 'error_spike'; provider: string; endpoint?: string | null; errorRate: number }
  | { type: 'latency_spike'; provider: string; endpoint: string; p95Ms: number }
  | { type: 'traffic_anomaly'; provider: string; endpoint: string | null; currentCalls: number; baselineCalls: number };

function detectionTypeFromGuardrail(g: GuardrailPayload): DetectionType {
  if (g.type === 'cost_spike') return 'cost_anomaly';
  if (g.type === 'error_spike') return 'error_spike';
  if (g.type === 'latency_spike') return 'latency_spike';
  return 'traffic_anomaly';
}

function messageFromGuardrail(g: GuardrailPayload): string {
  switch (g.type) {
    case 'cost_spike':
      return `${g.provider} cost spike: +${Math.round((g.increase - 1) * 100)}% vs baseline`;
    case 'error_spike':
      return `${g.provider}${g.endpoint ? `.${g.endpoint}` : ''} error rate ${(g.errorRate * 100).toFixed(2)}%`;
    case 'latency_spike':
      return `${g.provider}.${g.endpoint} P95 latency ${(g.p95Ms / 1000).toFixed(1)}s`;
    case 'traffic_anomaly':
      return `${g.provider}${g.endpoint ? `.${g.endpoint}` : ''} traffic ${(g.currentCalls / g.baselineCalls).toFixed(1)}× baseline`;
    default:
      return 'Incident detected';
  }
}

function metricsFromGuardrail(g: GuardrailPayload): Record<string, unknown> {
  switch (g.type) {
    case 'cost_spike':
      return { increase: g.increase, percentIncrease: Math.round((g.increase - 1) * 100) };
    case 'error_spike':
      return { errorRate: g.errorRate, errorRatePercent: (g.errorRate * 100).toFixed(2) };
    case 'latency_spike':
      return { p95Ms: g.p95Ms, p95Seconds: (g.p95Ms / 1000).toFixed(1) };
    case 'traffic_anomaly':
      return { currentCalls: g.currentCalls, baselineCalls: g.baselineCalls, multiplier: (g.currentCalls / g.baselineCalls).toFixed(1) };
    default:
      return {};
  }
}

export async function createIncidentReport(
  projectId: string,
  guardrail: GuardrailPayload
): Promise<{ publicId: string; url: string }> {
  let publicId = generatePublicId();
  let exists = await prisma.incidentReport.findUnique({ where: { publicId } });
  while (exists) {
    publicId = generatePublicId();
    exists = await prisma.incidentReport.findUnique({ where: { publicId } });
  }

  const endpoint =
    'endpoint' in guardrail && guardrail.endpoint != null ? guardrail.endpoint : null;

  await prisma.incidentReport.create({
    data: {
      publicId,
      projectId,
      provider: guardrail.provider,
      endpoint,
      detectionType: detectionTypeFromGuardrail(guardrail),
      message: messageFromGuardrail(guardrail),
      metrics: metricsFromGuardrail(guardrail) as object,
      timeline: [],
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  const url = `${baseUrl}/incidents/${publicId}`;
  return { publicId, url };
}

export async function getIncidentByPublicId(publicId: string) {
  return prisma.incidentReport.findUnique({
    where: { publicId },
    include: { project: { select: { name: true } } },
  });
}
