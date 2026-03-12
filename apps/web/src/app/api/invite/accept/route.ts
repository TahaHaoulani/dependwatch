import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { acceptInvite } from '@/lib/workspace-invite';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const bodySchema = z.object({ token: z.string().min(1) });

/** POST /api/invite/accept — requires auth; accepts invite by token and adds user to workspace. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }
  try {
    const result = await acceptInvite(parsed.data.token, session.user.id);
    await writeAuditLog({
      workspaceId: result.workspaceId,
      userId: session.user.id,
      action: 'member.joined',
      resource: 'WorkspaceMember',
      metadata: { workspaceName: result.workspaceName },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg === 'Invalid or expired invite' ? 404 : 400 });
  }
}
