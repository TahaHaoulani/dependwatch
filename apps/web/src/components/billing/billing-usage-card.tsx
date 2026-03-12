'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type BillingUsageCardProps = {
  billableEvents: number;
  includedEvents: number;
  overageEvents: number;
  amountCents: number;
  periodStart: string;
  periodEnd: string;
  planName: string;
  isPaidPlan: boolean;
};

export function BillingUsageCard({
  billableEvents,
  includedEvents,
  overageEvents,
  amountCents,
  periodStart,
  periodEnd,
  planName,
  isPaidPlan,
}: BillingUsageCardProps) {
  const periodLabel = isPaidPlan ? 'This billing period' : 'This month';
  const periodRange = `${new Date(periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const overageRate = planName === 'Pro' ? '$5' : '$3';

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Usage</CardTitle>
        <CardDescription>
          {periodLabel}: {periodRange}. Only real API events count; test/demo events are excluded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Included in plan</span>
          <span className="tabular-nums font-medium">{includedEvents.toLocaleString()} events</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Used</span>
          <span className="tabular-nums font-medium">{billableEvents.toLocaleString()} events</span>
        </div>
        {overageEvents > 0 ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Over included</span>
              <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
                {overageEvents.toLocaleString()} events
              </span>
            </div>
            {isPaidPlan && amountCents > 0 && (
              <>
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">Overage on next invoice</span>
                  <span className="tabular-nums font-semibold">${(amountCents / 100).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This amount will be added to your next Stripe invoice. {planName} overage: {overageRate} per 100k events.
                </p>
              </>
            )}
            {!isPaidPlan && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                Free plan has a hard cap. Upgrade to Pro or Scale to allow overage and pay per 100k events.
              </p>
            )}
          </>
        ) : (
          <>
            {isPaidPlan && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                Within included allowance. If you exceed it, overage is billed at {overageRate} per 100k events on your next invoice.
              </p>
            )}
            {!isPaidPlan && billableEvents >= includedEvents && includedEvents > 0 && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                At your plan limit. New events may be sampled. Upgrade for a higher allowance and overage billing.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
