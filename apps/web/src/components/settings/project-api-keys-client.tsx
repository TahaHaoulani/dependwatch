'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { CopyButton } from '@/components/ui/copy-button';
import { SyntaxCodeBlock } from '@/components/ui/syntax-code-block';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, RotateCcw, KeyRound } from 'lucide-react';

const ENV_OPTIONS = [
  { value: '', label: 'No environment' },
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Development' },
];

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | string | null;
  rotatedAt?: Date | string | null;
  createdAt: Date | string;
  environmentTag?: string | null;
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}

const INSTALL_CMD = 'npm install @dependwatch/sdk-node';
const SNIPPET = `import { init, wrap } from '@dependwatch/sdk-node';

const client = init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY!,
});

// Wrap an API call to track latency, errors, and cost
const result = await wrap(
  { provider: 'openai', service_name: 'chat' },
  () => fetch('https://api.openai.com/v1/chat/completions', { ... })
);`;

export function ProjectApiKeysClient({
  projectId,
  apiKeys: initialKeys,
  canEdit = true,
}: {
  projectId: string;
  workspaceId: string;
  apiKeys: ApiKey[];
  canEdit?: boolean;
}) {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState(initialKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName || 'New key',
          environmentTag: newKeyEnv || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to create key');
      setApiKeys((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          keyPrefix: data.keyPrefix,
          lastUsedAt: null,
          rotatedAt: null,
          createdAt: new Date().toISOString(),
          environmentTag: data.environmentTag ?? null,
        },
      ]);
      setNewKeyValue(data.key);
      setNewKeyName('');
      setNewKeyEnv('');
      toast({
        title: 'API key created',
        description: 'Copy it now — we won’t show it again.',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to create key',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (key: ApiKey) => {
    setRevoking(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/keys/${key.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke');
      setApiKeys((prev) => prev.filter((k) => k.id !== key.id));
      setRevokeTarget(null);
      toast({ title: 'Key revoked', description: 'This key can no longer be used.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to revoke key', variant: 'destructive' });
    } finally {
      setRevoking(false);
    }
  };

  const rotateKey = async (keyId: string) => {
    setRotating(keyId);
    try {
      const res = await fetch(`/api/projects/${projectId}/keys/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyIdToRevoke: keyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to rotate');
      setApiKeys((prev) => [
        ...prev.filter((k) => k.id !== keyId),
        {
          id: data.id,
          name: data.name,
          keyPrefix: data.keyPrefix,
          lastUsedAt: null,
          rotatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          environmentTag: data.environmentTag ?? null,
        },
      ]);
      setNewKeyValue(data.key);
      toast({
        title: 'Key rotated',
        description: 'Copy the new key below. The old key is revoked.',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to rotate',
        variant: 'destructive',
      });
    } finally {
      setRotating(null);
    }
  };

  const copyFullKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'API key copied' });
  };

  const sortedKeys = [...apiKeys].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const primaryId = sortedKeys[0]?.id;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Ingest API keys</CardTitle>
          <CardDescription>
            Use these keys in your SDK to send events. Full key is shown only once at creation or rotation. Rotate if compromised.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {!canEdit && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              You have view-only access. Only owners, admins, and developers can manage keys.
            </div>
          )}

          {newKeyValue && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 dark:border-amber-400/30 dark:bg-amber-400/10">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                New key — copy now. We won’t show it again.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-amber-500/30 bg-background/80 px-3 py-2 font-mono text-sm dark:border-amber-400/20">
                  {newKeyValue}
                </code>
                <CopyButton
                  text={newKeyValue}
                  label
                  labelText="Copy"
                  toastMessage="API key copied"
                  variant="outline"
                  onCopy={() => copyFullKey(newKeyValue)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
                  onClick={() => setNewKeyValue(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">No API keys yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an ingest key to start sending events from your app.
              </p>
              {canEdit && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Input
                    placeholder="Key name (e.g. Production)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-48"
                  />
                  <Select value={newKeyEnv || '__none'} onValueChange={(v) => setNewKeyEnv(v === '__none' ? '' : v)}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Environment" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENV_OPTIONS.map((o) => (
                        <SelectItem key={o.value || 'none'} value={o.value || '__none'}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={createKey} disabled={creating}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create key
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {sortedKeys.map((k) => (
                  <li
                    key={k.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{k.name}</span>
                        {k.id === primaryId && k.name === 'Default' && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                            Default key
                          </span>
                        )}
                        {k.environmentTag && (
                          <span className="rounded border border-border bg-background/80 px-1.5 py-0.5 text-xs text-muted-foreground capitalize">
                            {k.environmentTag}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono">{k.keyPrefix}</span>
                        <span>Created {formatRelative(k.createdAt)}</span>
                        {k.lastUsedAt ? (
                          <span>Last used {formatRelative(k.lastUsedAt)}</span>
                        ) : (
                          <span>Never used</span>
                        )}
                        {k.rotatedAt && (
                          <span>Rotated {formatRelative(k.rotatedAt)}</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rotateKey(k.id)}
                          disabled={!!rotating}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Rotate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setRevokeTarget(k)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {canEdit && (
                <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      placeholder="Key name"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-44"
                    />
                    <Select value={newKeyEnv || '__none'} onValueChange={(v) => setNewKeyEnv(v === '__none' ? '' : v)}>
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue placeholder="Environment" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENV_OPTIONS.map((o) => (
                          <SelectItem key={o.value || 'none'} value={o.value || '__none'}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createKey} disabled={creating}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create key
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* SDK activation block */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Use this key with the SDK</CardTitle>
          <CardDescription>
            Install the SDK, set your key, and start sending events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Install</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-sm">
                {INSTALL_CMD}
              </code>
              <CopyButton text={INSTALL_CMD} toastMessage="Install command copied" />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Environment variable</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-sm">
                DEPENDWATCH_INGEST_KEY=your_key_here
              </code>
              <CopyButton
                text="DEPENDWATCH_INGEST_KEY=your_key_here"
                toastMessage="Env example copied"
              />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Code</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed">
              <SyntaxCodeBlock code={SNIPPET} className="block" />
            </pre>
            <CopyButton
              text={SNIPPET}
              className="mt-2"
              label
              labelText="Copy code"
              toastMessage="Snippet copied"
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent showClose={true}>
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
            <DialogDescription>
              Any app using this key will stop working. This cannot be undone. Create a new key if you need one later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeTarget && revokeKey(revokeTarget)}
              disabled={revoking}
            >
              {revoking ? 'Revoking…' : 'Revoke key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
