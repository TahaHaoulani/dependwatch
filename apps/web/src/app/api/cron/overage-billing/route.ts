/**
 * POST /api/cron/overage-billing
 * Creates Stripe invoice items for workspace overage (Pro/Scale) for periods ending soon.
 * Secure with CRON_SECRET. Run daily (e.g. Vercel Cron).
 */

import { NextResponse } from 'next/server';
import { runOverageBillingForEligibleSubscriptions } from '@/lib/overage-billing';

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const secret =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')?.trim() ??
    req.headers.get('x-cron-secret')?.trim();
  if (!expected || !secret || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runOverageBillingForEligibleSubscriptions();
    const created = results.filter((r) => r.created);
    const errors = results.filter((r) => r.error);
    return NextResponse.json({
      ok: true,
      processed: results.length,
      created: created.length,
      errors: errors.length,
      detail: results,
    });
  } catch (e) {
    console.error('[cron/overage-billing]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Overage billing failed' },
      { status: 500 }
    );
  }
}
