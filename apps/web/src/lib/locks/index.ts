/**
 * Distributed lock abstraction. Uses Redis when available; falls back to DB (SchedulerLock) for correctness.
 * Critical paths (scheduler, overage, digest) must not run twice; fallback preserves that guarantee.
 */

import { prisma } from '@/lib/db';
import { getRedisClient, getRedisPrefix, isRedisHealthy } from '@/lib/redis/client';

const LOCK_TTL_SECONDS = 300; // 5 min
const LOCK_TTL_MS = LOCK_TTL_SECONDS * 1000;

async function deleteExpiredLocks(): Promise<void> {
  await prisma.schedulerLock.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

async function dbAcquireLock(lockKey: string): Promise<boolean> {
  await deleteExpiredLocks();
  try {
    await prisma.schedulerLock.create({
      data: {
        lockKey,
        expiresAt: new Date(Date.now() + LOCK_TTL_MS),
      },
    });
    return true;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'P2002') return false;
    throw e;
  }
}

async function dbReleaseLock(lockKey: string): Promise<void> {
  await prisma.schedulerLock.deleteMany({ where: { lockKey } });
}

export async function acquireLock(lockKey: string, ttlSeconds: number = LOCK_TTL_SECONDS): Promise<boolean> {
  const key = getRedisPrefix() + 'lock:' + lockKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (isRedisHealthy()) {
    try {
      const c = await getRedisClient();
      if (c) {
        const ok = await c.set(key, '1', 'EX', ttlSeconds, 'NX');
        if (ok) return true;
        return false;
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[locks] Redis acquire failed, falling back to DB:', e instanceof Error ? e.message : e);
      }
    }
  }
  return dbAcquireLock(lockKey);
}

export async function releaseLock(lockKey: string): Promise<void> {
  const key = getRedisPrefix() + 'lock:' + lockKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (isRedisHealthy()) {
    try {
      const c = await getRedisClient();
      if (c) await c.del(key);
      return;
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[locks] Redis release failed:', e instanceof Error ? e.message : e);
      }
    }
  }
  await dbReleaseLock(lockKey);
}
