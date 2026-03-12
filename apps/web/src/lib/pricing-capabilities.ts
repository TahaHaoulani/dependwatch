/**
 * Centralized pricing capabilities: alert rules, Slack webhooks, digest, cooldown.
 * Single source of truth for backend enforcement, frontend gating, and pricing page.
 *
 * Plan IDs match Subscription.planId: free, builder (Pro), startup (Scale).
 */

import { prisma } from '@/lib/db';

export const PLAN_IDS = ['free', 'builder', 'startup'] as const;
export type PlanCapabilityId = (typeof PLAN_IDS)[number];

export type PlanCapabilities = {
  planId: PlanCapabilityId;
  planName: string;
  /** Max alert rules per project. -1 = unlimited. */
  maxAlertRules: number;
  /** Max Slack webhooks per project. -1 = unlimited. */
  maxSlackWebhooks: number;
  /** Whether digest preview is available. */
  digestPreview: boolean;
  /** Whether scheduled digest delivery is included (cron/scheduler can run). */
  digestDelivery: boolean;
  /** Minimum cooldown (minutes) between alerts for the same rule. */
  alertCooldownMinMinutes: number;
};

const PLAN_CAPABILITIES: Record<PlanCapabilityId, PlanCapabilities> = {
  free: {
    planId: 'free',
    planName: 'Free',
    maxAlertRules: 1,
    maxSlackWebhooks: 0,
    digestPreview: true,
    digestDelivery: false,
    alertCooldownMinMinutes: 30,
  },
  builder: {
    planId: 'builder',
    planName: 'Pro',
    maxAlertRules: 10,
    maxSlackWebhooks: 3,
    digestPreview: true,
    digestDelivery: true,
    alertCooldownMinMinutes: 5,
  },
  startup: {
    planId: 'startup',
    planName: 'Scale',
    maxAlertRules: -1,
    maxSlackWebhooks: -1,
    digestPreview: true,
    digestDelivery: true,
    alertCooldownMinMinutes: 1,
  },
};

/**
 * Returns capabilities for a plan. Use for backend enforcement and pricing display.
 * Unknown planId falls back to free.
 */
export function getPlanCapabilities(planId: string): PlanCapabilities {
  const id = PLAN_IDS.includes(planId as PlanCapabilityId) ? (planId as PlanCapabilityId) : 'free';
  return { ...PLAN_CAPABILITIES[id] };
}

/**
 * Returns all plan capabilities (for pricing page comparison).
 */
export function getAllPlanCapabilities(): PlanCapabilities[] {
  return PLAN_IDS.map((id) => ({ ...PLAN_CAPABILITIES[id] }));
}

/**
 * Resolves project → workspace → subscription → plan and returns that plan's capabilities.
 * Use for project-scoped checks. Does not verify user access; caller must ensure auth.
 */
export async function getCapabilitiesForProject(projectId: string): Promise<PlanCapabilities> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) {
    return getPlanCapabilities('free');
  }
  const { getWorkspaceSubscription } = await import('@/lib/subscription');
  const subscription = await getWorkspaceSubscription(project.workspaceId);
  const planId = subscription.planId ?? 'free';
  return getPlanCapabilities(planId);
}

/** -1 means unlimited. */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/** Returns true if current count is within limit (or limit is unlimited). */
export function withinLimit(count: number, limit: number): boolean {
  return isUnlimited(limit) || count < limit;
}
