import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getWorkspaceMemberRole } from '@/lib/workspace';
import { ProjectDangerClient } from '@/components/settings/project-danger-client';

export default async function ProjectDangerPage({
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

  const canDelete = role === 'owner' || role === 'admin';

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Danger zone</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Irreversible actions. Deleting a project removes all events and data.
      </p>
      <ProjectDangerClient
        workspaceId={workspaceId}
        projectId={project.id}
        projectName={project.name}
        canDelete={canDelete}
      />
    </>
  );
}
