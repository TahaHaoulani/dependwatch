'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPercent } from '@/lib/utils';
import { Zap, ArrowRight } from 'lucide-react';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import type { ProjectInsight } from './dashboard-types';
import { operationLabel } from './dashboard-types';

type GenericInsight = { type: string; title: string; description: string; provider?: string; value?: string };

export function DashboardInsightsSection({
  projectInsights,
  insights,
  insightsLimited,
  workspaceId,
}: {
  projectInsights: ProjectInsight[] | null | undefined;
  insights: GenericInsight[] | null | undefined;
  insightsLimited?: boolean;
  workspaceId?: string;
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium">
          <Zap className="h-4 w-4 text-muted-foreground" />
          API Intelligence
        </CardTitle>
        <CardDescription>Insights from your traffic — cost drivers, reliability, performance</CardDescription>
      </CardHeader>
      <CardContent>
        {projectInsights != null && projectInsights.length > 0 ? (
          <ul className="space-y-2.5">
            {projectInsights.map((insight, i) => (
              <li
                key={`${insight.type}-${'provider' in insight ? insight.provider : ''}-${'endpoint' in insight ? insight.endpoint ?? '' : ''}-${i}`}
                className="rounded-lg border border-border/50 bg-muted/5 px-3 py-2.5 text-sm"
              >
                {insight.type === 'cost_driver' && (
                  <>
                    <p className="font-medium text-foreground">Cost · {providerDisplayName(insight.provider)}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {Math.round(insight.share * 100)}% of monitored spend in this period.
                    </p>
                  </>
                )}
                {insight.type === 'cost_driver_operation' && (
                  <>
                    <p className="font-medium text-foreground font-mono text-xs">Cost · {operationLabel(insight.provider, insight.endpoint)}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {Math.round(insight.share * 100)}% of projected spend.
                    </p>
                  </>
                )}
                {insight.type === 'reliability_issue' && (
                  <>
                    <p className="font-medium text-foreground">Reliability · {operationLabel(insight.provider, insight.endpoint)}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Error rate {formatPercent(insight.errorRate)} in this period.
                    </p>
                  </>
                )}
                {insight.type === 'slow_endpoint' && (
                  <>
                    <p className="font-medium text-foreground font-mono text-xs">Performance · {operationLabel(insight.provider, insight.endpoint)}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      P95 latency {(insight.p95Ms / 1000).toFixed(1)}s.
                    </p>
                  </>
                )}
                {insight.type === 'cost_spike' && (
                  <>
                    <p className="font-medium text-foreground">Cost spike</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Usage +{insight.percentIncrease}% vs previous period.
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : insights != null && insights.length > 0 ? (
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li
                key={`${insight.type}-${insight.provider ?? ''}-${i}`}
                className="rounded-lg border border-border/50 bg-muted/5 px-3 py-2 text-sm"
              >
                <span className="font-medium">{insight.title}</span>
                <span className="text-muted-foreground ml-1">{insight.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No insights yet. Send events or widen the time range — we’ll surface cost drivers, reliability issues, and slow endpoints automatically.
            </p>
            {workspaceId && (
              <Link href={`/dashboard/${workspaceId}/billing`}>
                <Button variant="outline" size="sm" className="gap-1.5 mt-1 font-medium">
                  Upgrade for full API Intelligence <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
      {insightsLimited && (projectInsights != null && projectInsights.length > 0 || insights != null && insights.length > 0) && workspaceId && (
        <div className="border-t border-border px-6 py-3 bg-muted/10 rounded-b-lg">
          <p className="text-xs text-muted-foreground text-center">
            Free: sample insights. <Link href={`/dashboard/${workspaceId}/billing`} className="text-primary font-medium hover:underline">Upgrade to Pro</Link> for full intelligence, 90-day history, and operation-level analytics.
          </p>
        </div>
      )}
    </Card>
  );
}
