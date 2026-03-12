import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { revokeInvite } from '@/lib/workspace-invite';
import { writeAuditLog } from '@/lib/audit';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; inviteId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId, inviteId } = await params;
  try {
    const { prisma } = await import('@/lib/db');
    const invite = await prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspaceId },
    });
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }
    await revokeInvite(inviteId, workspaceId, session.user.id);
    await writeAuditLog({
      workspaceId,
      userId: session.user.id,
      action: 'member.invite_revoked',
      resource: 'WorkspaceInvite',
      resourceId: inviteId,
      metadata: { inviteeEmail: invite.email },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Forbidden';
    return NextResponse.json({ error: msg }, { status: msg === 'Invite not found' ? 404 : 403 });
  }
}
