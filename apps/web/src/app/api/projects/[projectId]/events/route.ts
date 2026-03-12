import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getRecentEvents } from '@/lib/analytics';

/** GET /api/projects/:projectId/events — recent API events (event stream). */
export async function GET(
  req: Request,
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
  const limit = Math.min(50, Math.max(1, parseInt(new URL(req.url).searchParams.get('limit') ?? '30', 10) || 30));
  const events = await getRecentEvents(projectId, limit);
  return NextResponse.json({ events });
}
