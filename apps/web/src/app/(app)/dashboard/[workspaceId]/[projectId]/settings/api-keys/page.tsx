import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getWorkspaceMemberRole } from '@/lib/workspace';
import { ProjectApiKeysClient } from '@/components/settings/project-api-keys-client';

export default async function ProjectApiKeysPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { workspaceId, projectId } = await params;
  const [project, role] = await Promise.all([
    getProjectById(projectId, session.user.id),
    getWorkspaceMemberRole(workspaceId, session.user.id),
  ]);
  if (!project) return null;
  const canEdit = role !== 'viewer' && role != null;

  const apiKeys = project.apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt,
    rotatedAt: (k as { rotatedAt?: Date | null }).rotatedAt ?? null,
    createdAt: k.createdAt,
    environmentTag: (k as { environmentTag?: string | null }).environmentTag ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Ingest keys for sending events from your app. Full key is shown only once at creation or rotation. Rotate if compromised.
        </p>
      </div>
      <ProjectApiKeysClient projectId={project.id} workspaceId={project.workspaceId} apiKeys={apiKeys} canEdit={canEdit} />
    </div>
  );
}
