/**
 * Central Redis client. Lazy init; health-aware; no crash when Redis is unavailable.
 */

import Redis from 'ioredis';
import { getRedisConfig } from './config';

let client: Redis | null = null;
let healthy: boolean | null = null;

function createClient(): Redis | null {
  const { url, enabled } = getRedisConfig();
  if (!enabled || !url) return null;
  try {
    const c = new Redis(url, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 5000,
    });
    c.on('error', () => {
      healthy = false;
    });
    c.on('connect', () => {
      healthy = true;
    });
    return c;
  } catch (e) {
    console.warn('[redis] Failed to create client:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function getRedisClient(): Promise<Redis | null> {
  if (client != null) return client;
  const c = createClient();
  if (!c) {
    client = null;
    return null;
  }
  client = c;
  try {
    await client.connect();
    healthy = true;
    return client;
  } catch (e) {
    console.warn('[redis] Connect failed, using fallback:', e instanceof Error ? e.message : e);
    healthy = false;
    try {
      client.disconnect();
    } catch {
      // ignore
    }
    client = null;
    return null;
  }
}

/** Sync check: have we ever connected successfully and not errored? */
export function isRedisHealthy(): boolean {
  return healthy === true;
}

/** Async health check: ping Redis. Sets healthy to false on failure. */
export async function checkRedisHealth(): Promise<boolean> {
  const c = await getRedisClient();
  if (!c) {
    healthy = false;
    return false;
  }
  try {
    const pong = await c.ping();
    healthy = pong === 'PONG';
    return healthy;
  } catch {
    healthy = false;
    return false;
  }
}

export function getRedisPrefix(): string {
  const { prefix } = getRedisConfig();
  return prefix ? `${prefix}:` : '';
}

export async function closeRedis(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
    client = null;
    healthy = null;
  }
}
