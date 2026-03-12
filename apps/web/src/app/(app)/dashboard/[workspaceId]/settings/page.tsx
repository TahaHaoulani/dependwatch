import { redirect } from 'next/navigation';

export default async function WorkspaceSettingsIndex({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  redirect(`/dashboard/${workspaceId}/settings/general`);
}
