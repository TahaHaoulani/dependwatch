import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getCapabilitiesForProject } from '@/lib/pricing-capabilities';

/**
 * GET /api/projects/:projectId/capabilities
 * Returns pricing capabilities for this project (derived from workspace plan).
 * Use for frontend feature gating and display. Auth required.
 */
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

  const capabilities = await getCapabilitiesForProject(projectId);
  return NextResponse.json(capabilities);
}
