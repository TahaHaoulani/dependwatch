/**
 * GET /api/workspaces/:workspaceId/billing-usage
 * Workspace-level billable usage for the current Stripe billing period.
 * Cached 60s for fast billing/settings reads.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getWorkspaceById } from '@/lib/workspace';
import { getWorkspaceBillableUsageForPeriod } from '@/lib/billing-usage';
import { cacheGetOrSet, cacheKey } from '@/lib/cache';
import type { PlanId } from '@/lib/config';

const BILLING_CACHE_TTL_SEC = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await params;
  const workspace = await getWorkspaceById(workspaceId, session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const subscription = workspace.subscription;
  const planId = (subscription?.planId ?? 'free') as PlanId;
  const periodStart = subscription?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = subscription?.currentPeriodEnd ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
  const periodKey = periodStart.toISOString().slice(0, 10);

  const payload = await cacheGetOrSet(
    cacheKey(['billing', workspaceId, periodKey]),
    () =>
      getWorkspaceBillableUsageForPeriod(workspaceId, periodStart, periodEnd, planId).then((usage) => ({
        ...usage,
        periodStart: usage.periodStart.toISOString(),
        periodEnd: usage.periodEnd.toISOString(),
      })),
    { ttlSeconds: BILLING_CACHE_TTL_SEC }
  );

  return NextResponse.json(payload);
}
