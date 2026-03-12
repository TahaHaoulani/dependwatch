'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Send, ArrowUpRight, Loader2 } from 'lucide-react';

type Webhook = { id: string; url: string; enabled: boolean };

type SlackCapabilities = {
  maxSlackWebhooks: number;
  planName: string;
};

export function ProjectSlackWebhooksClient({
  projectId,
  workspaceId,
  initialWebhooks,
  canEdit = true,
  capabilities,
}: {
  projectId: string;
  workspaceId: string;
  initialWebhooks: Webhook[];
  canEdit?: boolean;
  capabilities: SlackCapabilities;
}) {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const add = async () => {
    if (!newUrl.trim().startsWith('https://hooks.slack.com/')) {
      toast({ title: 'Invalid URL', description: 'Must be a Slack webhook URL.', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim(), enabled: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.code === 'PLAN_LIMIT_REACHED') {
          toast({
            title: 'Plan limit reached',
            description: d.error ?? 'Upgrade to add more Slack webhooks.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(d.error ?? 'Failed');
      }
      const w = d;
      setWebhooks((prev) => [...prev, { id: w.id, url: w.url, enabled: w.enabled }]);
      setNewUrl('');
      toast({ title: 'Slack webhook added' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (webhookId: string) => {
    if (!confirm('Remove this webhook?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks/slack/${webhookId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
      toast({ title: 'Webhook removed' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const toggleEnabled = async (webhookId: string, current: boolean) => {
    setTogglingId(webhookId);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks/slack/${webhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current }),
      });
      if (!res.ok) throw new Error('Failed');
      setWebhooks((prev) => prev.map((w) => (w.id === webhookId ? { ...w, enabled: !current } : w)));
      toast({ title: !current ? 'Webhook active' : 'Webhook paused' });
    } catch {
      toast({ title: 'Error updating webhook', variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks/slack/test`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: data.error ?? 'Failed to send test', variant: 'destructive' });
        return;
      }
      const failed = (data.results ?? []).filter((r: { ok?: boolean }) => !r.ok);
      if (failed.length > 0) {
        const firstError = failed[0]?.error ?? 'Unknown error';
        toast({
          title: `${data.sent ?? 0} of ${data.total ?? 0} webhooks received the test`,
          description: `${failed.length} failed. ${firstError}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Test alert sent',
          description: data.total > 1 ? `Sent to ${data.total} webhooks.` : undefined,
        });
      }
    } catch {
      toast({ title: 'Error sending test', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const slackDisabled = capabilities.maxSlackWebhooks === 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Slack webhooks</CardTitle>
        <CardDescription className="mt-1">
          Alerts and digest delivery are sent only to <strong>enabled</strong> webhooks. Add a webhook URL (Slack Incoming Webhooks), then turn it on to receive notifications.
        </CardDescription>
        {slackDisabled && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <p>Slack notifications are available on the Pro plan.</p>
            <Link
              href={`/dashboard/${workspaceId}/billing`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-foreground underline hover:no-underline"
            >
              Upgrade to Pro <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {!canEdit && (
          <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            You have view-only access.
          </p>
        )}
        {webhooks.length === 0 && !slackDisabled && canEdit && (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            No webhooks yet. Add one below to receive alerts and (on Pro/Scale) digest delivery in Slack.
          </p>
        )}
        {webhooks.some((w) => w.enabled) && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={sendTest} disabled={testing}>
              {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send test alert
            </Button>
            <span className="text-xs text-muted-foreground">Sends a sample message to all <strong>enabled</strong> webhooks.</span>
          </div>
        )}
        {webhooks.length > 0 && (
          <ul className="space-y-2">
            {webhooks.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <code className="truncate text-sm text-muted-foreground">{w.url}</code>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${w.enabled ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                    {w.enabled ? 'Active' : 'Paused'}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEnabled(w.id, w.enabled)}
                      disabled={togglingId === w.id}
                    >
                      {togglingId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : w.enabled ? 'Pause' : 'Activate'}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => remove(w.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && !slackDisabled && (
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="https://hooks.slack.com/services/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="min-w-[280px]"
            />
            <Button onClick={add} disabled={adding}>
              <Plus className="mr-1 h-4 w-4" />
              Add webhook
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
