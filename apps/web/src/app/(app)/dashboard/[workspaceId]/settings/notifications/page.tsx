import { auth } from '@/lib/auth-server';
import { getWorkspaceById, getWorkspaceMemberRole } from '@/lib/workspace';
import { WorkspaceNotificationsClient } from '@/components/settings/workspace-notifications-client';

export default async function WorkspaceNotificationsPage({
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
  const slackWebhookUrl = (workspace as { slackWebhookUrl?: string | null }).slackWebhookUrl ?? null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Workspace-level Slack destination and notification routing.
      </p>
      <WorkspaceNotificationsClient
        workspaceId={workspaceId}
        initialSlackWebhookUrl={slackWebhookUrl}
        canEdit={canEdit}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Per-project alert rules and Slack webhooks are configured in each project&apos;s Settings → Alerts. Your personal notification preferences (email digest, etc.) are in Account settings.
      </p>
    </>
  );
}
