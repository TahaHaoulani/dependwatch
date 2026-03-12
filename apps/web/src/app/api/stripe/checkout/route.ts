import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById, ensureWorkspaceAdmin } from '@/lib/workspace';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const planId = body.planId as string;
  const workspaceId = body.workspaceId as string;
  if (!workspaceId || !planId || !['builder', 'startup'].includes(planId)) {
    return NextResponse.json({ error: 'Invalid plan or workspace' }, { status: 400 });
  }

  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await ensureWorkspaceAdmin(workspaceId, session.user.id);
  } catch {
    return NextResponse.json({ error: 'Only owners and admins can manage billing' }, { status: 403 });
  }

  const priceId =
    planId === 'builder'
      ? process.env.STRIPE_PRICE_BUILDER?.trim()
      : process.env.STRIPE_PRICE_STARTUP?.trim();
  if (!priceId || !process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 500 });
  }

  const { getStripe } = await import('@/lib/stripe');
  const stripe = getStripe();

  let customerId = workspace.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      metadata: { workspaceId },
    });
    customerId = customer.id;
    const { prisma } = await import('@/lib/db');
    await prisma.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        stripeCustomerId: customerId,
        status: 'active',
        planId: 'free',
      },
      update: { stripeCustomerId: customerId },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/${workspaceId}/billing?success=1`,
    cancel_url: `${baseUrl}/dashboard/${workspaceId}/billing?canceled=1`,
    metadata: { workspaceId, planId },
    subscription_data: { metadata: { workspaceId, planId } },
  });

  return NextResponse.json({ url: checkout.url });
}
