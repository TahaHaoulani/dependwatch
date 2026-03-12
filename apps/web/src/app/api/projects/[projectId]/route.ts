import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById, updateProject, deleteProject } from '@/lib/project';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  environment: z.string().max(64).nullable().optional(),
  retentionDaysOverride: z.number().int().min(1).max(365).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    await updateProject(projectId, session.user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await deleteProject(projectId, session.user.id);
    const { writeAuditLog } = await import('@/lib/audit');
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'project.deleted',
      resource: 'Project',
      resourceId: projectId,
      metadata: { name: project.name },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Forbidden' }, { status: 403 });
  }
}
