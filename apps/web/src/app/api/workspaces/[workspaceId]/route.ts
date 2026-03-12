import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById, updateWorkspace, deleteWorkspace, ensureWorkspaceOwner } from '@/lib/workspace';
import { z } from 'zod';

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  slackWebhookUrl: z.string().url().refine((u) => u.startsWith('https://hooks.slack.com/'), 'Must be a Slack webhook URL').nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await params;
  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(workspace);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    await updateWorkspace(workspaceId, session.user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Forbidden' }, { status: 403 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await params;
  try {
    await ensureWorkspaceOwner(workspaceId, session.user.id);
    await deleteWorkspace(workspaceId, session.user.id);
    const { writeAuditLog } = await import('@/lib/audit');
    await writeAuditLog({
      workspaceId,
      userId: session.user.id,
      action: 'workspace.deleted',
      resource: 'Workspace',
      resourceId: workspaceId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Forbidden' }, { status: 403 });
  }
}
