import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';
import { getProjectById, getProjectsForWorkspace } from '@/lib/project';
import { SettingsShell } from '@/components/settings/settings-shell';
import { getWorkspacesForUser } from '@/lib/workspace';

const PROJECT_NAV: { label: string; href: string; group: string; icon: string }[] = [
  { label: 'General', href: 'general', group: 'Project', icon: 'Settings' },
  { label: 'API keys', href: 'api-keys', group: 'Project', icon: 'Key' },
  { label: 'Alerts', href: 'alerts', group: 'Project', icon: 'Bell' },
  { label: 'Data & retention', href: 'data-retention', group: 'Project', icon: 'Database' },
  { label: 'Usage & limits', href: 'usage', group: 'Project', icon: 'BarChart3' },
  { label: 'Dependency controls', href: 'dependency-controls', group: 'Project', icon: 'GitBranch' },
  { label: 'MCP & assistant', href: 'mcp', group: 'Project', icon: 'Bot' },
  { label: 'Danger zone', href: 'danger', group: 'Project', icon: 'AlertTriangle' },
];

export default async function ProjectSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const { workspaceId, projectId } = await params;
  const [workspace, project, workspaces, projects] = await Promise.all([
    getWorkspaceById(workspaceId, session.user.id),
    getProjectById(projectId, session.user.id),
    getWorkspacesForUser(session.user.id),
    getProjectsForWorkspace(workspaceId, session.user.id),
  ]);
  if (!workspace || !project) redirect('/onboarding');

  const base = `/dashboard/${workspaceId}/${projectId}/settings`;
  const navItems = PROJECT_NAV.map((item) => ({
    ...item,
    href: `${base}/${item.href}`,
  }));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <SettingsShell
        navItems={navItems}
        navHeader="Project settings"
        breadcrumbs={[
          { label: workspace.name, href: `/dashboard/${workspaceId}` },
          { label: project.name, href: `/dashboard/${workspaceId}/${projectId}` },
          { label: 'Settings' },
        ]}
      >
        {children}
      </SettingsShell>
    </div>
  );
}
