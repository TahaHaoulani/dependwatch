import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default async function WorkspaceSecurityPage({
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
      <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Workspace-level security overview and who can manage keys and integrations.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access control
          </CardTitle>
          <CardDescription>
            Only owners and admins can manage members, billing, and workspace settings. Project API keys and MCP tokens are managed per project; any member with project access can create keys unless you restrict this in the future.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Owners: full control, including delete workspace and billing.</li>
            <li>Admins: can manage members, roles, and workspace settings.</li>
            <li>Developers: can manage projects and project settings.</li>
            <li>Viewers: read-only access to dashboard and reports.</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
