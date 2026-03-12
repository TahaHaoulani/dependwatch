import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';

/** POST /api/workspaces/:workspaceId/notifications/test — send a test message to workspace Slack webhook. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await params;
  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const url = (workspace as { slackWebhookUrl?: string | null }).slackWebhookUrl;
  if (!url || !url.startsWith('https://hooks.slack.com/')) {
    return NextResponse.json(
      { error: 'No workspace Slack webhook configured. Add one in Workspace → Settings → Notifications.' },
      { status: 400 }
    );
  }
  const body = JSON.stringify({
    text: `DependWatch test notification from workspace *${workspace.name}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `DependWatch test notification from workspace *${workspace.name}*`,
        },
      },
    ],
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json(
      { error: `Slack returned ${res.status}: ${t.slice(0, 200)}` },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
