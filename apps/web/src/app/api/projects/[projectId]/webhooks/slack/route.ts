import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { listSlackWebhooks, createSlackWebhook } from '@/lib/slack-webhook';
import { z } from 'zod';

const postSchema = z.object({
  url: z.string().url().refine((u) => u.startsWith('https://hooks.slack.com/'), 'Must be a Slack webhook URL'),
  enabled: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const webhooks = await listSlackWebhooks(projectId, session.user.id);
  if (webhooks === null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ webhooks });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const project = await import('@/lib/project').then((m) => m.getProjectById(projectId, session.user.id));
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { getCapabilitiesForProject, withinLimit } = await import('@/lib/pricing-capabilities');
    const capabilities = await getCapabilitiesForProject(projectId);
    const webhooks = await listSlackWebhooks(projectId, session.user.id);
    const currentCount = webhooks?.length ?? 0;
    if (!withinLimit(currentCount, capabilities.maxSlackWebhooks)) {
      return NextResponse.json(
        {
          error: `You have reached the limit of Slack webhooks for the ${capabilities.planName} plan.`,
          code: 'PLAN_LIMIT_REACHED',
        },
        { status: 403 }
      );
    }
    const webhook = await createSlackWebhook(projectId, session.user.id, parsed.data);
    const { writeAuditLog } = await import('@/lib/audit');
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'webhook.created',
      resource: 'SlackWebhookConfig',
      resourceId: webhook.id,
    });
    return NextResponse.json(webhook);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 400 });
  }
}
