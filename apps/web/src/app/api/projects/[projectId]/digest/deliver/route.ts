import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { generateDigestContent, formatDigestAsText } from '@/lib/digest';
import { getCapabilitiesForProject } from '@/lib/pricing-capabilities';
import { getPlanLimits } from '@/lib/stripe';
import { prisma } from '@/lib/db';

/**
 * POST /api/projects/:projectId/digest/deliver?range=7d
 * Generates digest content and sends it to all enabled Slack webhooks for the project.
 * Requires Pro or Scale (digest delivery is plan-gated). Call from cron for scheduled delivery.
 * Example cron: 0 9 * * * curl -X POST -H "Cookie: ..." "https://app.dependwatch.app/api/projects/PROJECT_ID/digest/deliver?range=7d"
 * For production, use a cron that authenticates (e.g. server-side with session or API token).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const capabilities = await getCapabilitiesForProject(projectId);
  if (!capabilities.digestDelivery) {
    return NextResponse.json(
      { error: 'Digest delivery is not available on your plan. Upgrade to Pro or Scale.' },
      { status: 403 }
    );
  }

  const range = new URL(req.url).searchParams.get('range') ?? '7d';
  const { getWorkspaceSubscription } = await import('@/lib/subscription');
  const subscription = await getWorkspaceSubscription(project.workspaceId);
  const limits = getPlanLimits(subscription.planId ?? 'free');

  const content = await generateDigestContent(
    projectId,
    range,
    limits.retentionDays,
    project.name
  );
  const textBody = formatDigestAsText(content);

  const webhooks = await prisma.slackWebhookConfig.findMany({
    where: { projectId, enabled: true },
  });
  if (webhooks.length === 0) {
    return NextResponse.json(
      {
        error: 'No enabled Slack webhooks for this project. Add webhooks in Project → Settings → Alerts.',
        sent: 0,
        failed: 0,
      },
      { status: 400 }
    );
  }

  const slackMessage = {
    text: `DependWatch digest — ${content.period}${project.name ? `\nProject: ${project.name}` : ''}\n\n${textBody}`,
  };

  let sent = 0;
  let failed = 0;
  for (const w of webhooks) {
    try {
      const res = await fetch(w.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      });
      if (res.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    range,
    note: 'Call this endpoint from a cron job or scheduler for daily/weekly digest delivery. Authenticate with the same session or a secure token.',
  });
}
