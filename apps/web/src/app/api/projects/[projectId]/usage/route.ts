import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getProjectUsage } from '@/lib/usage';

/** GET /api/projects/:projectId/usage — events this month, plan limit, projected API cost. */
export async function GET(
  _req: Request,
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
  const usage = await getProjectUsage(projectId, session.user.id);
  if (!usage) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(usage);
}
