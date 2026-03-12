import { NextResponse } from 'next/server';
import { checkRedisHealth } from '@/lib/redis/client';
import { getRedisConfig } from '@/lib/redis/config';

export async function GET() {
  const hasDb = !!process.env.DATABASE_URL;
  const { enabled: redisEnabled } = getRedisConfig();
  const payload: { status: string; db?: string; redis?: string } = { status: 'ok' };

  if (hasDb) {
    try {
      const { prisma } = await import('@/lib/db');
      await prisma.$queryRaw`SELECT 1`;
      payload.db = 'ok';
    } catch (e) {
      console.error('[health]', e);
      return NextResponse.json({ status: 'error', db: 'unhealthy' }, { status: 503 });
    }
  } else {
    payload.db = 'skipped';
  }

  if (redisEnabled) {
    const redisOk = await checkRedisHealth();
    payload.redis = redisOk ? 'ok' : 'unhealthy';
  } else {
    payload.redis = 'disabled';
  }

  return NextResponse.json(payload);
}
