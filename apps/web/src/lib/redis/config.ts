/**
 * Redis configuration. Used by cache, locks, and rate-limit layers.
 * When REDIS_URL is unset or REDIS_ENABLED=false, the app uses in-memory fallbacks.
 */

const REDIS_URL = process.env.REDIS_URL ?? '';
const REDIS_PREFIX = (process.env.REDIS_PREFIX ?? 'dw').replace(/[^a-zA-Z0-9_-]/g, '');
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false' && REDIS_URL.length > 0;
const CACHE_DEFAULT_TTL_SECONDS = Math.max(10, parseInt(process.env.CACHE_DEFAULT_TTL_SECONDS ?? '45', 10));

export function getRedisConfig() {
  return {
    url: REDIS_URL,
    prefix: REDIS_PREFIX,
    enabled: REDIS_ENABLED,
    defaultCacheTtlSeconds: CACHE_DEFAULT_TTL_SECONDS,
  };
}

export function isRedisEnabled(): boolean {
  return REDIS_ENABLED;
}
