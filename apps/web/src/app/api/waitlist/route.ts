import { NextResponse } from 'next/server';
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache';
import { registerWaitlist, type WaitlistMetadata } from '@/lib/waitlist-service';

const RATE_LIMIT_TTL_SEC = 60;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function parseBody(body: unknown): {
  email: string;
  source?: string;
  name?: string | null;
  company?: string | null;
  useCase?: string | null;
  referralSource?: string | null;
  metadata?: WaitlistMetadata | null;
} {
  if (body == null || typeof body !== 'object') return { email: '' };
  const b = body as Record<string, unknown>;
  return {
    email: typeof b.email === 'string' ? b.email : '',
    source: typeof b.source === 'string' ? b.source : undefined,
    name: typeof b.name === 'string' ? b.name : null,
    company: typeof b.company === 'string' ? b.company : null,
    useCase: typeof b.useCase === 'string' ? b.useCase : null,
    referralSource: typeof b.referralSource === 'string' ? b.referralSource : null,
    metadata: b.metadata != null && typeof b.metadata === 'object' ? (b.metadata as WaitlistMetadata) : undefined,
  };
}

/**
 * POST /api/waitlist — early access signup.
 * Rate limit: one submission per IP per 60s. Idempotent for duplicate emails.
 * Sends confirmation email only for new registrations.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rlKey = cacheKey(['waitlist_rl', ip]);
  const existing = await cacheGet(rlKey);
  if (existing !== null) {
    return NextResponse.json(
      { error: 'Please wait a moment before submitting again.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const input = parseBody(body);
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  try {
    const result = await registerWaitlist({
      email: input.email,
      source: input.source,
      name: input.name,
      company: input.company,
      useCase: input.useCase,
      referralSource: input.referralSource,
      metadata: input.metadata,
    });

    await cacheSet(rlKey, '1', RATE_LIMIT_TTL_SEC);

    if (result.alreadyRegistered) {
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }
    return NextResponse.json({
      ok: true,
      alreadyRegistered: false,
      emailSent: result.emailSent,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Invalid email') {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    console.error('[waitlist]', e);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
