import { DashboardViewLoader } from '@/components/dashboard/dashboard-view-loader';
import { getProjectById } from '@/lib/project';
import { auth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getPlanLimits } from '@/lib/stripe';
import type { PlanId } from '@/lib/stripe';

// Ensure this route is always server-rendered so params and auth are resolved correctly (avoids 404 from static/mismatch)
export const dynamic = 'force-dynamic';

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  let workspaceId: string;
  let projectId: string;
  try {
    const resolved = await params;
    workspaceId = resolved?.workspaceId ?? '';
    projectId = resolved?.projectId ?? '';
  } catch {
    redirect('/onboarding');
  }
  if (!workspaceId || !projectId) redirect('/onboarding');

  const project = await getProjectById(projectId, session.user.id);
  if (!project) redirect('/onboarding');

  const { getWorkspaceSubscription } = await import('@/lib/subscription');
  const subscription = await getWorkspaceSubscription(project.workspaceId);
  const planId = (subscription.planId ?? 'free') as PlanId;
  const limits = getPlanLimits(planId);
  const retentionDays = limits.retentionDays;

  let range = (await searchParams).range ?? '7d';
  if (retentionDays <= 7 && range !== '7d') {
    redirect(`/dashboard/${workspaceId}/${projectId}?range=7d`);
  }

  return (
    <DashboardViewLoader
      projectId={projectId}
      workspaceId={workspaceId}
      range={range}
      retentionDays={retentionDays}
      project={{
        id: project.id,
        name: project.name,
        apiKeys: project.apiKeys,
      }}
    />
  );
}
