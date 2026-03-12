/**
 * Single source of truth for plan event limits and overage pricing.
 * Used by: stripe.ts (server), usage-estimator.tsx (client), usage.ts, billing-usage.ts, overage-billing.
 * Keeps pricing UI and backend enforcement consistent.
 */
export const EVENT_LIMITS = {
  free: 10_000,
  builder: 100_000,
  startup: 1_000_000,
} as const;

/** Overage billing: cents per 100k events (Pro $5/100k, Scale $3/100k). Free has no paid overage. */
export const OVERAGE_CENTS_PER_100K = {
  free: 0,
  builder: 500,   // $5 per 100k
  startup: 300,   // $3 per 100k
} as const;

/** Unit size for overage (events per billable unit). */
export const OVERAGE_UNIT = 100_000;

export type PlanEventLimitId = keyof typeof EVENT_LIMITS;

/** Recommended plan for a given monthly event count. */
export function getRecommendedPlanId(events: number): PlanEventLimitId | 'enterprise' {
  if (events <= EVENT_LIMITS.free) return 'free';
  if (events <= EVENT_LIMITS.builder) return 'builder';
  if (events <= EVENT_LIMITS.startup) return 'startup';
  return 'enterprise';
}

/**
 * Overage amount in cents for a plan and overage event count.
 * Rounds up to next 100k (e.g. 43,200 → 1 unit → $5 for builder).
 */
export function overageCentsForPlan(planId: keyof typeof OVERAGE_CENTS_PER_100K, overageEvents: number): number {
  if (overageEvents <= 0) return 0;
  const centsPer100k = OVERAGE_CENTS_PER_100K[planId] ?? 0;
  if (centsPer100k === 0) return 0;
  const units = Math.ceil(overageEvents / OVERAGE_UNIT);
  return units * centsPer100k;
}
