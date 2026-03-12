import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getPlanLimits } from '@/lib/stripe';
import { getWorkspaceMemberRole } from '@/lib/workspace';
import { DataRetentionClient } from '@/components/settings/data-retention-client';
import { prisma } from '@/lib/db';

export default async function ProjectDataRetentionPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) return null;

  const [workspace, role] = await Promise.all([
    prisma.workspace.findFirst({
      where: { id: project.workspaceId },
      include: { subscription: true },
    }),
    getWorkspaceMemberRole(project.workspaceId, session.user.id),
  ]);
  const planId = (workspace?.subscription?.planId ?? 'free') as 'free' | 'builder' | 'startup';
  const limits = getPlanLimits(planId);
  const retentionDaysOverride = (project as { retentionDaysOverride?: number | null }).retentionDaysOverride ?? null;
  const canEdit = role !== 'viewer' && role != null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Data & retention</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How long event data is kept. Plan default applies unless overridden. Viewers cannot edit.
      </p>
      <DataRetentionClient
        projectId={projectId}
        planRetentionDays={limits.retentionDays}
        retentionDaysOverride={retentionDaysOverride}
        canEdit={canEdit}
      />
    </>
  );
}
