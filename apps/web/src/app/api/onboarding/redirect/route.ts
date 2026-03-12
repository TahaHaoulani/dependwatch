import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectsForWorkspace } from '@/lib/project';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  const workspaceId = new URL(req.url).searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }
  const projects = await getProjectsForWorkspace(workspaceId, session.user.id);
  const first = projects[0];
  if (!first) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }
  return NextResponse.redirect(
    new URL(`/dashboard/${workspaceId}/${first.id}`, req.url)
  );
}
