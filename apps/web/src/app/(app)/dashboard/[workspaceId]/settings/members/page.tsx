import { auth } from '@/lib/auth-server';
import { getWorkspaceById, getWorkspaceMemberRole, listWorkspaceMembers } from '@/lib/workspace';
import { listPendingInvites } from '@/lib/workspace-invite';
import { getWorkspacePlanId } from '@/lib/subscription';
import { WorkspaceMembersClient } from '@/components/settings/workspace-members-client';

export default async function WorkspaceMembersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { workspaceId } = await params;
  const [workspace, myRole, members, pendingInvites, planId] = await Promise.all([
    getWorkspaceById(workspaceId, session.user.id),
    getWorkspaceMemberRole(workspaceId, session.user.id),
    listWorkspaceMembers(workspaceId, session.user.id),
    listPendingInvites(workspaceId, session.user.id).catch(() => []),
    getWorkspacePlanId(workspaceId),
  ]);
  if (!workspace) return null;

  const membersWithUser = members.map((m) => ({
    id: m.id,
    role: m.role,
    userId: m.userId,
    email: m.user?.email ?? null,
    name: m.user?.name ?? null,
    image: m.user?.image ?? null,
  }));

  const canManage = myRole === 'owner' || myRole === 'admin';
  const canInviteByPlan = planId !== 'free';

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage who has access to this workspace. Only owners and admins can invite or remove members.
      </p>
      <WorkspaceMembersClient
        workspaceId={workspaceId}
        members={membersWithUser}
        pendingInvites={pendingInvites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
          createdAt: i.createdAt.toISOString(),
        }))}
        currentUserId={session.user.id}
        currentUserRole={myRole ?? 'viewer'}
        canManage={canManage}
        canInviteByPlan={canInviteByPlan}
      />
    </>
  );
}
