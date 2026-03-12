import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * Workspace layout: auth + workspace access only. Project list is loaded in project layout
 * ([projectId]/layout.tsx) in one parallel batch — do not duplicate here.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  let workspaceId: string;
  try {
    const resolved = await params;
    workspaceId = resolved?.workspaceId ?? '';
  } catch {
    redirect('/onboarding');
  }
  if (!workspaceId) redirect('/onboarding');
  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) redirect('/onboarding');
  return <>{children}</>;
}
