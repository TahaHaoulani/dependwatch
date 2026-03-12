import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { resolvePlanFromPriceId } from '@/lib/config';
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache';
import { invalidateWorkspaceCache } from '@/lib/cache/invalidate';

const STRIPE_IDEMPOTENCY_TTL_SEC = 86400; // 24h

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }
  try {
    const { validateStripeConfig } = await import('@/lib/config');
    validateStripeConfig();
  } catch (e) {
    console.error('[Stripe webhook] Config validation failed', e);
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.error('[Stripe webhook] signature verification failed', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const idempotencyKey = cacheKey(['idempotency', 'stripe', event.id]);
  const alreadyProcessed = await cacheGet(idempotencyKey);
  if (alreadyProcessed === '1') {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const planId = session.metadata?.planId ?? 'builder';
        const subId = session.subscription as string;
        if (!workspaceId) break;
        const subscription = await stripe.subscriptions.retrieve(subId);
        await prisma.subscription.upsert({
          where: { workspaceId },
          create: {
            workspaceId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subId,
            stripePriceId: subscription.items.data[0]?.price.id ?? null,
            status: 'active',
            planId,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          update: {
            stripeSubscriptionId: subId,
            stripePriceId: subscription.items.data[0]?.price.id ?? undefined,
            status: 'active',
            planId,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        await invalidateWorkspaceCache(workspaceId).catch(() => {});
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const existing = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id },
          select: { workspaceId: true, planId: true },
        });
        if (!existing) break;
        const isDeleted = event.type === 'customer.subscription.deleted';
        const priceId = sub.items.data[0]?.price?.id;
        const resolvedPlan = resolvePlanFromPriceId(priceId);
        if (!isDeleted && priceId && resolvedPlan == null) {
          console.warn('[Stripe webhook] Unknown priceId:', priceId, '- keeping existing planId:', existing.planId);
        }
        const planId = isDeleted
          ? 'free'
          : (resolvedPlan ?? (sub.metadata?.planId as string | undefined) ?? existing.planId ?? 'free');
        const status = isDeleted
          ? 'canceled'
          : sub.status === 'active' || sub.status === 'trialing'
            ? 'active'
            : sub.status === 'past_due' || sub.status === 'unpaid'
              ? 'past_due'
              : 'canceled';
        await prisma.subscription.update({
          where: { workspaceId: existing.workspaceId },
          data: {
            status,
            planId,
            stripeSubscriptionId: isDeleted ? null : sub.id,
            stripePriceId: isDeleted ? null : (sub.items.data[0]?.price?.id ?? undefined),
            currentPeriodStart: isDeleted ? null : new Date(sub.current_period_start * 1000),
            currentPeriodEnd: isDeleted ? null : new Date(sub.current_period_end * 1000),
          },
        });
        await invalidateWorkspaceCache(existing.workspaceId).catch(() => {});
        break;
      }
      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
          console.info('[Stripe webhook] invoice.finalized', {
            invoiceId: invoice.id,
            subscriptionId: invoice.subscription,
            amountDue: invoice.amount_due,
            periodEnd: invoice.period_end,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[Stripe webhook]', event.type, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  await cacheSet(idempotencyKey, '1', STRIPE_IDEMPOTENCY_TTL_SEC);
  return NextResponse.json({ received: true });
}
