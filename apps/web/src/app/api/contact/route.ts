import { NextResponse } from 'next/server';
import { cacheGet, cacheSet, cacheKey } from '@/lib/cache';
import { sendContactEmail } from '@/lib/resend';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_SUBJECT_LENGTH = 200;

/** Rate limit: one request per IP per 60 seconds. Uses shared cache (Redis if configured, else in-memory). */
const RATE_LIMIT_TTL_SEC = 60;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rlKey = cacheKey(['contact_rl', ip]);
  const existing = await cacheGet(rlKey);
  if (existing !== null) {
    return NextResponse.json(
      { error: 'Please wait a minute before sending another message.' },
      { status: 429 }
    );
  }

  let body: { email?: string; subject?: string; topic?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const topic = typeof body.topic === 'string' ? body.topic.trim() : undefined;
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
  }
  if (subject.length < 2 || subject.length > MAX_SUBJECT_LENGTH) {
    return NextResponse.json({ error: 'Subject must be 2–200 characters.' }, { status: 400 });
  }
  if (message.length < 10 || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Message must be 10–5000 characters.' }, { status: 400 });
  }

  try {
    const result = await sendContactEmail({ email, subject, message, topic });
    if (!result.ok) {
      console.error('[contact]', result.error);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again or email us directly.' },
        { status: 500 }
      );
    }
    await cacheSet(rlKey, '1', RATE_LIMIT_TTL_SEC);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[contact]', e);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}
