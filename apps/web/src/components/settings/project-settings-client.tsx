'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { ConnectCodingAssistantCard } from '@/components/mcp/connect-coding-assistant-card';

type ApiKey = { id: string; name: string; keyPrefix: string; lastUsedAt: Date | string | null; createdAt: Date | string };

export function ProjectSettingsClient({
  project,
}: {
  project: {
    id: string;
    name: string;
    slug: string;
    workspaceId: string;
    apiKeys: ApiKey[];
  };
}) {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState(project.name);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(project.apiKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'New key' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      const data = await res.json();
      setApiKeys((prev) => [...prev, { id: data.id, name: data.name, keyPrefix: data.keyPrefix, lastUsedAt: null, createdAt: new Date().toISOString() }]);
      setNewKeyValue(data.key);
      setNewKeyName('');
      toast({ title: 'API key created', description: 'Copy it now — we won’t show it again.' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to create key', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm('Revoke this key? Any SDK using it will stop working.')) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/keys/${keyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast({ title: 'Key revoked' });
    } catch {
      toast({ title: 'Error', description: 'Failed to revoke key', variant: 'destructive' });
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'Copied to clipboard' });
  };

  const saveName = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Project name updated' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update name', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <ConnectCodingAssistantCard workspaceId={project.workspaceId} projectId={project.id} />
      <Card>
        <CardHeader>
          <CardTitle>Project name</CardTitle>
          <CardDescription>Display name for this project.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={saveName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingest API keys</CardTitle>
          <CardDescription>
            Use these keys in the SDK to send events. Keep them secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newKeyValue && (
            <div className="rounded-md border border-warning/50 bg-warning/10 p-3">
              <p className="text-sm font-medium text-warning">New key — copy now</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-sm">{newKeyValue}</code>
                <Button size="icon" variant="outline" onClick={() => copyKey(newKeyValue)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => setNewKeyValue(null)}
              >
                Dismiss
              </Button>
            </div>
          )}
          <ul className="space-y-2">
            {apiKeys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div>
                  <span className="font-medium">{k.name}</span>
                  <span className="ml-2 font-mono text-sm text-muted-foreground">{k.keyPrefix}</span>
                  {k.lastUsedAt ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Last used {new Date(k.lastUsedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
                <Button size="icon" variant="ghost" onClick={() => revokeKey(k.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              placeholder="Key name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="max-w-[200px]"
            />
            <Button onClick={createKey} disabled={creating}>
              <Plus className="h-4 w-4 mr-1" />
              Create key
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
