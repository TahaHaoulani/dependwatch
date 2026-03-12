import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById, getWorkspacesForUser } from '@/lib/workspace';
import { getProjectById, getProjectsForWorkspace } from '@/lib/project';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import Link from 'next/link';

/**
 * Async server component that loads workspace/project nav data.
 * Used inside Suspense so the layout can stream: shell first, then this content.
 */
export async function DashboardLayoutContent({
  workspaceId,
  projectId,
  children,
}: {
  workspaceId: string;
  projectId: string;
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [workspace, project, workspaces, projects] = await Promise.all([
    getWorkspaceById(workspaceId, session.user.id),
    getProjectById(projectId, session.user.id),
    getWorkspacesForUser(session.user.id),
    getProjectsForWorkspace(workspaceId, session.user.id),
  ]);

  if (!workspace || !project) redirect('/onboarding');

  return (
    <>
      <header className="border-b border-border/40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-lg">◇</span>
              DependWatch
            </Link>
            <DashboardNav
              workspaces={workspaces}
              projects={projects}
              currentWorkspace={workspace}
              currentProject={project}
            />
          </div>
          <DashboardHeader
            workspaceId={workspaceId}
            projectId={projectId}
            userEmail={session.user.email}
          />
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </>
  );
}
