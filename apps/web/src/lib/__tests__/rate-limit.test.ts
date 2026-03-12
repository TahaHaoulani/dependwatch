import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('rate-limit', () => {
  it('allows requests under limit', async () => {
    const key = 'test-rl-' + Date.now();
    const r = await checkRateLimit(key, { windowMs: 60_000, maxRequests: 3 });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBeLessThanOrEqual(3);
  });

  it('returns allowed and remaining', async () => {
    const key = 'test-rl-2-' + Date.now();
    const r1 = await checkRateLimit(key, { windowMs: 60_000, maxRequests: 2 });
    expect(r1.allowed).toBe(true);
    const r2 = await checkRateLimit(key, { windowMs: 60_000, maxRequests: 2 });
    expect(r2.allowed).toBe(true);
    const r3 = await checkRateLimit(key, { windowMs: 60_000, maxRequests: 2 });
    expect(r3.allowed).toBe(false);
  });
});
