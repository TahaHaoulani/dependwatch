import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { listSlackWebhooks } from '@/lib/slack-webhook';
import { formatSlackIncidentBlocks } from '@/lib/slack-alert-format';

/**
 * POST /api/projects/:projectId/webhooks/slack/test
 * Sends a test alert to all enabled Slack webhooks for this project.
 * Pro/Scale: full delivery. Free: webhooks can be configured but Slack delivery is Scale-only for real alerts; test still works to verify URL.
 */
export async function POST(
  _req: Request,
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

  const webhooks = await listSlackWebhooks(projectId, session.user.id);
  if (!webhooks || webhooks.length === 0) {
    return NextResponse.json(
      { error: 'No Slack webhooks configured. Add a webhook in Project settings → Alerts.' },
      { status: 400 }
    );
  }

  const enabled = webhooks.filter((w) => w.enabled);
  if (enabled.length === 0) {
    return NextResponse.json(
      { error: 'No enabled webhooks. Enable at least one webhook to send a test.' },
      { status: 400 }
    );
  }

  const payload = {
    blocks: formatSlackIncidentBlocks({
      provider: 'openai',
      endpoint: 'chat/completions',
      detectionType: 'latency_spike',
      message: 'This is a test alert from DependWatch. Your Slack integration is working.',
      metrics: { p95Ms: 4200 },
      incidentUrl: undefined,
    }),
  };

  const results: { url: string; ok: boolean; error?: string }[] = [];
  for (const w of enabled) {
    try {
      const res = await fetch(w.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      results.push({
        url: w.url.slice(0, 50) + '…',
        ok: res.ok,
        error: res.ok ? undefined : await res.text().then((t) => t.slice(0, 100)),
      });
    } catch (e) {
      results.push({ url: w.url.slice(0, 50) + '…', ok: false, error: e instanceof Error ? e.message : 'Request failed' });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({
    sent: results.filter((r) => r.ok).length,
    total: enabled.length,
    results,
    message: allOk ? 'Test alert sent to Slack.' : 'Some webhooks failed. Check results.',
  });
}
