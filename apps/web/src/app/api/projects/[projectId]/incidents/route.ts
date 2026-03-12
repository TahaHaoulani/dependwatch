import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { listIncidents, createIncidentFromGuardrail } from '@/lib/api-incident';
import type { GuardrailAlert } from '@/lib/analytics';
import { z } from 'zod';

const guardrailSchema: z.ZodType<GuardrailAlert> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cost_spike'), provider: z.string(), increase: z.number() }),
  z.object({ type: z.literal('error_spike'), provider: z.string(), endpoint: z.string().nullable().optional(), errorRate: z.number() }),
  z.object({ type: z.literal('latency_spike'), provider: z.string(), endpoint: z.string(), p95Ms: z.number() }),
  z.object({
    type: z.literal('traffic_anomaly'),
    provider: z.string(),
    endpoint: z.string().nullable(),
    currentCalls: z.number(),
    baselineCalls: z.number(),
  }),
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const status = new URL(req.url).searchParams.get('status') as 'open' | 'acknowledged' | 'resolved' | null;
  const incidents = await listIncidents(projectId, session.user.id, status ? { status } : undefined);
  if (incidents === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ incidents });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ guardrail: guardrailSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const incident = await createIncidentFromGuardrail(projectId, session.user.id, parsed.data.guardrail);
    return NextResponse.json(incident);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg === 'Not found' ? 404 : 400 });
  }
}
