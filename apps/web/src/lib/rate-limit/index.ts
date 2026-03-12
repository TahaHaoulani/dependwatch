/**
 * Rate limit abstraction: per-key sliding window.
 * Uses Redis when available; falls back to in-memory (per-process). Logs when using fallback in production.
 */

import { getRedisClient, getRedisPrefix, isRedisHealthy } from '@/lib/redis/client';

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(key: string, windowMs: number, maxRequests: number): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

export type RateLimitResult = { allowed: boolean; remaining: number };

/**
 * Check rate limit. Returns { allowed, remaining }. When Redis is down, uses in-memory (single-instance only).
 */
export async function checkRateLimit(
  key: string,
  options: { windowMs?: number; maxRequests?: number }
): Promise<RateLimitResult> {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 300;
  const redisKey = getRedisPrefix() + 'rl:' + key.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (isRedisHealthy()) {
    try {
      const c = await getRedisClient();
      if (c) {
        const multi = c.multi();
        multi.incr(redisKey);
        multi.pttl(redisKey);
        const results = await multi.exec();
        if (results && results[0][1] !== null && results[1][1] !== null) {
          const count = results[0][1] as number;
          const ttl = results[1][1] as number;
          if (ttl <= 0) await c.pexpire(redisKey, windowMs);
          const remaining = Math.max(0, maxRequests - count);
          return { allowed: count <= maxRequests, remaining };
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[rate-limit] Redis check failed, using memory fallback:', e instanceof Error ? e.message : e);
      }
    }
  }

  const allowed = memoryRateLimit(key, windowMs, maxRequests);
  return { allowed, remaining: allowed ? maxRequests - 1 : 0 };
}
