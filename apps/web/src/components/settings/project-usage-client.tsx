'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Usage = {
  eventsThisMonth: number;
  limit: number;
  overageEvents: number;
  providerCount: number;
  maxProviders: number;
  planId: string;
  planName: string;
  projectedApiCostMonitored: number;
  monitoredEndpoints: number;
};

export function ProjectUsageClient({ usage, workspaceId }: { usage: Usage; workspaceId?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
        <CardDescription>
          Workspace plan: {usage.planName}. Usage is across all projects in this workspace. Only real API events count; test events are excluded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Events this period</p>
            <p className="text-2xl font-semibold">
              {usage.eventsThisMonth.toLocaleString()} / {usage.limit === -1 ? '∞' : usage.limit.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">APIs monitored</p>
            <p className="text-2xl font-semibold">
              {usage.providerCount} {usage.maxProviders === -1 ? '' : `/ ${usage.maxProviders}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monitored endpoints</p>
            <p className="text-2xl font-semibold">{usage.monitoredEndpoints}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Projected API cost (monitored)</p>
            <p className="text-2xl font-semibold">${usage.projectedApiCostMonitored.toFixed(2)}</p>
          </div>
        </div>
        {usage.overageEvents > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">
              {usage.overageEvents.toLocaleString()} events over your included allowance this period.
            </p>
            <p className="mt-1 text-muted-foreground">
              Overage is billed at period end. See <Link href={workspaceId ? `/dashboard/${workspaceId}/billing` : '#'} className="underline hover:text-foreground">Billing</Link> for your workspace&apos;s usage and estimated overage charge.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
