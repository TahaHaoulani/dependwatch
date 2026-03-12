import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';
import { getProjectById } from '@/lib/project';
import { McpSetupClient } from '@/components/mcp/mcp-setup-client';

export default async function McpSetupPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const { workspaceId, projectId } = await params;
  const [workspace, project] = await Promise.all([
    getWorkspaceById(workspaceId, session.user.id),
    getProjectById(projectId, session.user.id),
  ]);
  if (!workspace || !project) redirect('/onboarding');
  return (
    <McpSetupClient
      workspaceId={workspaceId}
      workspaceName={workspace.name}
      projectId={projectId}
    />
  );
}
