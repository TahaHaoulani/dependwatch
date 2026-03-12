import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createInvite, listPendingInvites } from '@/lib/workspace-invite';
import { sendInviteEmail } from '@/lib/workspace-invite-email';
import { writeAuditLog } from '@/lib/audit';
import { getWorkspaceById } from '@/lib/workspace';
import { getWorkspacePlanId } from '@/lib/subscription';
import { z } from 'zod';
import type { WorkspaceRole } from '@/lib/workspace';

const postSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  role: z.enum(['admin', 'developer', 'viewer']),
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
  try {
    const invites = await listPendingInvites(workspaceId, session.user.id);
    return NextResponse.json({ invites });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Forbidden' }, { status: 403 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const planId = await getWorkspacePlanId(workspaceId);
  if (planId === 'free') {
    return NextResponse.json(
      { error: 'Inviting workspace members is available on the Pro plan. Upgrade in Billing.' },
      { status: 403 }
    );
  }
  try {
    const { invite, token } = await createInvite(
      workspaceId,
      parsed.data.email,
      parsed.data.role as WorkspaceRole,
      session.user.id
    );
    const base = process.env.NEXTAUTH_URL ?? (req.headers.get('origin') || '');
    const acceptUrl = `${base.replace(/\/$/, '')}/invite/accept?token=${encodeURIComponent(token)}`;
    const sendResult = await sendInviteEmail(parsed.data.email, workspace.name, acceptUrl);
    if (!sendResult.ok && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Invite created but email could not be sent. Check email configuration.' },
        { status: 500 }
      );
    }
    await writeAuditLog({
      workspaceId,
      userId: session.user.id,
      action: 'member.invited',
      resource: 'WorkspaceInvite',
      resourceId: invite.id,
      metadata: { inviteeEmail: parsed.data.email, role: parsed.data.role },
    });
    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      tokenPrefix: invite.tokenPrefix,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg === 'Invalid role' ? 400 : 403 });
  }
}
