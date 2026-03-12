/**
 * Billable usage: workspace-level, period-aligned, excludes demo.
 * Source of truth for overage calculation and Stripe billing.
 * Only events with source != 'demo' are billable (ingest-service stores test events as 'demo').
 */

import { prisma } from './db';
import { EVENT_LIMITS, OVERAGE_UNIT, overageCentsForPlan } from './pricing-constants';
import type { PlanId } from './config';

export type WorkspaceBillableUsage = {
  periodStart: Date;
  periodEnd: Date;
  billableEvents: number;
  includedEvents: number;
  overageEvents: number;
  overageUnits: number;
  amountCents: number;
  planId: PlanId;
};

/**
 * Count billable events for a workspace in a date range.
 * Billable = all projects in workspace, source != 'demo'.
 * Period is [periodStart, periodEnd) — end exclusive to align with Stripe subscription period.
 */
export async function getWorkspaceBillableEventsForPeriod(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const projectIds = await prisma.project
    .findMany({
      where: { workspaceId, archivedAt: null },
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));

  if (projectIds.length === 0) return 0;

  const result = await prisma.apiCallEvent.aggregate({
    where: {
      projectId: { in: projectIds },
      timestamp: { gte: periodStart, lt: periodEnd },
      source: { not: 'demo' },
    },
    _count: { id: true },
  });
  return result._count.id;
}

/**
 * Included event allowance for a plan (from pricing constants).
 */
export function getIncludedEventsForPlan(planId: PlanId): number {
  return EVENT_LIMITS[planId] ?? EVENT_LIMITS.free;
}

/**
 * Full workspace billable usage for a period: events, overage, and amount.
 * Used for billing page display and for creating overage invoice items.
 */
export async function getWorkspaceBillableUsageForPeriod(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date,
  planId: PlanId
): Promise<WorkspaceBillableUsage> {
  const billableEvents = await getWorkspaceBillableEventsForPeriod(workspaceId, periodStart, periodEnd);
  const includedEvents = getIncludedEventsForPlan(planId);
  const overageEvents = Math.max(0, billableEvents - includedEvents);
  const overageUnits = overageEvents <= 0 ? 0 : Math.ceil(overageEvents / OVERAGE_UNIT);
  const amountCents = overageCentsForPlan(planId, overageEvents);

  return {
    periodStart,
    periodEnd,
    billableEvents,
    includedEvents,
    overageEvents,
    overageUnits,
    amountCents,
    planId,
  };
}

/**
 * Same as getWorkspaceBillableUsageForPeriod but returns only overage summary.
 */
export async function getWorkspaceOverageForPeriod(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date,
  planId: PlanId
): Promise<{ overageEvents: number; amountCents: number }> {
  const usage = await getWorkspaceBillableUsageForPeriod(workspaceId, periodStart, periodEnd, planId);
  return { overageEvents: usage.overageEvents, amountCents: usage.amountCents };
}
