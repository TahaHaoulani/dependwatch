import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { ensureDefaultProject } from '@/lib/project';

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const { workspaceId } = await params;
  const project = await ensureDefaultProject(workspaceId, session.user.id);
  redirect(`/dashboard/${workspaceId}/${project.id}`);
}
