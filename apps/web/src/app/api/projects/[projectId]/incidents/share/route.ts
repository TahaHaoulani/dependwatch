import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { createIncidentReport, type GuardrailPayload } from '@/lib/incident-report';
import { z } from 'zod';

const bodySchema = z.object({
  guardrail: z.union([
    z.object({
      type: z.literal('cost_spike'),
      provider: z.string(),
      increase: z.number(),
    }),
    z.object({
      type: z.literal('error_spike'),
      provider: z.string(),
      endpoint: z.string().nullable().optional(),
      errorRate: z.number(),
    }),
    z.object({
      type: z.literal('latency_spike'),
      provider: z.string(),
      endpoint: z.string(),
      p95Ms: z.number(),
    }),
    z.object({
      type: z.literal('traffic_anomaly'),
      provider: z.string(),
      endpoint: z.string().nullable(),
      currentCalls: z.number(),
      baselineCalls: z.number(),
    }),
  ]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid guardrail payload' }, { status: 400 });
  }

  try {
    const { publicId, url } = await createIncidentReport(projectId, parsed.data.guardrail as GuardrailPayload);
    return NextResponse.json({ publicId, url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create incident report' }, { status: 500 });
  }
}
