import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { updateIncident, getIncidentById } from '@/lib/api-incident';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  note: z.string().optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; incidentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { incidentId } = await params;
  const incident = await getIncidentById(incidentId, session.user.id);
  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(incident);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; incidentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { incidentId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const incident = await updateIncident(incidentId, session.user.id, parsed.data);
    return NextResponse.json(incident);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg === 'Not found' ? 404 : 400 });
  }
}
