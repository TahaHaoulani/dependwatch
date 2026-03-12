import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { getWorkspacesForUser } from '@/lib/workspace';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const workspaces = await getWorkspacesForUser(session.user.id);
  const hasWorkspace = workspaces.length > 0;
  const firstWorkspace = workspaces[0];

  if (hasWorkspace && firstWorkspace) {
    const firstProject = await import('@/lib/project').then((m) =>
      m.getProjectsForWorkspace(firstWorkspace.id, session.user!.id)
    );
    if (firstProject.length > 0) {
      redirect(`/dashboard/${firstWorkspace.id}/${firstProject[0].id}`);
    }
    redirect(`/dashboard/${firstWorkspace.id}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <OnboardingClient
        userId={session.user.id}
        initialWorkspaceName={firstWorkspace?.name}
        existingWorkspaceId={firstWorkspace?.id}
      />
    </div>
  );
}
