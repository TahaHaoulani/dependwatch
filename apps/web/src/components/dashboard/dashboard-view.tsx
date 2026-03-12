'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber, formatDuration, formatCurrency, formatPercent } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Activity, Zap, RefreshCw, BookOpen, BarChart3, Shield, Check, Calendar, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import { useToast } from '@/components/ui/use-toast';
import { captureEvent, AnalyticsEvents } from '@/lib/posthog';
import type { ApiKeyInfo } from './dashboard-types';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardKpiRow } from './dashboard-kpi-row';
import { DashboardInsightsSection } from './dashboard-insights-section';
import { DashboardGuardrailsSection } from './dashboard-guardrails-section';
import { DashboardTopIssue } from './dashboard-top-issue';
import { DashboardProviderTable } from './dashboard-provider-table';
import { DashboardRecentFailures } from './dashboard-recent-failures';
import { DashboardEventDetailDialog } from './dashboard-event-detail-dialog';
import { PrefetchDashboardRoutes } from './prefetch-dashboard-routes';

const LazyDashboardCharts = dynamic(
  () => import('./dashboard-charts').then((m) => ({ default: m.DashboardCharts })),
  { ssr: false, loading: () => <ChartSectionSkeleton /> }
);

const LazyOperationDetailDialog = dynamic(
  () => import('./operation-detail-dialog').then((m) => ({ default: m.OperationDetailDialog })),
  { ssr: false }
);

const LazyDashboardOpenIncidents = dynamic(
  () => import('./dashboard-open-incidents').then((m) => ({ default: m.DashboardOpenIncidents })),
  { ssr: false }
);

function ChartSectionSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2" role="status" aria-label="Loading charts">
      <Card>
        <CardHeader>
          <div className="h-5 w-28 rounded bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted/80 animate-pulse mt-1" />
        </CardHeader>
        <CardContent>
          <div className="h-[260px] rounded-lg bg-muted/50 animate-pulse" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-5 w-24 rounded bg-muted animate-pulse" />
          <div className="h-4 w-36 rounded bg-muted/80 animate-pulse mt-1" />
        </CardHeader>
        <CardContent>
          <div className="h-[260px] rounded-lg bg-muted/50 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

async function fetchOverview(projectId: string, range: string) {
  const res = await fetch(`/api/projects/${projectId}/overview?range=${range}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to load dashboard');
  }
  return res.json();
}

async function fetchIntelligence(projectId: string, range: string) {
  const res = await fetch(`/api/projects/${projectId}/intelligence?range=${range}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to load insights');
  }
  return res.json();
}

const STREAM_PREVIEW_LENGTH = 10;

const PRESETS = ['24h', '7d', '30d'] as const;
const PRESET_LABELS: Record<string, string> = { '24h': '24 hours', '7d': '7 days', '30d': '30 days' };

