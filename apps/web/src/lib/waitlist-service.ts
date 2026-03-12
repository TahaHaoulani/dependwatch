/**
 * Waitlist registration service. Single place for validation, persistence, and confirmation email.
 * Idempotent: duplicate emails return success without creating a second record or resending email.
 */

import { prisma } from '@/lib/db';
import { sendWaitlistConfirmationEmail } from '@/lib/waitlist-confirmation-email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SOURCE_LENGTH = 64;
const MAX_REFERRAL_LENGTH = 128;

export type WaitlistMetadata = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  campaign?: string;
  [key: string]: string | undefined;
};

export type RegisterWaitlistInput = {
  email: string;
  source?: string;
  name?: string | null;
  company?: string | null;
  useCase?: string | null;
  referralSource?: string | null;
  metadata?: WaitlistMetadata | null;
};

export type RegisterWaitlistResult = {
  success: true;
  alreadyRegistered: boolean;
  /** True when a new registration received the confirmation email. */
  emailSent: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeString(s: string | undefined | null, maxLen: number): string | undefined {
  if (s == null || typeof s !== 'string') return undefined;
  const t = s.trim();
  return t.length > 0 && t.length <= maxLen ? t : undefined;
}

function sanitizeMetadata(meta: unknown): WaitlistMetadata | undefined {
  if (meta == null || typeof meta !== 'object') return undefined;
  const out: WaitlistMetadata = {};
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'campaign'];
  for (const key of allowed) {
    const v = (meta as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.length <= 256) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Registers an email for early access. Idempotent: duplicate emails get success + alreadyRegistered.
 * Sends confirmation email only for new registrations. Does not resend for duplicates.
 */
export async function registerWaitlist(input: RegisterWaitlistInput): Promise<RegisterWaitlistResult> {
  const email = normalizeEmail(input.email);
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Invalid email');
  }

  const source = sanitizeString(input.source, MAX_SOURCE_LENGTH) ?? 'landing';
  const name = sanitizeString(input.name ?? '', 200);
  const company = sanitizeString(input.company ?? '', 200);
  const useCase = sanitizeString(input.useCase ?? '', 200);
  const referralSource = sanitizeString(input.referralSource, MAX_REFERRAL_LENGTH);
  const metadata = sanitizeMetadata(input.metadata);

  const existing = await prisma.waitlistEntry.findUnique({ where: { email } });
  if (existing) {
    return { success: true, alreadyRegistered: true, emailSent: false };
  }

  await prisma.waitlistEntry.create({
    data: {
      email,
      source,
      status: 'pending',
      name: name || undefined,
      company: company || undefined,
      useCase: useCase || undefined,
      referralSource: referralSource ?? undefined,
      metadata: metadata ?? undefined,
    },
  });

  const emailResult = await sendWaitlistConfirmationEmail({ to: email });
  if (!emailResult.ok) {
    console.error('[waitlist] confirmation_email_failed', emailResult.error?.message);
  }
  return {
    success: true,
    alreadyRegistered: false,
    emailSent: emailResult.ok,
  };
}
