'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import { formatNumber, formatDuration, formatCurrency } from '@/lib/utils';
import { Activity, Loader2, Check, BookOpen, Key, Eye, EyeOff, RotateCw, ChevronDown, ChevronRight, HelpCircle, AlertTriangle } from 'lucide-react';
import type { ApiKeyInfo } from './dashboard-types';

const LazySdkExampleBlock = dynamic(
  () => import('./sdk-example-block').then((m) => ({ default: m.SdkExampleBlock })),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-muted-foreground animate-pulse min-h-[120px] flex items-center justify-center">
        Loading example…
      </div>
    ),
  }
);

const INSTALL_CMD = 'npm install @dependwatch/sdk-node';
const CODE_SNIPPET = `import { init, wrap } from '@dependwatch/sdk-node';

// Call once at startup (e.g. server entry)
init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY,
  baseUrl: 'https://app.dependwatch.app', // or 'http://localhost:3000' for local
});

// Wrap any API call — replace the return with your real call
await wrap(
  { provider: 'openai', endpoint: 'chat.completions', estimated_cost_usd: 0.002 },
  async () => {
    return openai.chat.completions.create({ model: 'gpt-4', messages }); // your existing call
  }
);`;

const EXAMPLE_PREVIEW_KPI = { calls: 23444, avgLatency: 1200, errorRate: '0.9%', projectedCost: 3660 };
const EXAMPLE_PROJECTED_SPEND = [
  { provider: 'OpenAI', amount: 3240, vsLastMonth: 180 },
  { provider: 'Stripe', amount: 420, vsLastMonth: 12 },
];
const COST_SPIKE_THRESHOLD_PERCENT = 30;
const COST_TOOLTIP =
  'Projected cost is calculated from:\n• number of API calls\n• estimated cost per call\n• current usage trend';
const EXAMPLE_SPARKLINE = [12, 28, 22, 35, 28, 42, 38, 32, 45, 38, 28, 35];
const EXAMPLE_PREVIEW_ROWS = [
  { provider: 'OpenAI', calls: 12420, p95: 2100, errors: '0.8%', cost: '$3,240' },
  { provider: 'Stripe', calls: 8920, p95: 450, errors: '0.1%', cost: '—' },
  { provider: 'Twilio', calls: 2104, p95: 980, errors: '1.2%', cost: '$420' },
];
const PROVIDER_BADGES: { name: string; accent: string }[] = [
  { name: 'OpenAI', accent: 'border-l-emerald-500/70 bg-emerald-500/5' },
  { name: 'Stripe', accent: 'border-l-violet-500/70 bg-violet-500/5' },
  { name: 'Twilio', accent: 'border-l-red-500/70 bg-red-500/5' },
  { name: 'Resend', accent: 'border-l-amber-500/70 bg-amber-500/5' },
  { name: 'Supabase', accent: 'border-l-green-500/70 bg-green-500/5' },
  { name: 'Clerk', accent: 'border-l-slate-400/70 bg-slate-500/5' },
  { name: 'Auth0', accent: 'border-l-rose-500/70 bg-rose-500/5' },
  { name: 'AWS', accent: 'border-l-orange-500/70 bg-orange-500/5' },
];
const INGESTION_STREAM_PREVIEW: { provider: string; endpoint: string; durationMs: number }[] = [
  { provider: 'openai', endpoint: 'chat.completions', durationMs: 2100 },
  { provider: 'openai', endpoint: 'chat.completions', durationMs: 1800 },
  { provider: 'stripe', endpoint: 'customers.create', durationMs: 450 },
  { provider: 'stripe', endpoint: 'payment_intents.create', durationMs: 380 },
  { provider: 'clerk', endpoint: 'users.getUser', durationMs: 85 },
  { provider: 'twilio', endpoint: 'messages.create', durationMs: 980 },
  { provider: 'resend', endpoint: 'emails.send', durationMs: 310 },
  { provider: 'openai', endpoint: 'chat.completions', durationMs: 1900 },
  { provider: 'stripe', endpoint: 'payment_intents.create', durationMs: 290 },
];

