'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function WorkspaceNotificationsClient({
  workspaceId,
  initialSlackWebhookUrl,
  canEdit,
}: {
  workspaceId: string;
  initialSlackWebhookUrl: string | null;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [url, setUrl] = useState(initialSlackWebhookUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const save = async () => {
    const value = url.trim() || null;
    if (value && !value.startsWith('https://hooks.slack.com/')) {
      toast({
        title: 'Invalid URL',
        description: 'Must be a Slack webhook URL (https://hooks.slack.com/...).',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackWebhookUrl: value }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      toast({ title: 'Saved' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/notifications/test`, {
        method: 'POST',
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Test failed');
      toast({ title: 'Test sent', description: 'Check your Slack channel for the message.' });
    } catch (e) {
      toast({
        title: 'Test failed',
        description: e instanceof Error ? e.message : 'Could not send test',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slack (workspace default)</CardTitle>
        <CardDescription>
          Optional workspace-level Slack webhook. Alerts can use this when no project-specific webhook is set. Use a Slack Incoming Webhook URL (starts with https://hooks.slack.com/).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="slack-url" className="sr-only">Slack webhook URL</label>
          <input
            id="slack-url"
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!canEdit}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={sendTest}
            disabled={testing || !url.trim()}
          >
            {testing ? 'Sending…' : 'Send test notification'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
