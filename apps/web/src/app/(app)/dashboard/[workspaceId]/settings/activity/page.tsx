import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';
import { getWorkspaceActivity } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { ActivityLogClient } from '@/components/settings/workspace-activity-client';

export default async function WorkspaceActivityPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { workspaceId } = await params;
  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) return null;

  const entries = await getWorkspaceActivity(workspaceId, 50);
  const userIds = [...new Set(entries.map((e) => e.userId).filter(Boolean))] as string[];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, { name: u.name, email: u.email }]));

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Recent sensitive actions in this workspace: keys, members, webhooks, and destructive changes.
      </p>
      <ActivityLogClient
        workspaceId={workspaceId}
        initialEntries={entries}
        initialUserMap={userMap}
      />
    </>
  );
}
