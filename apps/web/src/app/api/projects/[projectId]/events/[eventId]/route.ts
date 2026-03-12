import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getEventById } from '@/lib/analytics';

/** GET /api/projects/:projectId/events/:eventId — single event detail. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; eventId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId, eventId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const event = await getEventById(projectId, eventId);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  return NextResponse.json({ event });
}
