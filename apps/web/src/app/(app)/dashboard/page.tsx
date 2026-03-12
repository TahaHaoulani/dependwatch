import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { getWorkspacesForUser } from '@/lib/workspace';
import { getProjectsForWorkspace } from '@/lib/project';

/**
 * Dashboard entry: resolve user's default workspace/project and redirect.
 * Keeps "Dashboard" click fast — no onboarding UI or bundle when user is already onboarded.
 * Same resolution logic as onboarding; redirects to /onboarding only when user has no workspace.
 */
export default async function DashboardEntryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const workspaces = await getWorkspacesForUser(session.user.id);
  const firstWorkspace = workspaces[0];

  if (!firstWorkspace) {
    redirect('/onboarding');
  }

  const projects = await getProjectsForWorkspace(firstWorkspace.id, session.user.id);
  if (projects.length > 0) {
    redirect(`/dashboard/${firstWorkspace.id}/${projects[0].id}`);
  }
  redirect(`/dashboard/${firstWorkspace.id}`);
}
