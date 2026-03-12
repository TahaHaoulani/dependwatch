/**
 * Default caching mechanism for Dependwatch.
 *
 * Use this module for all application caching: session version, workspace/project
 * data, overview/intelligence payloads, rate limits, idempotency, etc.
 *
 * Behavior: Redis when REDIS_URL is set (and REDIS_ENABLED !== 'false'), otherwise
 * in-memory store. Same API either way. Do not implement separate in-memory caches
 * for request-scoped or TTL data — use cacheGet, cacheSet, cacheDel, cacheKey,
 * and cacheGetOrSet from here.
 */

import { getRedisClient, getRedisPrefix, isRedisHealthy } from '@/lib/redis/client';
import { getRedisConfig } from '@/lib/redis/config';

const DEFAULT_TTL_SEC = 45;

/** In-memory entry with expiry */
type MemEntry = { value: string; expiresAt: number };
const memoryStore = new Map<string, MemEntry>();
const MAX_MEMORY_KEYS = 2000;
let lastCleanup = 0;

function memoryGet(key: string): string | null {
  const e = memoryStore.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return e.value;
}

function memorySet(key: string, value: string, ttlSec: number): void {
  if (memoryStore.size >= MAX_MEMORY_KEYS && Date.now() - lastCleanup > 60_000) {
    const now = Date.now();
    for (const [k, v] of memoryStore) {
      if (v.expiresAt < now) memoryStore.delete(k);
    }
    lastCleanup = now;
  }
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSec * 1000,
  });
}

function memoryDel(key: string): void {
  memoryStore.delete(key);
}

export function cacheKey(parts: string[]): string {
  const prefix = getRedisPrefix();
  const safe = parts.map((p) => String(p).replace(/[^a-zA-Z0-9_-]/g, '_')).join(':');
  return prefix ? `${prefix}${safe}` : safe;
}

export async function cacheGet(key: string): Promise<string | null> {
  if (isRedisHealthy()) {
    try {
      const c = await getRedisClient();
      if (c) return await c.get(key);
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[cache] Redis get failed, using memory:', e instanceof Error ? e.message : e);
      }
    }
  }
  return memoryGet(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds: number = DEFAULT_TTL_SEC): Promise<void> {
  const ttl = Math.max(1, ttlSeconds);
  if (isRedisHealthy()) {
    try {
      const c = await getRedisClient();
      if (c) {
        await c.setex(key, ttl, value);
        return;
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[cache] Redis set failed, using memory:', e instanceof Error ? e.message : e);
      }
    }
  }
  memorySet(key, value, ttl);
}

export async function cacheDel(key: string): Promise<void> {
  if (isRedisHealthy()) {
    try {
      const c = await getRedisClient();
      if (c) await c.del(key);
    } catch {
      // fall through to memory del
    }
  }
  memoryDel(key);
}

/** Delete keys matching a prefix (e.g. "dw:overview:projectId" to invalidate all ranges for project). */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  if (isRedisHealthy()) {
    try {
      const c = await getRedisClient();
      if (c) {
        const fullPrefix = getRedisPrefix() + prefix.replace(getRedisPrefix(), '');
        const keys = await c.keys(fullPrefix + '*');
        if (keys.length > 0) await c.del(...keys);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[cache] Redis delByPrefix failed:', e instanceof Error ? e.message : e);
      }
    }
  }
  const fullPrefix = getRedisPrefix() + prefix.replace(getRedisPrefix(), '');
  const pre = fullPrefix.endsWith(':') ? fullPrefix : fullPrefix + ':';
  for (const k of memoryStore.keys()) {
    if (k.startsWith(pre) || k === fullPrefix) memoryStore.delete(k);
  }
}

/**
 * Get value from cache, or compute and set it. Returns parsed JSON if parseJson, else raw string.
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  options?: { ttlSeconds?: number; parseJson?: boolean }
): Promise<T> {
  const ttl = options?.ttlSeconds ?? getRedisConfig().defaultCacheTtlSeconds;
  const raw = await cacheGet(key);
  if (raw !== null) {
    if (options?.parseJson !== false && typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    }
    return raw as unknown as T;
  }
  const value = await factory();
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await cacheSet(key, serialized, ttl);
  return value;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

/** Recursively revives ISO date strings to Date in parsed JSON (for workspace/project cache). */
export function reviveDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' && ISO_DATE_REGEX.test(obj)) return new Date(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map((item) => reviveDates(item)) as unknown as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = reviveDates(v);
    }
    return out as T;
  }
  return obj;
}
