'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { captureEvent, AnalyticsEvents } from '@/lib/posthog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { CopyButton } from '@/components/ui/copy-button';
import { SyntaxCodeBlock } from '@/components/ui/syntax-code-block';
import { Trash2, AlertTriangle, Check, Loader2, ChevronRight } from 'lucide-react';

type McpToken = {
  id: string;
  label: string;
  tokenPrefix: string;
  scopes: string;
  workspaceId: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

const DEFAULT_SCOPES = 'docs:read,projects:read,projects:test-event,metrics:read';

const CURSOR_CONFIG = (url: string, token: string) => `{
  "mcpServers": {
    "dependwatch": {
      "type": "streamableHttp",
      "url": "${url}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${token}"
      }
    }
  }
}`;

const CLAUDE_CONFIG = (url: string, token: string) => `{
  "mcpServers": {
    "dependwatch": {
      "url": "${url}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${token}"
      }
    }
  }
}`;

const PROMPTS_DOCS = [
  'Search DependWatch docs for OpenAI integration',
  'Show me the Node SDK quickstart for DependWatch',
  'What’s the Stripe example for DependWatch?',
];
const PROMPTS_PROJECTS = [
  'List my DependWatch projects',
  'What’s the setup status for my DependWatch project?',
  'Send a test event to my project',
  'Show latest provider metrics for my project',
];

export function McpSetupClient({
  workspaceId,
  workspaceName,
  projectId,
}: {
  workspaceId: string;
  workspaceName: string;
  projectId: string;
}) {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<{
    token: string;
    id: string;
    label: string;
    prefix: string;
  } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [configTab, setConfigTab] = useState<'cursor' | 'claude'>('cursor');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchTokens = async () => {
    try {
      const res = await fetch(`/api/mcp/tokens?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error('Failed to load tokens');
      const data = await res.json();
      setTokens(data.tokens ?? []);
    } catch {
      toast({ title: 'Error', description: 'Could not load tokens', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [workspaceId]);

  const createToken = async () => {
    if (!label.trim()) {
      toast({ title: 'Enter a label', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/mcp/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          workspaceId,
          scopes: DEFAULT_SCOPES,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to create token');
      }
      const data = await res.json();
      setNewToken({
        token: data.token,
        id: data.id,
        label: data.label,
        prefix: data.prefix,
      });
      setLabel('');
      await fetchTokens();
      captureEvent(AnalyticsEvents.mcp_token_created);
      toast({
        title: 'Token created',
        description: 'Copy it below — it won’t be shown again.',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to create token',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    setRevoking(tokenId);
    try {
      const res = await fetch(`/api/mcp/tokens/${tokenId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke');
      setRevokeConfirm(null);
      await fetchTokens();
      if (newToken?.id === tokenId) setNewToken(null);
      toast({ title: 'Token revoked', description: 'Your assistant will need a new token to access DependWatch.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to revoke token', variant: 'destructive' });
    } finally {
      setRevoking(null);
    }
  };

  const configSnippet =
    newToken && baseUrl
      ? configTab === 'cursor'
        ? CURSOR_CONFIG(baseUrl, newToken.token)
        : CLAUDE_CONFIG(baseUrl, newToken.token)
      : '';

  const dashboardHref = `/dashboard/${workspaceId}/${projectId}`;

  return (
    <div className="max-w-2xl space-y-10">
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link
          href={dashboardHref}
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <span className="text-foreground font-medium">Connect your coding assistant</span>
      </nav>
      {/* Page header + supported clients */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connect your coding assistant</h1>
          <p className="mt-1.5 text-muted-foreground">
            Use DependWatch from your editor. Your assistant can search docs, list projects, send test events, and view metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Supported</span>
          <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">
            Cursor
          </span>
          <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">
            Claude Code
          </span>
          <span className="inline-flex items-center rounded-md border border-border/80 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Generic MCP
          </span>
        </div>
      </div>

      {/* Step 1: Token */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">1</span>
            <CardTitle className="text-base font-semibold">Create an access token</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Name the token (e.g. &quot;Cursor&quot;) and copy it once — it won’t be shown again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newToken && (
            <div className="rounded-lg border-2 border-warning/40 bg-warning/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Shown once — copy now
              </p>
              <p className="mt-1 text-xs text-warning/90">
                Store this in your editor’s MCP config. You won’t be able to see it again.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-background/80 px-3 py-2 text-sm font-mono">
                  {newToken.token}
                </code>
                <CopyButton
                  text={newToken.token}
                  label
                  labelText="Copy token"
                  toastMessage="Token copied"
                  variant="secondary"
                  className="shrink-0"
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-3 text-warning hover:bg-warning/20"
                onClick={() => setNewToken(null)}
              >
                I’ve copied it — dismiss
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="mcp-label">Token name</Label>
              <Input
                id="mcp-label"
                placeholder="e.g. Cursor (local)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createToken()}
                className="max-w-xs"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={createToken} disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Create token
                  </>
                )}
              </Button>
            </div>
          </div>
          {tokens.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Existing tokens</p>
              <ul className="space-y-2">
                {tokens.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium">{t.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{t.tokenPrefix}</span>
                      {t.lastUsedAt && (
                        <span className="text-xs text-muted-foreground">
                          Last used {new Date(t.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {revokeConfirm === t.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Revoke?</span>
                        <Button size="sm" variant="ghost" onClick={() => setRevokeConfirm(null)}>Cancel</Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => revokeToken(t.id)}
                          disabled={revoking === t.id}
                        >
                          {revoking === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Revoke'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRevokeConfirm(t.id)}
                        disabled={revoking === t.id}
                        aria-label="Revoke token"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!loading && tokens.length === 0 && !newToken && (
            <p className="text-sm text-muted-foreground">No tokens yet. Create one above.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Config */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">2</span>
            <CardTitle className="text-base font-semibold">Add config to your editor</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Paste the snippet into your MCP config file, then restart your editor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={configTab === 'cursor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setConfigTab('cursor')}
            >
              Cursor
            </Button>
            <Button
              variant={configTab === 'claude' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setConfigTab('claude')}
            >
              Claude Code
            </Button>
          </div>
          {configSnippet ? (
            <div className="relative rounded-lg border border-border bg-muted/20 p-4">
              <pre className="overflow-x-auto pr-12 text-sm">
                <SyntaxCodeBlock code={configSnippet} language="json" className="font-mono text-xs" />
              </pre>
              <div className="absolute right-3 top-3">
                <CopyButton
                  text={configSnippet}
                  label
                  labelText="Copy config"
                  toastMessage="Config copied"
                  variant="outline"
                  onCopy={() => captureEvent(AnalyticsEvents.mcp_config_copied)}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-muted/10 py-6 text-center text-sm text-muted-foreground">
              Create an access token in step 1 — the config will appear here.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Cursor: Settings → Tools &amp; MCP, or <code className="rounded bg-muted px-1">.cursor/mcp.json</code>. Restart after saving.
          </p>
        </CardContent>
      </Card>

      {/* Step 3: Example prompts */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">3</span>
            <CardTitle className="text-base font-semibold">Try these prompts</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Ask your coding assistant — no token needed for docs; token required for projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Docs (no token)</p>
            <ul className="space-y-2">
              {PROMPTS_DOCS.map((prompt) => (
                <li
                  key={prompt}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-sm"
                >
                  <span className="text-foreground/90">&quot;{prompt}&quot;</span>
                  <CopyButton text={prompt} toastMessage="Prompt copied" />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Projects (token required)</p>
            <ul className="space-y-2">
              {PROMPTS_PROJECTS.map((prompt) => (
                <li
                  key={prompt}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-sm"
                >
                  <span className="text-foreground/90">&quot;{prompt}&quot;</span>
                  <CopyButton text={prompt} toastMessage="Prompt copied" />
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
