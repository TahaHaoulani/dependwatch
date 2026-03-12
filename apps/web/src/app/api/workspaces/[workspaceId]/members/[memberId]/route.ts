import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { updateMemberRole, removeMember } from '@/lib/workspace';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const ROLES = ['admin', 'developer', 'viewer'] as const;
const patchSchema = z.object({ role: z.enum(ROLES) });

/** PATCH /api/workspaces/:workspaceId/members/:memberId — change role (admin/owner only). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId, memberId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    await updateMemberRole(workspaceId, memberId, parsed.data.role, session.user.id);
    await writeAuditLog({
      workspaceId,
      userId: session.user.id,
      action: 'member.role_changed',
      resource: 'WorkspaceMember',
      resourceId: memberId,
      metadata: { previousRole: member.role, newRole: parsed.data.role, memberEmail: member.user.email },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Forbidden';
    return NextResponse.json({ error: msg }, { status: msg === 'Member not found' ? 404 : 403 });
  }
}

/** DELETE /api/workspaces/:workspaceId/members/:memberId — remove member (admin/owner; owner can't be removed). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId, memberId } = await params;
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }
  try {
    await removeMember(workspaceId, memberId, session.user.id);
    await writeAuditLog({
      workspaceId,
      userId: session.user.id,
      action: 'member.removed',
      resource: 'WorkspaceMember',
      resourceId: memberId,
      metadata: { role: member.role, memberEmail: member.user.email },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Forbidden';
    return NextResponse.json({ error: msg }, { status: msg === 'Member not found' ? 404 : 403 });
  }
}
