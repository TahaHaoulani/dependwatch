import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';
import { PLANS } from '@/lib/stripe';
import { getPlanCapabilities } from '@/lib/pricing-capabilities';
import { getWorkspaceBillableUsageForPeriod } from '@/lib/billing-usage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BillingClient } from '@/components/billing/billing-client';
import { BillingUsageCard } from '@/components/billing/billing-usage-card';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { PlanId } from '@/lib/config';

export default async function WorkspaceBillingSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const { workspaceId } = await params;
  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) redirect('/onboarding');

  const subscription = workspace.subscription;
  const planId = (subscription?.planId ?? 'free') as keyof typeof PLANS;
  const plan = PLANS[planId] ?? PLANS.free;
  const capabilities = getPlanCapabilities(planId);
  const { success, canceled } = await searchParams;

  const now = new Date();
  const periodStart = subscription?.currentPeriodStart ?? startOfMonth(now);
  const periodEnd = subscription?.currentPeriodEnd ?? endOfMonth(now);
  const billingUsage = await getWorkspaceBillableUsageForPeriod(
    workspaceId,
    periodStart,
    periodEnd,
    planId as PlanId
  );

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your plan, usage for this period, and overage (if any) appear below. Invoices are generated at the end of each billing cycle.
      </p>
      {success === '1' && (
        <div className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-200">
          <p className="font-medium">Plan updated.</p>
          <p className="mt-0.5 text-muted-foreground">Your new limits are active. You can add more alert rules, Slack webhooks, or use the dependency map and custom date range from the dashboard.</p>
        </div>
      )}
      {canceled === '1' && (
        <div className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Checkout canceled.</p>
          <p className="mt-0.5">No charges were made. You can upgrade anytime using the buttons below.</p>
        </div>
      )}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            {plan.name} — {plan.priceMonthly === 0 ? 'Free forever' : `$${plan.priceMonthly}/month`}
            {plan.priceMonthly > 0 && ' · Invoices at period end'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>{plan.providers === -1 ? 'Unlimited' : plan.providers} APIs monitored</li>
            <li>{plan.retentionDays}-day event retention</li>
            <li>Alert rules: {capabilities.maxAlertRules === -1 ? 'Unlimited' : capabilities.maxAlertRules} · Slack webhooks: {capabilities.maxSlackWebhooks === -1 ? 'Unlimited' : capabilities.maxSlackWebhooks}</li>
          </ul>
          <BillingClient
            workspaceId={workspaceId}
            currentPlanId={planId}
            stripePriceBuilder={process.env.STRIPE_PRICE_BUILDER}
            stripePriceStartup={process.env.STRIPE_PRICE_STARTUP}
            success={success === '1'}
          />
        </CardContent>
      </Card>
      <BillingUsageCard
        billableEvents={billingUsage.billableEvents}
        includedEvents={billingUsage.includedEvents}
        overageEvents={billingUsage.overageEvents}
        amountCents={billingUsage.amountCents}
        periodStart={billingUsage.periodStart.toISOString()}
        periodEnd={billingUsage.periodEnd.toISOString()}
        planName={plan.name}
        isPaidPlan={planId === 'builder' || planId === 'startup'}
      />
    </>
  );
}
