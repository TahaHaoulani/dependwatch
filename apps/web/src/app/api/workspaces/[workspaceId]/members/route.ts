import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { listWorkspaceMembers } from '@/lib/workspace';

/** GET /api/workspaces/:workspaceId/members — list members (any member can read). */
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
    const members = await listWorkspaceMembers(workspaceId, session.user.id);
    return NextResponse.json({ members });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Forbidden' }, { status: 403 });
  }
}
