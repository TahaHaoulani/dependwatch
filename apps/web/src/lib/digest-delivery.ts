/**
 * Digest delivery: generate and send to Slack. Used by POST digest/deliver and by scheduler.
 * No auth; caller must ensure project exists and plan allows delivery.
 */

import { prisma } from '@/lib/db';
import { generateDigestContent, formatDigestAsText } from '@/lib/digest';
import { getCapabilitiesForProject } from '@/lib/pricing-capabilities';
import { getPlanLimits } from '@/lib/stripe';
import { getWorkspaceSubscription } from '@/lib/subscription';

export type DigestDeliveryResult = { sent: number; failed: number; skipped: boolean; error?: string };

/**
 * Runs digest delivery for a project. Returns { sent, failed } or { skipped: true } if no webhooks/plan.
 */
export async function runDigestDelivery(
  projectId: string,
  range: string
): Promise<DigestDeliveryResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, workspaceId: true },
  });
  if (!project) {
    return { sent: 0, failed: 0, skipped: true, error: 'Project not found' };
  }

  const capabilities = await getCapabilitiesForProject(projectId);
  if (!capabilities.digestDelivery) {
    return { sent: 0, failed: 0, skipped: true, error: 'Plan does not include digest delivery' };
  }

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
    return { sent: 0, failed: 0, skipped: true, error: 'No enabled Slack webhooks' };
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
  return { sent, failed, skipped: false };
}
