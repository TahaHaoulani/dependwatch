/**
 * Usage metering: events per month per project, plan limits, projected API cost.
 * Used for usage-based pricing and dashboard usage card.
 */
import { prisma } from './db';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getProjectById } from './project';
import { getProjectProjectedMonthlyCost } from './analytics';
import { PLANS, getPlanLimits, type PlanId } from './stripe';

export type ProjectUsage = {
  eventsThisMonth: number;
  limit: number;
  /** Events over the plan's included allowance (soft overage; ingest does not reject). */
  overageEvents: number;
  /** Distinct providers (APIs) with events this month. */
  providerCount: number;
  /** Max providers allowed by plan (-1 = unlimited). */
  maxProviders: number;
  planId: string;
  planName: string;
  projectedApiCostMonitored: number;
  /** Unique endpoints seen this month (for future use) */
  monitoredEndpoints: number;
  /** True if project has any demo events (from "Send test events"); show UI label that demo does not count toward usage. */
  hasDemoEvents: boolean;
};

/**
 * Returns usage for a project: events this calendar month, plan limit, projected API cost.
 * Uses indexed query (projectId, timestamp).
 */
export async function getProjectUsage(
  projectId: string,
  userId: string,
  rangeForCost = '7d'
): Promise<ProjectUsage | null> {
  const project = await getProjectById(projectId, userId);
  if (!project) return null;

  const { getWorkspaceSubscription } = await import('@/lib/subscription');
  const subscription = await getWorkspaceSubscription(project.workspaceId);
  const planId = (subscription.planId ?? 'free') as PlanId;
  const plan = PLANS[planId] ?? PLANS.free;
  const limits = getPlanLimits(planId);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const usageWhere = {
    projectId,
    timestamp: { gte: monthStart, lte: monthEnd },
    source: { not: 'demo' },
  };

  const [eventCount, providerGroups, endpointCount, projectedCost, demoCount] = await Promise.all([
    prisma.apiCallEvent.count({ where: usageWhere }),
    prisma.apiCallEvent.groupBy({
      by: ['provider'],
      where: usageWhere,
    }),
    prisma.apiCallEvent.groupBy({
      by: ['provider', 'endpoint'],
      where: usageWhere,
      _count: true,
    }),
    getProjectProjectedMonthlyCost(projectId, rangeForCost, limits.retentionDays),
    prisma.apiCallEvent.count({ where: { projectId, source: 'demo' } }),
  ]);
  const overageEvents = Math.max(0, eventCount - limits.eventsPerMonth);
  const providerCount = providerGroups.length;

  return {
    eventsThisMonth: eventCount,
    limit: limits.eventsPerMonth,
    overageEvents,
    providerCount,
    maxProviders: limits.maxProviders,
    planId: plan.id,
    planName: plan.name,
    projectedApiCostMonitored: projectedCost,
    monitoredEndpoints: endpointCount.length,
    hasDemoEvents: demoCount > 0,
  };
}
