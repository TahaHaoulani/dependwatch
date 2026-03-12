'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { captureEvent, AnalyticsEvents } from '@/lib/posthog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PLANS } from '@/lib/stripe';

export function BillingClient({
  workspaceId,
  currentPlanId,
  stripePriceBuilder,
  stripePriceStartup,
  success = false,
}: {
  workspaceId: string;
  currentPlanId: string;
  stripePriceBuilder?: string;
  stripePriceStartup?: string;
  success?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const checkoutCompletedReported = useRef(false);

  useEffect(() => {
    if (success) router.refresh();
  }, [success, router]);

  useEffect(() => {
    if (success && !checkoutCompletedReported.current) {
      checkoutCompletedReported.current = true;
      captureEvent(AnalyticsEvents.checkout_completed);
    }
  }, [success]);

  const startCheckout = async (planId: string) => {
    setLoading(planId);
    captureEvent(AnalyticsEvents.checkout_started, { plan_id: planId });
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: 'Couldn’t start checkout',
          description: data.error ?? 'Check your connection and try again.',
          variant: 'destructive',
        });
        return;
      }
      if (data.url) window.location.href = data.url;
      else
        toast({
          title: 'Checkout didn’t open',
          description: 'Please try again or contact support if it persists.',
          variant: 'destructive',
        });
    } catch (e) {
      toast({
        title: 'Couldn’t start checkout',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {currentPlanId === 'free' && stripePriceBuilder && (
        <div className="space-y-2">
          <Button
            loading={loading === 'builder'}
            onClick={() => startCheckout('builder')}
          >
            {loading === 'builder' ? 'Opening checkout…' : `Upgrade to ${PLANS.builder.name} — $${PLANS.builder.priceMonthly}/mo`}
          </Button>
          <p className="text-xs text-muted-foreground">
            100k events included · 10 APIs · 90-day retention · Overage: $5 per 100k events
          </p>
        </div>
      )}
      {(currentPlanId === 'free' || currentPlanId === 'builder') && stripePriceStartup && (
        <div className="space-y-2">
          <Button
            variant={currentPlanId === 'builder' ? 'default' : 'outline'}
            loading={loading === 'startup'}
            onClick={() => startCheckout('startup')}
          >
            {loading === 'startup' ? 'Opening checkout…' : `Upgrade to ${PLANS.startup.name} — $${PLANS.startup.priceMonthly}/mo`}
          </Button>
          {currentPlanId === 'builder' && (
            <p className="text-xs text-muted-foreground">
              1M events included · Unlimited APIs · 365-day retention · Overage: $3 per 100k events
            </p>
          )}
        </div>
      )}
      {(currentPlanId === 'builder' || currentPlanId === 'startup') && (
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Invoices are sent by Stripe at the end of each billing period. Overage (if any) is included on the same invoice.
        </p>
      )}
      {currentPlanId !== 'free' && !stripePriceBuilder && !stripePriceStartup && (
        <p className="text-sm text-muted-foreground">Billing is not fully configured. Contact support to change your plan.</p>
      )}
    </div>
  );
}
