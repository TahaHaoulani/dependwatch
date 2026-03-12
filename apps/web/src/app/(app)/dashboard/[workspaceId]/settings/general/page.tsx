import { auth } from '@/lib/auth-server';
import { getWorkspaceById, getWorkspaceMemberRole } from '@/lib/workspace';
import { WorkspaceGeneralClient } from '@/components/settings/workspace-general-client';

export default async function WorkspaceGeneralPage({
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
  const canEdit = role === 'owner' || role === 'admin';

  return (
    <>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">General</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Workspace name and description. Visible to all members. Only owners and admins can edit.
        </p>
      </div>
      <WorkspaceGeneralClient
        workspaceId={workspace.id}
        name={workspace.name}
        description={workspace.description ?? ''}
        canEdit={canEdit}
      />
    </>
  );
}