type StreamPhase = 'idle' | 'streaming' | 'sending' | 'success';

type RecentEvent = {
  id: string;
  timestamp: string;
  provider: string;
  endpoint: string | null;
  durationMs: number | null;
  success: boolean;
  statusCode: number | null;
};

export function DashboardEmptyState({
  projectId,
  workspaceId,
  sendTestEvents,
  sendingTestEvents,
  streamPhase,
  streamVisibleCount,
  recentEvents = [],
  metricsRefreshing = false,
  setSelectedEventId,
  ingestKeys,
  newKeyValue,
  setNewKeyValue,
  keyRevealed,
  setKeyRevealed,
  rotating,
  onRotateKey,
  setIngestKeys,
  toast,
}: {
  projectId: string;
  workspaceId: string;
  sendTestEvents: () => void;
  sendingTestEvents: boolean;
  streamPhase: StreamPhase;
  streamVisibleCount: number;
  recentEvents?: RecentEvent[];
  metricsRefreshing?: boolean;
  setSelectedEventId?: (id: string) => void;
  ingestKeys: ApiKeyInfo[];
  newKeyValue: string | null;
  setNewKeyValue: (v: string | null) => void;
  keyRevealed: boolean;
  setKeyRevealed: (v: boolean) => void;
  rotating: boolean;
  onRotateKey: () => Promise<void>;
  setIngestKeys: (keys: ApiKeyInfo[]) => void;
  toast: (p: { title: string; description?: string; variant?: 'destructive' }) => void;
}) {
  const [sdkExampleExpanded, setSdkExampleExpanded] = useState(false);

  return (
    <div className="space-y-12">
      <section className="text-center max-w-2xl mx-auto pt-4 pb-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          One place for latency, failures, and cost across every API and tool
        </h2>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Send events via the SDK—or hit the button below. Metrics, insights, and guardrails as soon as data flows in.
        </p>
      </section>

      <div className="flex flex-col items-center gap-2">
        <Button
          onClick={sendTestEvents}
          size="lg"
          className="gap-2 min-w-[280px] h-12 text-base"
          disabled={sendingTestEvents || streamPhase === 'success'}
        >
          {sendingTestEvents ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <span>Sending 10 test events…</span>
            </>
          ) : streamPhase === 'success' ? (
            <>
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <span>10 test events added</span>
            </>
          ) : (
            <>
              <Activity className="h-5 w-5 shrink-0" />
              <span>Send test events</span>
            </>
          )}
        </Button>
        {streamPhase === 'success' && metricsRefreshing && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            Refreshing dashboard metrics…
          </p>
        )}
        {streamPhase !== 'success' && (
          <p className="text-xs text-muted-foreground">
            No code required — dashboard updates in seconds.
          </p>
        )}
      </div>

      {(streamPhase === 'streaming' || streamPhase === 'sending') && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Ingesting events…
            </CardTitle>
            <CardDescription>Events streaming into DependWatch</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 font-mono text-sm">
              {INGESTION_STREAM_PREVIEW.slice(0, streamVisibleCount).map((line, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-foreground/90 animate-in fade-in slide-in-from-t-1 duration-200"
                >
                  <span className="w-24 shrink-0">{line.provider}</span>
                  <span className="text-muted-foreground truncate flex-1">{line.endpoint}</span>
                  <span className="tabular-nums">{formatDuration(line.durationMs)}</span>
                </li>
              ))}
            </ul>
            {streamPhase === 'sending' && (
              <p className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending to your project…
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {streamPhase === 'success' && (
        <div className="space-y-4">
          {recentEvents.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4 text-primary" />
                  Event stream
                </CardTitle>
                <CardDescription>Test events received — metrics and insights are updating below</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {recentEvents.map((ev) => (
                    <li key={ev.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-sm">
                      <ProviderIcon name={ev.provider} size={16} className="shrink-0" />
                      <span className="font-medium min-w-[80px]">{providerDisplayName(ev.provider)}</span>
                      <span className="text-muted-foreground truncate max-w-[140px]">{ev.endpoint ?? '—'}</span>
                      <span className="tabular-nums ml-auto">
                        {ev.durationMs != null ? formatDuration(ev.durationMs) : '—'}
                      </span>
                      {setSelectedEventId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedEventId(ev.id)}
                        >
                          Details
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3.5 flex items-center gap-3 text-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Check className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="font-medium text-foreground">
                10 test events added. DependWatch is now monitoring your APIs and tools.
              </p>
              <p className="text-muted-foreground mt-0.5">
                Full overview appears below as metrics finish updating.
              </p>
            </div>
          </div>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Next step: connect your real APIs and tools</CardTitle>
              <CardDescription>Install the SDK and wrap your API calls—from your backend, integrations, or the code behind your AI agents. Events appear here and in your metrics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">npm install @dependwatch/sdk-node</code>
                <CopyButton text={INSTALL_CMD} toastMessage="Install command copied" />
              </div>
              <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground">Then in your app</span>
                  <CopyButton text={CODE_SNIPPET} toastMessage="Snippet copied" className="h-7 w-7" />
                </div>
                <LazySdkExampleBlock code={CODE_SNIPPET} />
              </div>
              <Link href="/docs#quickstart">
                <Button variant="outline" size="sm" className="gap-2 mt-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  Quickstart in Docs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/60 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Preview dashboard</CardTitle>
            <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">
              Sample data only
            </span>
          </div>
          <CardDescription className="mt-1">
            This is example data. Send a test event above to see real metrics from your project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
            <span className="tabular-nums font-medium text-foreground">
              {formatNumber(EXAMPLE_PREVIEW_KPI.calls)} calls
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatDuration(EXAMPLE_PREVIEW_KPI.avgLatency)} avg
            </span>
            <span className="tabular-nums text-muted-foreground">{EXAMPLE_PREVIEW_KPI.errorRate} errors</span>
            <span className="tabular-nums font-medium text-foreground ml-auto inline-flex items-center gap-1">
              {formatCurrency(EXAMPLE_PREVIEW_KPI.projectedCost)} projected
              <span title={COST_TOOLTIP} aria-label="How projected cost is calculated">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </span>
            </span>
            <div className="flex items-end gap-0.5 h-5 w-16 shrink-0" aria-hidden>
              {EXAMPLE_SPARKLINE.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-sm bg-primary/25 min-h-[3px]"
                  style={{
                    height: `${Math.max(6, (h / Math.max(...EXAMPLE_SPARKLINE)) * 100)}%`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 inline-flex items-center gap-1">
              Projected API spend this month
              <span title={COST_TOOLTIP} aria-label="How projected cost is calculated">
                <HelpCircle className="h-3.5 w-3.5 cursor-help shrink-0" />
              </span>
            </p>
            <div className="space-y-2">
              {EXAMPLE_PROJECTED_SPEND.map(({ provider, amount, vsLastMonth }) => {
                const isSpike = vsLastMonth >= COST_SPIKE_THRESHOLD_PERCENT;
                return (
                  <div
                    key={provider}
                    className={`flex items-center justify-between gap-3 text-sm rounded-md px-2 py-1.5 -mx-2 ${isSpike ? 'bg-red-500/10 border border-red-500/30' : ''}`}
                  >
                    <span className="font-medium">{provider}</span>
                    <span className="tabular-nums text-foreground">
                      {formatCurrency(amount)} projected
                    </span>
                    {isSpike ? (
                      <span className="tabular-nums text-red-600 dark:text-red-400 text-xs whitespace-nowrap font-medium inline-flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        +{vsLastMonth}% vs last month
                      </span>
                    ) : (
                      <span className="tabular-nums text-emerald-500/90 text-xs whitespace-nowrap">
                        ↑ {vsLastMonth}% vs last month
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Provider</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Calls</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">P95</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Errors</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Cost</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_PREVIEW_ROWS.map((row) => (
                  <tr
                    key={row.provider}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium">{row.provider}</td>
                    <td className="text-right py-3 px-4 tabular-nums text-muted-foreground">
                      {formatNumber(row.calls)}
                    </td>
                    <td className="text-right py-3 px-4 tabular-nums">{formatDuration(row.p95)}</td>
                    <td className="text-right py-3 px-4 tabular-nums">{row.errors}</td>
                    <td className="text-right py-3 px-4 tabular-nums">{row.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROVIDER_BADGES.map(({ name, accent }) => (
              <span
                key={name}
                className={`inline-flex items-center gap-1.5 rounded-md border-l-2 pl-2 pr-2.5 py-1 text-xs font-medium text-foreground/90 ${accent}`}
              >
                <ProviderIcon name={name} size={14} className="shrink-0" />
                {name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              Your ingest key
            </CardTitle>
            <CardDescription className="leading-relaxed">
              Your app needs this to send events. Set it as{' '}
              <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">
                DEPENDWATCH_INGEST_KEY
              </code>{' '}
              and keep it secret.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ingestKeys.length > 0 ? (
              <>
                {newKeyValue && (
                  <div className="rounded-md border border-warning/50 bg-warning/10 p-3">
                    <p className="text-sm font-medium text-warning">
                      New key — copy now, we won’t show it again
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-sm font-mono">
                        {newKeyValue}
                      </code>
                      <CopyButton text={newKeyValue} toastMessage="Key copied" className="shrink-0" />
                    </div>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => setNewKeyValue(null)}>
                      Dismiss
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-sm">
                  <span className="text-foreground/90 flex-1 truncate">
                    {keyRevealed ? ingestKeys[0].keyPrefix : 'dw_live_••••••••••••'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setKeyRevealed(!keyRevealed)}
                    >
                      {keyRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {keyRevealed ? 'Hide' : 'Reveal'}
                    </Button>
                    <CopyButton
                      text={newKeyValue ?? ingestKeys[0].keyPrefix}
                      label
                      labelText="Copy"
                      variant="ghost"
                      toastMessage={
                        newKeyValue
                          ? 'Key copied'
                          : 'Prefix only. Full key was shown once at project creation; rotate key above to get a new one.'
                      }
                      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      disabled={rotating}
                      onClick={onRotateKey}
                    >
                      {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                      Rotate key
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Full key is shown once when you create or rotate.{' '}
                  <Link
                    href={`/dashboard/${workspaceId}/${projectId}/settings`}
                    className="underline hover:text-foreground"
                  >
                    Manage keys in Settings
                  </Link>
                </p>
              </>
            ) : (
              <Link href={`/dashboard/${workspaceId}/${projectId}/settings`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Key className="h-3.5 w-3.5" />
                  Create key in Settings
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-sm font-medium">Or integrate the SDK (2 steps)</CardTitle>
            <CardDescription className="leading-relaxed">
              Send events from your Node app. Get your ingest key from the card on the left first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">1. Install</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-xs">
                <code className="flex-1 truncate">{INSTALL_CMD}</code>
                <CopyButton text={INSTALL_CMD} toastMessage="Install command copied" />
                <span className="text-xs text-muted-foreground shrink-0">Copy</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">2. Wrap your API call</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSdkExampleExpanded((e) => !e)}
                >
                  {sdkExampleExpanded ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Hide example
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      Show example
                    </>
                  )}
                </Button>
              </div>
              {sdkExampleExpanded && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Node.js
                    </span>
                    <div className="flex items-center gap-1.5">
                      <CopyButton text={CODE_SNIPPET} toastMessage="Snippet copied" className="h-7 w-7" />
                      <span className="text-xs text-muted-foreground">Copy</span>
                    </div>
                  </div>
                  <LazySdkExampleBlock code={CODE_SNIPPET} />
                </div>
              )}
            </div>
            <Link href="/docs">
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                Full setup docs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-border/60">
        <Link href="/docs">
          <Button variant="outline" size="lg" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Setup docs
          </Button>
        </Link>
        <Link
          href={`/dashboard/${workspaceId}/${projectId}/settings`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          API keys →
        </Link>
      </div>
    </div>
  );
}
