import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { updateSlackWebhook, deleteSlackWebhook } from '@/lib/slack-webhook';
import { writeAuditLog } from '@/lib/audit';
import { getProjectById } from '@/lib/project';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  url: z.string().url().refine((u) => u.startsWith('https://hooks.slack.com/'), 'Must be a Slack webhook URL').optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId, webhookId } = await params;
  const webhook = await prisma.slackWebhookConfig.findFirst({ where: { id: webhookId, projectId } });
  if (!webhook) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    await updateSlackWebhook(webhookId, session.user.id, parsed.data);
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'webhook.updated',
      resource: 'SlackWebhookConfig',
      resourceId: webhookId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId, webhookId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await deleteSlackWebhook(webhookId, session.user.id);
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'webhook.removed',
      resource: 'SlackWebhookConfig',
      resourceId: webhookId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 404 });
  }
}
