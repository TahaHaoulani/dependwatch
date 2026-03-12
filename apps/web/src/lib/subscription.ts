/**
 * Workspace subscription: single source of truth.
 * Every workspace has exactly one Subscription row. Auto-create if missing.
 * Cached 60s (Redis/in-memory); invalidated with workspace cache on Stripe webhook / updateWorkspace.
 */

import { prisma } from './db';
import { cacheGet, cacheSet, cacheKey, reviveDates } from '@/lib/cache';

export type PlanId = 'free' | 'builder' | 'startup';

const SUB_CACHE_TTL_SEC = 60;

async function getWorkspaceSubscriptionDb(workspaceId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { workspaceId },
  });
  if (existing) return existing;
  try {
    return await prisma.subscription.create({
      data: {
        workspaceId,
        status: 'active',
        planId: 'free',
      },
    });
  } catch (e) {
    const again = await prisma.subscription.findUnique({
      where: { workspaceId },
    });
    if (again) return again;
    throw e;
  }
}

/**
 * Returns the subscription for a workspace. Creates one with planId free if missing. Cached 60s.
 */
export async function getWorkspaceSubscription(workspaceId: string) {
  const key = cacheKey(['sub', workspaceId]);
  const raw = await cacheGet(key);
  if (raw !== null) {
    try {
      return reviveDates(JSON.parse(raw)) as Awaited<ReturnType<typeof getWorkspaceSubscriptionDb>>;
    } catch {
      // fall through
    }
  }
  const result = await getWorkspaceSubscriptionDb(workspaceId);
  await cacheSet(key, JSON.stringify(result), SUB_CACHE_TTL_SEC);
  return result;
}

/**
 * Returns planId for a workspace. Uses getWorkspaceSubscription so subscription always exists.
 */
export async function getWorkspacePlanId(workspaceId: string): Promise<PlanId> {
  const sub = await getWorkspaceSubscription(workspaceId);
  return (sub.planId ?? 'free') as PlanId;
}
