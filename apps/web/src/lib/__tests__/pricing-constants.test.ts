/**
 * Unit tests for pricing constants and overage calculation.
 * Run with: npx vitest run src/lib/__tests__/pricing-constants.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  EVENT_LIMITS,
  OVERAGE_CENTS_PER_100K,
  OVERAGE_UNIT,
  overageCentsForPlan,
  getRecommendedPlanId,
} from '../pricing-constants';

describe('EVENT_LIMITS', () => {
  it('defines free 10k, builder 100k, startup 1M', () => {
    expect(EVENT_LIMITS.free).toBe(10_000);
    expect(EVENT_LIMITS.builder).toBe(100_000);
    expect(EVENT_LIMITS.startup).toBe(1_000_000);
  });
});

describe('OVERAGE_CENTS_PER_100K', () => {
  it('free has no overage charge', () => {
    expect(OVERAGE_CENTS_PER_100K.free).toBe(0);
  });
  it('builder is $5 per 100k (500 cents)', () => {
    expect(OVERAGE_CENTS_PER_100K.builder).toBe(500);
  });
  it('startup is $3 per 100k (300 cents)', () => {
    expect(OVERAGE_CENTS_PER_100K.startup).toBe(300);
  });
});

describe('overageCentsForPlan', () => {
  it('returns 0 for zero or negative overage', () => {
    expect(overageCentsForPlan('free', 0)).toBe(0);
    expect(overageCentsForPlan('builder', 0)).toBe(0);
    expect(overageCentsForPlan('free', 100)).toBe(0);
  });

  it('free plan never charges overage', () => {
    expect(overageCentsForPlan('free', 50_000)).toBe(0);
  });

  it('builder: rounds up to 100k units, $5 per unit', () => {
    expect(overageCentsForPlan('builder', 1)).toBe(500); // 1 unit
    expect(overageCentsForPlan('builder', 100_000)).toBe(500);
    expect(overageCentsForPlan('builder', 100_001)).toBe(1000); // 2 units
    expect(overageCentsForPlan('builder', 43_200)).toBe(500); // 1 unit = $5
    expect(overageCentsForPlan('builder', 250_000)).toBe(1500); // 3 units = $15
  });

  it('startup: rounds up to 100k units, $3 per unit', () => {
    expect(overageCentsForPlan('startup', 1)).toBe(300);
    expect(overageCentsForPlan('startup', 100_000)).toBe(300);
    expect(overageCentsForPlan('startup', 432_000)).toBe(1500); // 5 units = $15
  });
});

describe('getRecommendedPlanId', () => {
  it('returns free for <= 10k', () => {
    expect(getRecommendedPlanId(0)).toBe('free');
    expect(getRecommendedPlanId(10_000)).toBe('free');
  });
  it('returns builder for 10k+ to 100k', () => {
    expect(getRecommendedPlanId(10_001)).toBe('builder');
    expect(getRecommendedPlanId(100_000)).toBe('builder');
  });
  it('returns startup for 100k+ to 1M', () => {
    expect(getRecommendedPlanId(100_001)).toBe('startup');
    expect(getRecommendedPlanId(1_000_000)).toBe('startup');
  });
  it('returns enterprise over 1M', () => {
    expect(getRecommendedPlanId(1_000_001)).toBe('enterprise');
  });
});