function formatDateForInput(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function DashboardCustomRangePicker({
  projectId,
  workspaceId,
  currentRange,
  retentionDays,
  onApply,
}: {
  projectId: string;
  workspaceId: string;
  currentRange: string;
  retentionDays: number;
  onApply: () => void;
}) {
  const router = useRouter();
  const endDefault = new Date();
  const startDefault = new Date(endDefault);
  startDefault.setDate(startDefault.getDate() - 7);
  const customMatch = currentRange.startsWith('custom:') ? currentRange.slice(7).split(':') : null;
  const [from, setFrom] = useState(customMatch?.[0] ?? formatDateForInput(startDefault));
  const [to, setTo] = useState(customMatch?.[1] ?? formatDateForInput(endDefault));
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return;
    }
    if (fromDate > toDate) {
      setTo(from);
      return;
    }
    const maxStart = new Date(toDate);
    maxStart.setDate(maxStart.getDate() - retentionDays);
    if (fromDate < maxStart) {
      setFrom(formatDateForInput(maxStart));
      return;
    }
    const rangeValue = `custom:${from}:${to}`;
    setOpen(false);
    router.push(`/dashboard/${workspaceId}/${projectId}?range=${encodeURIComponent(rangeValue)}`);
    onApply();
  };

  const isCustom = currentRange.startsWith('custom:');
  const customLabel = isCustom && customMatch?.length === 2
    ? `${customMatch[0]} – ${customMatch[1]}`
    : 'Custom range';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isCustom ? 'default' : 'outline'} size="sm" className="gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {customLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" showClose>
        <DialogHeader>
          <DialogTitle>Custom date range</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="range-from">From</Label>
            <Input
              id="range-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="range-to">To</Label>
            <Input
              id="range-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Data is limited to the last {retentionDays} days for your plan.
          </p>
          <Button onClick={handleApply} className="w-full">
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardView({
  projectId,
  workspaceId,
  range,
  retentionDays: retentionDaysProp,
  project,
}: {
  projectId: string;
  workspaceId: string;
  range: string;
  retentionDays?: number;
  project: { id: string; name: string; apiKeys: ApiKeyInfo[] };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sendingTestEvents, setSendingTestEvents] = useState(false);
  const [justReceivedFirstData, setJustReceivedFirstData] = useState(false);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [ingestKeys, setIngestKeys] = useState(project.apiKeys);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [streamPhase, setStreamPhase] = useState<'idle' | 'streaming' | 'sending' | 'success'>('idle');
  const [streamVisibleCount, setStreamVisibleCount] = useState(0);
  const [justSentTestEvents, setJustSentTestEvents] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<{ provider: string; endpoint: string | null } | null>(null);
  useEffect(() => {
    setIngestKeys(project.apiKeys);
  }, [project.apiKeys]);
  const { data: overviewData, isLoading: overviewLoading, isFetching: overviewFetching, error, refetch, isRefetching } = useQuery({
    queryKey: ['project-overview', projectId, range],
    queryFn: () => fetchOverview(projectId, range),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const hasCalls = (query.state.data?.stats?.totalCalls ?? 0) > 0;
      return hasCalls ? 60_000 : 5000;
    },
  });

  const { data: intelligenceData } = useQuery({
    queryKey: ['project-intelligence', projectId, range],
    queryFn: () => fetchIntelligence(projectId, range),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const hasData = (overviewData?.stats?.totalCalls ?? 0) > 0;

  const { data: eventsData } = useQuery({
    queryKey: ['project-events', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/events?limit=20`);
      if (!res.ok) throw new Error('Failed to load events');
      return res.json();
    },
    enabled: hasData || justSentTestEvents,
    staleTime: 10_000,
    refetchInterval: 15000,
  });
  const recentEvents = eventsData?.events ?? [];

  useEffect(() => {
    if (hasData && justSentTestEvents) setJustSentTestEvents(false);
  }, [hasData, justSentTestEvents]);

  const usage = overviewData?.usage as {
    eventsThisMonth: number;
    limit: number;
    overageEvents?: number;
    providerCount?: number;
    maxProviders?: number;
    planName: string;
    projectedApiCostMonitored: number;
  } | undefined;

  const { data: eventDetail, isLoading: eventDetailLoading } = useQuery({
    queryKey: ['project-event', projectId, selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;
      const res = await fetch(`/api/projects/${projectId}/events/${selectedEventId}`);
      if (!res.ok) return null;
      const j = await res.json();
      return j.event as Record<string, unknown>;
    },
    enabled: !!selectedEventId,
  });

  const { data: operationDetail, isLoading: operationDetailLoading } = useQuery({
    queryKey: ['operation-detail', projectId, selectedOperation?.provider ?? '', selectedOperation?.endpoint ?? null, range],
    queryFn: async () => {
      if (!selectedOperation) return null;
      const params = new URLSearchParams({
        provider: selectedOperation.provider,
        range,
      });
      if (selectedOperation.endpoint != null && selectedOperation.endpoint !== '') {
        params.set('endpoint', selectedOperation.endpoint);
      }
      const res = await fetch(`/api/projects/${projectId}/operations/detail?${params}`);
      if (!res.ok) throw new Error('Failed to load operation');
      return res.json();
    },
    enabled: !!selectedOperation,
  });

  useEffect(() => {
    if (!justReceivedFirstData || !hasData) return;
    const t = setTimeout(() => setJustReceivedFirstData(false), 6000);
    return () => clearTimeout(t);
  }, [justReceivedFirstData, hasData]);

  useEffect(() => {
    if (streamPhase !== 'success') return;
    const t = setTimeout(() => {
      setStreamPhase('idle');
      setStreamVisibleCount(0);
    }, 5000);
    return () => clearTimeout(t);
  }, [streamPhase]);

  // Progressive animation while "sending" is in progress (no blocking)
  useEffect(() => {
    if ((streamPhase !== 'streaming' && streamPhase !== 'sending') || streamVisibleCount >= STREAM_PREVIEW_LENGTH) return;
    const t = setTimeout(() => setStreamVisibleCount((c) => c + 1), 120);
    return () => clearTimeout(t);
  }, [streamPhase, streamVisibleCount]);

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="mt-4 font-medium text-foreground">Couldn’t load dashboard</p>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground text-center max-w-sm">
            If this keeps happening, check your connection and try again in a moment.
          </p>
          <Button
            variant="outline"
            className="mt-6 gap-2"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Loading…' : 'Try again'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Progressive loading: show shell (header + skeleton) immediately so the page frame is visible; data streams in
  const showLoadingShell = !overviewData && (overviewLoading || overviewFetching);
  if (showLoadingShell) {
    const loadingRetentionDays = retentionDaysProp ?? 7;
    const loadingIsFreePlan = loadingRetentionDays <= 7;
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">API overview</h1>
            <span className="text-sm text-muted-foreground animate-pulse">Loading…</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((r) =>
              loadingIsFreePlan && r !== '7d' ? (
                <Button key={r} variant="outline" size="sm" disabled className="opacity-60 cursor-not-allowed" title="Upgrade for more time ranges">
                  {PRESET_LABELS[r]}
                </Button>
              ) : (
                <Link key={r} href={`?range=${r}`}>
                  <Button variant={range === r ? 'default' : 'outline'} size="sm">
                    {PRESET_LABELS[r]}
                  </Button>
                </Link>
              )
            )}
            {loadingIsFreePlan ? (
              <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-60 cursor-not-allowed" title="Upgrade for custom date range">
                <Calendar className="h-3.5 w-3.5" />
                Custom range
              </Button>
            ) : (
              <DashboardCustomRangePicker
                projectId={projectId}
                workspaceId={workspaceId}
                currentRange={range}
                retentionDays={loadingRetentionDays}
                onApply={() => router.refresh()}
              />
            )}
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  const { stats, byProvider, byOperation, timeseries, timeseriesByProvider, recentFailures, recentFailuresFromTestEvents, errorSpikes, topIssue, planLimits, liveEventsLast5Min } = overviewData;
  const insights = intelligenceData?.insights ?? [];
  const projectInsights = intelligenceData?.projectInsights ?? [];
  const guardrails = intelligenceData?.guardrails ?? [];
  const dependencyMap = intelligenceData?.dependencyMap ?? null;
  const insightsLimited = intelligenceData?.insightsLimited ?? true;

  const retentionDays = planLimits?.retentionDays ?? retentionDaysProp ?? 7;
  const isFreePlan = retentionDays <= 7;

  const sendTestEvents = async () => {
    setSendingTestEvents(true);
    setStreamPhase('sending');
    setStreamVisibleCount(0);
    try {
      const res = await fetch(`/api/projects/${projectId}/test-events`, { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Failed to send test events');
      captureEvent(AnalyticsEvents.test_event_sent);
      const created = d.created ?? 10;
      // Fetch event stream immediately so user sees value within ~1s
      const eventsRes = await fetch(`/api/projects/${projectId}/events?limit=20`);
      const eventsJson = eventsRes.ok ? await eventsRes.json().catch(() => ({})) : { events: [] };
      queryClient.setQueryData(['project-events', projectId], eventsJson);
      setJustSentTestEvents(true);
      toast({
        title: 'Events received',
        description: `${created} test events added. Dashboard is updating.`,
      });
      // Invalidate stats/usage so they refetch in background; do NOT await
      queryClient.invalidateQueries({ queryKey: ['project-overview', projectId, range] });
      queryClient.invalidateQueries({ queryKey: ['project-intelligence', projectId, range] });
      queryClient.invalidateQueries({ queryKey: ['project-events', projectId] });
      setJustReceivedFirstData(true);
      captureEvent(AnalyticsEvents.first_event_received);
      setStreamPhase('success');
    } catch (e) {
      setStreamPhase('idle');
      setStreamVisibleCount(0);
      toast({
        title: "Test events couldn't be sent",
        description: e instanceof Error ? e.message : 'Check your connection and try again, or send events from the SDK.',
        variant: 'destructive',
      });
    } finally {
      setSendingTestEvents(false);
    }
  };

  const onRotateKey = async () => {
    if (!confirm('Create a new key and revoke the current one? Apps using the old key will stop working.')) return;
    setRotating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/keys/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyIdToRevoke: ingestKeys[0].id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      const data = await res.json();
      setNewKeyValue(data.key);
      setIngestKeys([{ id: data.id, name: data.name, keyPrefix: data.keyPrefix, lastUsedAt: null, createdAt: new Date().toISOString() }]);
      setKeyRevealed(false);
      toast({ title: 'Key rotated', description: 'Copy your new key above.' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to rotate key', variant: 'destructive' });
    } finally {
      setRotating(false);
    }
  };

  const receivingLiveEvents = typeof liveEventsLast5Min === 'number' && liveEventsLast5Min > 0;

  return (
    <div className="space-y-8">
      <PrefetchDashboardRoutes workspaceId={workspaceId} projectId={projectId} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">API overview</h1>
          {overviewFetching && hasData && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Updating…
            </span>
          )}
          {receivingLiveEvents && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 border border-green-500/30">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              Receiving live events
            </span>
          )}
        </div>
        {hasData && (
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((r) =>
              isFreePlan && r !== '7d' ? (
                <Button
                  key={r}
                  variant="outline"
                  size="sm"
                  disabled
                  className="opacity-60 cursor-not-allowed"
                  title="Upgrade for more time ranges"
                >
                  {PRESET_LABELS[r]}
                </Button>
              ) : (
                <Link key={r} href={`?range=${r}`}>
                  <Button variant={range === r ? 'default' : 'outline'} size="sm">
                    {PRESET_LABELS[r]}
                  </Button>
                </Link>
              )
            )}
            {isFreePlan ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="gap-1.5 opacity-60 cursor-not-allowed"
                title="Upgrade for custom date range"
              >
                <Calendar className="h-3.5 w-3.5" />
                Custom range
              </Button>
            ) : (
              <DashboardCustomRangePicker
                projectId={projectId}
                workspaceId={workspaceId}
                currentRange={range}
                retentionDays={retentionDays}
                onApply={() => router.refresh()}
              />
            )}
          </div>
        )}
      </div>

      {!hasData && (
        <DashboardEmptyState
          projectId={projectId}
          workspaceId={workspaceId}
          sendTestEvents={sendTestEvents}
          sendingTestEvents={sendingTestEvents}
          streamPhase={streamPhase}
          streamVisibleCount={streamVisibleCount}
          recentEvents={recentEvents as { id: string; timestamp: string; provider: string; endpoint: string | null; durationMs: number | null; success: boolean; statusCode: number | null }[]}
          metricsRefreshing={isRefetching}
          setSelectedEventId={setSelectedEventId}
          ingestKeys={ingestKeys}
          newKeyValue={newKeyValue}
          setNewKeyValue={setNewKeyValue}
          keyRevealed={keyRevealed}
          setKeyRevealed={setKeyRevealed}
          rotating={rotating}
          onRotateKey={onRotateKey}
          setIngestKeys={setIngestKeys}
          toast={toast}
        />
      )}

      {hasData && (
        <div className={`space-y-8 ${justReceivedFirstData ? 'animate-dashboard-in' : ''}`}>
          {justReceivedFirstData && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3.5 flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-4 w-4 text-primary" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Dashboard live</p>
                <p className="text-muted-foreground mt-0.5">Your first events are in. Check <strong>What needs attention</strong> and <strong>Insights</strong> below for what to act on.</p>
              </div>
            </div>
          )}
          {usage != null && typeof usage.maxProviders === 'number' && usage.maxProviders >= 0 && (usage.providerCount ?? 0) > usage.maxProviders && byProvider?.length > usage.maxProviders && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3.5 flex items-center gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="font-semibold text-foreground">
                  New API detected: {(byProvider.slice(usage.maxProviders).map((p: { provider: string }) => providerDisplayName(p.provider))).join(', ')}.
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Upgrade to monitor additional APIs.
                </p>
                <Link href={`/dashboard/${workspaceId}/billing`}>
                  <Button variant="outline" size="sm" className="mt-2">Upgrade to Pro</Button>
                </Link>
              </div>
            </div>
          )}
          {usage != null && usage.limit > 0 && usage.eventsThisMonth >= usage.limit * 0.8 && usage.eventsThisMonth < usage.limit && retentionDays > 7 && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3.5 flex items-center gap-3 text-sm text-muted-foreground">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium text-foreground">Approaching your event limit</p>
                <p className="mt-0.5">
                  You&apos;ve used {Math.round((usage.eventsThisMonth / usage.limit) * 100)}% of your included events this period. View usage and overage details on Billing.
                </p>
                <Link href={`/dashboard/${workspaceId}/billing`}>
                  <Button variant="outline" size="sm" className="mt-2">View Billing</Button>
                </Link>
              </div>
            </div>
          )}
          {usage != null && (usage.overageEvents ?? 0) > 0 && retentionDays > 7 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3.5 flex items-center gap-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Over included allowance</p>
                <p className="mt-0.5 opacity-90">
                  {(usage.overageEvents ?? 0).toLocaleString()} events over your plan this period. This overage will appear on your next invoice. View Billing for the exact amount.
                </p>
                <Link href={`/dashboard/${workspaceId}/billing`}>
                  <Button variant="outline" size="sm" className="mt-2">View Billing</Button>
                </Link>
              </div>
            </div>
          )}
          <DashboardKpiRow stats={stats} usage={usage} workspaceId={workspaceId} />

          <LazyDashboardCharts
            timeseries={timeseries}
            timeseriesByProvider={timeseriesByProvider}
            providers={byProvider?.map((p: { provider: string }) => ({ provider: p.provider })) ?? []}
            anomalies={[
              ...(errorSpikes ?? []).map((s: { timestamp: string }) => ({ time: s.timestamp, type: 'error_spike' as const })),
            ]}
          />

          {errorSpikes != null && errorSpikes.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Error spikes
                </CardTitle>
                <CardDescription>Time windows where a provider’s error rate exceeded 10%</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {(errorSpikes as { provider: string; timestamp: string; errorRate: number; calls: number; errors: number }[]).map((spike, i) => {
                    const d = new Date(spike.timestamp);
                    const isHourBucket = range !== '30d';
                    const timeLabel = isHourBucket
                      ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return (
                      <li
                        key={`${spike.provider}-${spike.timestamp}-${i}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-warning/20 bg-muted/10 px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium inline-flex items-center gap-1.5">
                          <ProviderIcon name={spike.provider} size={16} className="shrink-0" />
                          {providerDisplayName(spike.provider)}
                        </span>
                        <span className="text-muted-foreground">
                          Errors spiked at {timeLabel}
                        </span>
                        <span className="tabular-nums text-warning font-medium">
                          {formatPercent(spike.errorRate)} error rate
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {!intelligenceData && hasData ? (
            <Card className="border-border">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading insights and guardrails…</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <DashboardInsightsSection projectInsights={projectInsights} insights={insights} insightsLimited={insightsLimited} workspaceId={workspaceId} />

              <DashboardGuardrailsSection
                projectId={projectId}
                guardrails={guardrails}
                onIncidentCreated={() => queryClient.invalidateQueries({ queryKey: ['project-incidents', projectId] })}
              />
            </>
          )}

          <LazyDashboardOpenIncidents projectId={projectId} />

          {/* Dependency map / reliability map — Pro+ */}
          {planLimits?.dependencyGraph && intelligenceData && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-medium">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Dependency map
                </CardTitle>
                <CardDescription>APIs and operations this project calls — volume, reliability, P95, cost</CardDescription>
              </CardHeader>
              <CardContent>
                {dependencyMap && dependencyMap.providers.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left py-3 px-4 font-medium">Provider</th>
                            <th className="text-right py-3 px-4 font-medium">Calls</th>
                            <th className="text-right py-3 px-4 font-medium">Reliability</th>
                            <th className="text-right py-3 px-4 font-medium">P95</th>
                            <th className="text-right py-3 px-4 font-medium">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dependencyMap.providers as { provider: string; calls: number; reliabilityScore: number; p95Ms: number | null; costUsd: number }[]).map((p) => (
                            <tr key={p.provider} className="border-b border-border/50 last:border-0">
                              <td className="py-3 px-4 font-medium inline-flex items-center gap-2">
                                <ProviderIcon name={p.provider} size={16} className="shrink-0" />
                                {providerDisplayName(p.provider)}
                              </td>
                              <td className="py-3 px-4 text-right tabular-nums">{formatNumber(p.calls)}</td>
                              <td className="py-3 px-4 text-right">
                                <span className={p.reliabilityScore >= 0.95 ? 'text-success' : p.reliabilityScore >= 0.8 ? 'text-warning' : 'text-destructive'}>
                                  {(p.reliabilityScore * 100).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right tabular-nums">{p.p95Ms != null ? formatDuration(p.p95Ms) : '—'}</td>
                              <td className="py-3 px-4 text-right tabular-nums">{p.costUsd > 0 ? formatCurrency(p.costUsd) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">Reliability = 1 − error rate. See Operations table for per-endpoint detail.</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">No traffic in this period. Send events to see your dependency map.</p>
                )}
              </CardContent>
            </Card>
          )}

          {!planLimits?.dependencyGraph && hasData && (
            <Card className="border-border bg-muted/5">
              <CardHeader>
                <CardTitle className="text-base font-medium">Dependency map</CardTitle>
                <CardDescription>See every API and operation with reliability, latency, and cost in one view. Pro and Scale only.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/dashboard/${workspaceId}/billing`}>
                  <Button variant="outline" size="sm" className="font-medium">Unlock dependency map</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {planLimits?.dependencyGraph && !intelligenceData && hasData && (
            <Card className="border-border">
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading dependency map…</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Protection
              </CardTitle>
              <CardDescription>Guardrails tell you when to act. You implement retries and fallbacks in code.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We detect anomalies and surface them above; you add retries, fallbacks, and circuit breakers in your app. <Link href="/docs#control-protection" className="text-primary hover:underline">Docs</Link> for patterns.
              </p>
            </CardContent>
          </Card>

          {recentEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-medium">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Event stream
                </CardTitle>
                <CardDescription>Latest API calls — click Details to inspect</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {(recentEvents as { id: string; timestamp: string; provider: string; endpoint: string | null; durationMs: number | null; success: boolean; statusCode: number | null; source?: string }[]).map((ev) => {
                    const statusClass = ev.statusCode != null
                      ? ev.statusCode >= 500
                        ? 'text-destructive'
                        : ev.statusCode >= 400
                          ? 'text-warning'
                          : 'text-success'
                      : ev.success
                        ? 'text-success'
                        : 'text-destructive';
                    const statusLabel = ev.success
                      ? '✓ success'
                      : (ev.statusCode != null ? `${ev.statusCode} error` : 'error');
                    const isDemo = ev.source === 'demo';
                    return (
                      <li key={ev.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/50 bg-muted/10 hover:bg-muted/20 px-3 py-2 text-sm transition-colors">
                        <span className="shrink-0">
                          {ev.success ? (
                            <Check className="h-4 w-4 text-success" aria-hidden />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" aria-hidden />
                          )}
                        </span>
                        <ProviderIcon name={ev.provider} size={16} className="shrink-0" />
                        <span className="font-medium min-w-[80px]">{providerDisplayName(ev.provider)}</span>
                        <span className="text-muted-foreground truncate max-w-[140px] font-mono text-xs">{ev.endpoint ?? '—'}</span>
                        {isDemo && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border bg-surface-elevated text-muted-foreground" title="Does not count toward usage limits">Demo</span>
                        )}
                        <span className="tabular-nums font-medium px-1.5 py-0.5 rounded bg-muted/60 text-xs">
                          {ev.durationMs != null ? formatDuration(ev.durationMs) : '—'}
                        </span>
                        <span className={`tabular-nums text-xs font-medium ${statusClass}`}>
                          {statusLabel}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground ml-auto"
                          onClick={() => setSelectedEventId(ev.id)}
                        >
                          Details
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          <DashboardProviderTable byProvider={byProvider} />

          <Card>
            <CardHeader>
              <CardTitle className="font-medium">Operations</CardTitle>
              <CardDescription>Per-endpoint metrics — click a row for latency, failures, cost</CardDescription>
            </CardHeader>
            <CardContent>
              {byOperation != null && byOperation.length > 0 ? (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-3 px-4 font-medium">Operation</th>
                        <th className="text-left py-3 px-4 font-medium">Provider</th>
                        <th className="text-right py-3 px-4 font-medium">Calls</th>
                        <th className="text-right py-3 px-4 font-medium">P95</th>
                        <th className="text-right py-3 px-4 font-medium">Error rate</th>
                        <th className="text-right py-3 px-4 font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(byOperation as { operation: string; provider: string; endpoint: string | null; calls: number; errorRate: number; p95Ms: number | null; costUsd: number }[]).map((row) => (
                        <tr
                          key={`${row.provider}\0${row.endpoint ?? ''}`}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedOperation({ provider: row.provider, endpoint: row.endpoint })}
                        >
                          <td className="py-3 px-4 font-medium font-mono text-foreground">{row.operation}</td>
                          <td className="py-3 px-4 inline-flex items-center gap-2">
                            <ProviderIcon name={row.provider} size={16} className="shrink-0" />
                            {providerDisplayName(row.provider)}
                          </td>
                          <td className="text-right py-3 px-4 tabular-nums">{formatNumber(row.calls)}</td>
                          <td className="text-right py-3 px-4 tabular-nums">
                            {row.p95Ms != null ? formatDuration(row.p95Ms) : '—'}
                          </td>
                          <td className="text-right py-3 px-4 tabular-nums">{formatPercent(row.errorRate)}</td>
                          <td className="text-right py-3 px-4 tabular-nums">{formatCurrency(row.costUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No operation data in this range. Send events with <code className="text-xs bg-muted px-1 rounded">endpoint</code> set, or try 24h.</p>
              )}
            </CardContent>
          </Card>

          <DashboardRecentFailures recentFailures={recentFailures} fromTestEvents={recentFailuresFromTestEvents} onSelectEvent={setSelectedEventId} />

          <DashboardEventDetailDialog
            open={!!selectedEventId}
            onOpenChange={(open) => !open && setSelectedEventId(null)}
            eventDetail={eventDetail}
            eventDetailLoading={eventDetailLoading}
          />

          {selectedOperation && (
            <LazyOperationDetailDialog
              open={!!selectedOperation}
              onOpenChange={(open) => !open && setSelectedOperation(null)}
              selectedOperation={selectedOperation}
              operationDetail={operationDetail}
              operationDetailLoading={operationDetailLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded bg-muted animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading overview…</p>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-20 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 rounded bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-28 rounded bg-muted animate-pulse" />
            <div className="h-4 w-40 rounded bg-muted/80 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-[260px] rounded-lg bg-muted/50 animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
            <div className="h-4 w-36 rounded bg-muted/80 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-[260px] rounded-lg bg-muted/50 animate-pulse" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted/80 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-48 rounded-lg bg-muted/30 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
