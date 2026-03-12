/**
 * Overage billing: create Stripe invoice items for workspace overage in a billing period.
 * Idempotent: one BillingOverageRecord per (workspaceId, periodStart). Safe to run repeatedly.
 * Double-bill prevention: record created before Stripe call; unique constraint + recovery path.
 */

import { prisma } from './db';
import { getStripe } from './stripe';
import { getWorkspaceBillableUsageForPeriod } from './billing-usage';
import { acquireLock, releaseLock } from './locks';
import type { PlanId } from './config';

const PAID_PLANS: PlanId[] = ['builder', 'startup'];

export type OverageBillingResult = {
  workspaceId: string;
  periodStart: Date;
  created: boolean;
  overageEvents: number;
  amountCents: number;
  error?: string;
};

function periodLockKey(workspaceId: string, periodStart: Date): string {
  return `overage:${workspaceId}:${periodStart.getTime()}`;
}

/**
 * Ensure overage for this workspace/period is recorded and (if billable) has a Stripe invoice item.
 * Creates at most one BillingOverageRecord per (workspaceId, periodStart).
 * Free plan: we do not create Stripe items. Handles P2002 (race) and recovers missing Stripe item under lock.
 */
export async function ensureOverageBillingForPeriod(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date,
  planId: PlanId,
  stripeCustomerId: string | null
): Promise<OverageBillingResult> {
  const usage = await getWorkspaceBillableUsageForPeriod(
    workspaceId,
    periodStart,
    periodEnd,
    planId
  );

  let existing = await prisma.billingOverageRecord.findUnique({
    where: {
      workspaceId_periodStart: { workspaceId, periodStart },
    },
  });

  if (existing) {
    // Recovery: record exists but Stripe item was never created (e.g. previous run failed after create)
    if (
      existing.amountCents > 0 &&
      !existing.stripeInvoiceItemId &&
      stripeCustomerId &&
      PAID_PLANS.includes(planId)
    ) {
      const lockKey = periodLockKey(workspaceId, periodStart);
      const acquired = await acquireLock(lockKey);
      if (acquired) {
        try {
          const again = await prisma.billingOverageRecord.findUnique({
            where: { workspaceId_periodStart: { workspaceId, periodStart } },
          });
          if (again && again.amountCents > 0 && !again.stripeInvoiceItemId) {
            const stripe = getStripe();
            const item = await stripe.invoiceItems.create({
              customer: stripeCustomerId,
              amount: again.amountCents,
              currency: 'usd',
              description: `Overage: ${again.overageEvents.toLocaleString()} events over included allowance (${(again.amountCents / 100).toFixed(2)} USD)`,
            });
            await prisma.billingOverageRecord.update({
              where: { id: again.id },
              data: { stripeInvoiceItemId: item.id },
            });
          }
        } finally {
          await releaseLock(lockKey);
        }
      }
      existing = await prisma.billingOverageRecord.findUnique({
        where: { workspaceId_periodStart: { workspaceId, periodStart } },
      }) ?? existing;
    }
    return {
      workspaceId,
      periodStart,
      created: false,
      overageEvents: existing.overageEvents,
      amountCents: existing.amountCents,
    };
  }

  // Create record first so we never double-bill (even if Stripe call fails we can retry via recovery)
  let record: { id: string; overageEvents: number; amountCents: number };
  try {
    record = await prisma.billingOverageRecord.create({
      data: {
        workspaceId,
        periodStart,
        periodEnd,
        overageEvents: usage.overageEvents,
        amountCents: usage.amountCents,
      },
    });
  } catch (err: unknown) {
    const isUniqueViolation =
      typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002';
    if (isUniqueViolation) {
      const refetched = await prisma.billingOverageRecord.findUnique({
        where: { workspaceId_periodStart: { workspaceId, periodStart } },
      });
      if (refetched) {
        return {
          workspaceId,
          periodStart,
          created: false,
          overageEvents: refetched.overageEvents,
          amountCents: refetched.amountCents,
        };
      }
    }
    throw err;
  }

  if (usage.amountCents > 0 && stripeCustomerId && PAID_PLANS.includes(planId)) {
    try {
      const stripe = getStripe();
      const item = await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        amount: usage.amountCents,
        currency: 'usd',
        description: `Overage: ${usage.overageEvents.toLocaleString()} events over included allowance (${(usage.amountCents / 100).toFixed(2)} USD)`,
      });
      await prisma.billingOverageRecord.update({
        where: { id: record.id },
        data: { stripeInvoiceItemId: item.id },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[overage-billing] Stripe invoice item failed', { workspaceId, periodStart, message });
      return {
        workspaceId,
        periodStart,
        created: true,
        overageEvents: usage.overageEvents,
        amountCents: usage.amountCents,
        error: message,
      };
    }
  }

  return {
    workspaceId,
    periodStart,
    created: true,
    overageEvents: usage.overageEvents,
    amountCents: usage.amountCents,
  };
}

/**
 * Run overage billing for all active paid subscriptions whose current period is about to end or has ended.
 * Call from cron (e.g. daily or every 6h). For each subscription we ensure one record per period;
 * we typically run when periodEnd is within the next 24h so the invoice item is attached to the upcoming renewal invoice.
 */
export async function runOverageBillingForEligibleSubscriptions(options?: {
  /** Only process periods ending within this many ms from now (default 24h) */
  periodEndWithinMs?: number;
}): Promise<OverageBillingResult[]> {
  const periodEndWithinMs = options?.periodEndWithinMs ?? 7 * 24 * 60 * 60 * 1000; // default 7 days so daily cron catches all
  const now = new Date();
  const cutoff = new Date(now.getTime() + periodEndWithinMs);

  // Process subscriptions whose period ends in the next window (invoice item is added to next renewal)
  const subscriptions = await prisma.subscription.findMany({
    where: {
      planId: { in: PAID_PLANS },
      status: 'active',
      stripeCustomerId: { not: null },
      currentPeriodEnd: { gt: now, lte: cutoff },
      currentPeriodStart: { not: null },
    },
    select: {
      workspaceId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      planId: true,
      stripeCustomerId: true,
    },
  });

  const results: OverageBillingResult[] = [];
  for (const sub of subscriptions) {
    const periodStart = sub.currentPeriodStart!;
    const periodEnd = sub.currentPeriodEnd!;
    const result = await ensureOverageBillingForPeriod(
      sub.workspaceId,
      periodStart,
      periodEnd,
      sub.planId as PlanId,
      sub.stripeCustomerId
    );
    results.push(result);
  }
  return results;
}
