import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { ensureWorkspaceAccess } from '@/lib/workspace';
import { getWorkspaceActivity } from '@/lib/audit';
import { prisma } from '@/lib/db';

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
    await ensureWorkspaceAccess(workspaceId, session.user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const limit = Math.min(Number(_req.url ? new URL(_req.url).searchParams.get('limit') : 0) || 50, 100);
  const entries = await getWorkspaceActivity(workspaceId, limit);
  const userIds = [...new Set(entries.map((e) => e.userId).filter(Boolean))] as string[];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, { name: u.name, email: u.email }]));
  return NextResponse.json({ entries, users: userMap });
}
