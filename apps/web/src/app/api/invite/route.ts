import { NextResponse } from 'next/server';
import { getInviteByToken } from '@/lib/workspace-invite';

/** GET /api/invite?token=xxx — public; returns workspace name and email for display on accept page. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }
  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
  }
  return NextResponse.json({
    workspaceName: invite.workspace.name,
    email: invite.email,
    role: invite.role,
  });
}
