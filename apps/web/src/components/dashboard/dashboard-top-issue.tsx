'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import type { TopIssue } from '@/lib/analytics';

export function DashboardTopIssue({
  topIssue,
  workspaceId,
}: {
  topIssue: TopIssue | null | undefined;
  workspaceId: string;
}) {
  if (topIssue == null) return null;

  const isProblem = topIssue.kind === 'reliability' || topIssue.kind === 'latency';
  const icon = isProblem ? (
    <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
  ) : (
    <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
  );

  return (
    <Card
      className={
        isProblem
          ? 'border-warning/40 bg-warning/5'
          : 'border-border bg-muted/5'
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {icon}
          {isProblem ? 'What needs attention' : 'Top insight'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-baseline gap-2">
          {topIssue.kind !== 'cost' && (
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <ProviderIcon name={topIssue.provider} size={18} className="shrink-0" />
              <span className="font-medium">{providerDisplayName(topIssue.provider)}</span>
              {topIssue.kind === 'latency' && topIssue.endpoint && (
                <span className="text-muted-foreground font-mono text-sm">{topIssue.endpoint}</span>
              )}
            </span>
          )}
          <span className="text-sm font-medium text-foreground">{topIssue.message}</span>
        </div>
      </CardContent>
    </Card>
  );
}
