import { redirect } from 'next/navigation';

export default async function ProjectSettingsIndex({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const { workspaceId, projectId } = await params;
  redirect(`/dashboard/${workspaceId}/${projectId}/settings/general`);
}
