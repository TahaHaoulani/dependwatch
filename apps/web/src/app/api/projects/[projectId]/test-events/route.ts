import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getPlanLimits } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { ingestEventsForProject, getSampleTestEvents } from '@/lib/ingest-service';
import type { PlanId } from '@/lib/stripe';

/**
 * Creates a small set of real test/demo events for the project so new users
 * can see the dashboard populate without running the SDK. Used by the
 * "Send test event" empty-state CTA. Uses the same ingestion path as SDK and MCP.
 * Seeded events respect plan limits: Free gets 2 providers (OpenAI, Stripe); Pro/Scale get 5 (OpenAI, Stripe, Twilio, Resend, Clerk).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { getWorkspaceSubscription } = await import('@/lib/subscription');
  const subscription = await getWorkspaceSubscription(project.workspaceId);
  const planId = (subscription.planId ?? 'free') as PlanId;
  const limits = getPlanLimits(planId);

  const now = new Date();
  const events = getSampleTestEvents(now, { maxProviders: limits.maxProviders });

  try {
    const { count } = await ingestEventsForProject(projectId, events, { source: 'ui_test' }); // stored as source='demo'
    return NextResponse.json({ ok: true, created: count });
  } catch (err) {
    console.error('[test-events]', err);
    return NextResponse.json({ error: 'Failed to create test events' }, { status: 500 });
  }
}
