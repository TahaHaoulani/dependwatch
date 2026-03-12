import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export default async function WorkspaceIntegrationsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { workspaceId } = await params;
  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) return null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Workspace-wide integrations for alerts and notifications.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Slack
          </CardTitle>
          <CardDescription>
            Workspace-level Slack is in Settings → Notifications. Per-project Slack webhooks are in each project&apos;s Settings → Alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/dashboard/${workspaceId}/settings/notifications`}>Workspace notifications</Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Add project-specific Slack webhooks in Project settings → Alerts.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
