import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getWorkspaceMemberRole } from '@/lib/workspace';
import { ProjectGeneralClient } from '@/components/settings/project-general-client';

export default async function ProjectGeneralPage({
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

  return (
    <>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">General</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Project name, description, and environment. Viewers cannot edit.
        </p>
      </div>
      <ProjectGeneralClient
        projectId={project.id}
        name={project.name}
        description={(project as { description?: string | null }).description ?? ''}
        environment={(project as { environment?: string | null }).environment ?? ''}
        canEdit={canEdit}
      />
    </>
  );
}
