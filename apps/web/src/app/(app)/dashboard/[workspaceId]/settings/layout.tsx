import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';
import { getProjectsForWorkspace } from '@/lib/project';
import { getWorkspacesForUser } from '@/lib/workspace';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { WorkspaceSettingsShell } from '@/components/settings/workspace-settings-shell';

const WORKSPACE_NAV: { label: string; href: string; group: string }[] = [
  { label: 'General', href: 'general', group: 'Workspace' },
  { label: 'Members', href: 'members', group: 'Workspace' },
  { label: 'Billing', href: 'billing', group: 'Workspace' },
  { label: 'Integrations', href: 'integrations', group: 'Workspace' },
  { label: 'Notifications', href: 'notifications', group: 'Workspace' },
  { label: 'Security', href: 'security', group: 'Workspace' },
  { label: 'Activity', href: 'activity', group: 'Workspace' },
  { label: 'Danger zone', href: 'danger', group: 'Workspace' },
];

export default async function WorkspaceSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const { workspaceId } = await params;
  const [workspace, workspaces, projects] = await Promise.all([
    getWorkspaceById(workspaceId, session.user.id),
    getWorkspacesForUser(session.user.id),
    getProjectsForWorkspace(workspaceId, session.user.id),
  ]);
  if (!workspace) redirect('/onboarding');
  const currentProject = projects[0];
  const base = `/dashboard/${workspaceId}/settings`;
  const navItems = WORKSPACE_NAV.map((item) => ({
    ...item,
    href: `${base}/${item.href}`,
  }));

  return (
    <div className="min-h-screen bg-background">
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
              currentProject={currentProject ?? { id: '', name: 'No project', slug: '' }}
            />
            <span className="text-sm text-muted-foreground">/ Settings</span>
          </div>
          <DashboardHeader
            workspaceId={workspaceId}
            projectId={currentProject?.id ?? ''}
            userEmail={session.user.email}
          />
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <WorkspaceSettingsShell
          workspaceId={workspaceId}
          workspaceName={workspace.name}
          navItems={navItems}
        >
          {children}
        </WorkspaceSettingsShell>
      </main>
    </div>
  );
}
