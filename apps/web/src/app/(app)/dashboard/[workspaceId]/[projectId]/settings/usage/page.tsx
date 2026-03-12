import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getProjectUsage } from '@/lib/usage';
import { ProjectUsageClient } from '@/components/settings/project-usage-client';

export default async function ProjectUsagePage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { workspaceId, projectId } = await params;
  const [project, usage] = await Promise.all([
    getProjectById(projectId, session.user.id),
    getProjectUsage(projectId, session.user.id),
  ]);
  if (!project || !usage) return null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Usage & limits</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This project&apos;s usage and your workspace plan limits. Billing is per workspace.
      </p>
      <ProjectUsageClient usage={usage} workspaceId={workspaceId} />
    </>
  );
}
