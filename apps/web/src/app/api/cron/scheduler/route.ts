/**
 * POST /api/cron/scheduler
 * Runs native scheduled jobs: alert evaluation and digest delivery.
 * Secure with CRON_SECRET: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>.
 * Call every minute (e.g. Vercel Cron or system cron).
 */

import { NextResponse } from 'next/server';
import { runScheduler } from '@/lib/scheduler';

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim()
    ?? req.headers.get('x-cron-secret')?.trim();
  if (!expected || !secret || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const range = new URL(req.url).searchParams.get('range') ?? '7d';
  try {
    const result = await runScheduler(range);
    return NextResponse.json({
      ok: true,
      alerts: result.alerts.length,
      digests: result.digests.length,
      detail: result,
    });
  } catch (e) {
    console.error('[cron/scheduler]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Scheduler failed' },
      { status: 500 }
    );
  }
}
