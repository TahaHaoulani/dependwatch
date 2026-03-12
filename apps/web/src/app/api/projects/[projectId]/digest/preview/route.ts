import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { generateDigestContent, formatDigestAsText } from '@/lib/digest';
import { getPlanLimits } from '@/lib/stripe';
import { prisma } from '@/lib/db';

/**
 * GET /api/projects/:projectId/digest/preview?range=7d
 * Returns digest content (and plain-text body) for the project. Does not send email/Slack.
 * Use for "Preview digest" in UI or as the data source when a scheduler triggers delivery.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { getWorkspaceSubscription } = await import('@/lib/subscription');
  const subscription = await getWorkspaceSubscription(project.workspaceId);
  const planId = subscription.planId ?? 'free';
  const limits = getPlanLimits(planId);
  const range = new URL(req.url).searchParams.get('range') ?? '7d';

  const content = await generateDigestContent(
    projectId,
    range,
    limits.retentionDays,
    project.name
  );
  const textBody = formatDigestAsText(content);

  return NextResponse.json({
    content,
    textBody,
    note: 'Scheduled daily/weekly delivery requires a cron job or external scheduler. This endpoint returns the digest content only.',
  });
}
