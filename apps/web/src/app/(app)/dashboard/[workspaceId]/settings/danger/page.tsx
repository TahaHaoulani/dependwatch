import { auth } from '@/lib/auth-server';
import { getWorkspaceById, getWorkspaceMemberRole } from '@/lib/workspace';
import { WorkspaceDangerClient } from '@/components/settings/workspace-danger-client';

export default async function WorkspaceDangerPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { workspaceId } = await params;
  const [workspace, role] = await Promise.all([
    getWorkspaceById(workspaceId, session.user.id),
    getWorkspaceMemberRole(workspaceId, session.user.id),
  ]);
  if (!workspace) return null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Danger zone</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Irreversible actions. Only the workspace owner can delete the workspace.
      </p>
      <WorkspaceDangerClient
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        isOwner={role === 'owner'}
      />
    </>
  );
}
