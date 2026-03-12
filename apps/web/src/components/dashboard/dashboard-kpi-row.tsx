'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber, formatDuration, formatCurrency, formatPercent } from '@/lib/utils';
import { AlertCircle, TrendingUp, DollarSign, HelpCircle, BarChart3, CreditCard } from 'lucide-react';

const COST_TOOLTIP =
  'Projected cost is calculated from:\n• number of API calls\n• estimated cost per call\n• current usage trend';

type Stats = {
  totalCalls: number;
  avgLatencyMs: number | null;
  errorRate: number;
  projectedMonthlyCostUsd?: number;
};

type Usage = {
  eventsThisMonth: number;
  limit: number;
  overageEvents?: number;
  providerCount?: number;
  maxProviders?: number;
  planName: string;
  projectedApiCostMonitored?: number;
  hasDemoEvents?: boolean;
};

function ProgressBar({ value, max, atLimit }: { value: number; max: number; atLimit?: boolean }) {
  const pct = max <= 0 ? 0 : Math.min(1, value / max);
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${atLimit ? 'bg-destructive' : 'bg-primary'}`}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}

export function DashboardKpiRow({
  stats,
  usage,
  workspaceId,
}: {
  stats: Stats;
  usage: Usage | null | undefined;
  workspaceId: string;
}) {
  const isFree = usage?.planName === 'Free';
  const eventsAtLimit = usage != null && usage.limit > 0 && usage.eventsThisMonth >= usage.limit;
  const eventsApproachingLimit =
    usage != null && usage.limit > 0 && usage.limit < 1_000_000 && usage.eventsThisMonth >= usage.limit * 0.8 && usage.eventsThisMonth < usage.limit;
  const providersAtLimit =
    usage != null &&
    typeof usage.maxProviders === 'number' &&
    usage.maxProviders >= 0 &&
    (usage.providerCount ?? 0) >= usage.maxProviders;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatNumber(stats.totalCalls)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {stats.avgLatencyMs != null ? formatDuration(stats.avgLatencyMs) : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Error rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatPercent(stats.errorRate)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Projected monthly cost
              <span title={COST_TOOLTIP} aria-label="How projected cost is calculated">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </span>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(stats.projectedMonthlyCostUsd ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From selected period</p>
          </CardContent>
        </Card>
      </div>

      {usage != null && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Usage this month
            </CardTitle>
            <span className="text-xs text-muted-foreground">{usage.planName}</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">Events</span>
                <span className="text-sm tabular-nums">
                  {formatNumber(usage.eventsThisMonth)} / {usage.limit >= 1_000_000 ? `${usage.limit / 1_000_000}M` : formatNumber(usage.limit)}
                </span>
              </div>
              <ProgressBar value={usage.eventsThisMonth} max={usage.limit} atLimit={eventsAtLimit} />
              {eventsApproachingLimit && !eventsAtLimit && (
                <p className="text-xs text-muted-foreground">
                  Approaching your event limit ({Math.round((usage.eventsThisMonth / usage.limit) * 100)}% used). <Link href={`/dashboard/${workspaceId}/billing`} className="underline hover:text-foreground">View Billing</Link>
                </p>
              )}
              {eventsAtLimit && isFree && (
                <p className="text-xs text-warning">
                  At your 10,000 event limit. New events may be sampled. Upgrade for a higher allowance.
                </p>
              )}
              {eventsAtLimit && !isFree && (usage.overageEvents ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Over included allowance. Overage is billed at period end. <Link href={`/dashboard/${workspaceId}/billing`} className="underline hover:text-foreground">View Billing</Link>
                </p>
              )}
            </div>

            {typeof usage.maxProviders === 'number' && usage.maxProviders >= 0 && (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">APIs monitored</span>
                  <span className="text-sm tabular-nums">
                    {(usage.providerCount ?? 0)} / {usage.maxProviders}
                    {providersAtLimit ? ' (limit reached)' : ''}
                  </span>
                </div>
                <ProgressBar value={usage.providerCount ?? 0} max={usage.maxProviders} atLimit={providersAtLimit} />
                {providersAtLimit && (
                  <p className="text-xs text-warning">
                    You&apos;ve reached the API monitoring limit for the Free plan.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-muted-foreground">API spend monitored</span>
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(usage.projectedApiCostMonitored ?? 0)}
              </span>
            </div>

            {usage.hasDemoEvents && (
              <p className="text-xs text-muted-foreground rounded-md bg-muted/40 border border-border/50 px-2 py-1.5">
                Demo events generated to illustrate monitoring. They do not count toward usage limits.
              </p>
            )}

            {isFree && (
              <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-3">
                <p className="text-sm font-medium text-foreground">Upgrade to Pro</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>100k events included · 10 APIs · 90-day retention</li>
                  <li>Slack alerts and dependency map</li>
                </ul>
                <Link href={`/dashboard/${workspaceId}/billing`} className="mt-2 block">
                  <Button size="sm" className="w-full sm:w-auto gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Upgrade to Pro
                  </Button>
                </Link>
              </div>
            )}

            {!isFree && (
              <Link
                href={`/dashboard/${workspaceId}/billing`}
                className="text-xs text-muted-foreground hover:text-foreground inline-block"
              >
                View usage &amp; invoices →
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
