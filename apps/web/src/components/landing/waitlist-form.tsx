'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { captureEvent, AnalyticsEvents } from '@/lib/posthog';
import { cn } from '@/lib/utils';
import { Check, Loader2, Mail } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = 'idle' | 'loading' | 'success' | 'duplicate' | 'error';

/** Build UTM/campaign metadata from current URL and referrer for traction analysis. */
function getWaitlistMetadata(): Record<string, string> | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || undefined;
  const utm_source = params.get('utm_source') ?? undefined;
  const utm_medium = params.get('utm_medium') ?? undefined;
  const utm_campaign = params.get('utm_campaign') ?? undefined;
  const utm_term = params.get('utm_term') ?? undefined;
  const utm_content = params.get('utm_content') ?? undefined;
  const campaign = params.get('campaign') ?? undefined;
  const meta: Record<string, string> = {};
  if (utm_source) meta.utm_source = utm_source;
  if (utm_medium) meta.utm_medium = utm_medium;
  if (utm_campaign) meta.utm_campaign = utm_campaign;
  if (utm_term) meta.utm_term = utm_term;
  if (utm_content) meta.utm_content = utm_content;
  if (campaign) meta.campaign = campaign;
  if (referrer && referrer.length <= 512) meta.referrer = referrer;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

type Props = {
  /** Optional source for analytics and API (e.g. "hero", "pricing"). */
  source?: string;
  /** Compact layout for hero; full for standalone section. */
  variant?: 'compact' | 'default';
  /** Section id for anchor (e.g. waitlist). */
  id?: string;
  className?: string;
};

export function WaitlistForm({ source = 'landing', variant = 'default', id = 'waitlist', className }: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const formViewedRef = useRef(false);

  useEffect(() => {
    if (formViewedRef.current) return;
    formViewedRef.current = true;
    captureEvent(AnalyticsEvents.waitlist_form_view, { source });
  }, [source]);

  const emailValid = EMAIL_REGEX.test(email.trim());
  const canSubmit = emailValid && state !== 'loading' && state !== 'success' && state !== 'duplicate';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setState('loading');
    setErrorMessage('');

    captureEvent(AnalyticsEvents.waitlist_submit_attempt, { source });

    const metadata = getWaitlistMetadata();
    const payload = {
      email: email.trim().toLowerCase(),
      source,
      ...(metadata && { metadata }),
    };

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setState('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
        captureEvent(AnalyticsEvents.waitlist_submit_failure, {
          source,
          status: res.status,
          error: data.error ?? 'unknown',
        });
        return;
      }

      if (data.alreadyRegistered) {
        setState('duplicate');
        captureEvent(AnalyticsEvents.waitlist_submit_duplicate, { source });
      } else {
        const sent = data.emailSent === true;
        setEmailSent(sent);
        setState('success');
        setEmail('');
        captureEvent(AnalyticsEvents.waitlist_submit_success, { source, emailSent: sent });
        if (sent) {
          captureEvent(AnalyticsEvents.confirmation_email_sent, { source });
        } else {
          captureEvent(AnalyticsEvents.confirmation_email_failed, { source });
        }
      }
    } catch {
      setState('error');
      setErrorMessage('Network error. Please try again.');
      captureEvent(AnalyticsEvents.waitlist_submit_failure, { source, error: 'network' });
    }
  }

  const isCompact = variant === 'compact';

  if (state === 'success') {
    return (
      <div
        id={id}
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-8 text-center',
          isCompact && 'py-6',
          className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">You&apos;re on the list.</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {emailSent
              ? "Thanks — we've sent a confirmation to your inbox. We'll reach out when early access opens."
              : "We've received your request. We'll be in touch when early access opens."}
          </p>
        </div>
        {emailSent && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            Check your inbox for the confirmation.
          </p>
        )}
        <Link
          href="/#features"
          className="text-sm font-medium text-primary hover:underline underline-offset-2 mt-1"
        >
          Continue exploring →
        </Link>
      </div>
    );
  }

  if (state === 'duplicate') {
    return (
      <div
        id={id}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-5 py-8 text-center',
          isCompact && 'py-6',
          className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">You&apos;re already on the list.</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            We&apos;ve already got you — keep an eye on your inbox for launch and access updates.
          </p>
        </div>
        <Link
          href="/#features"
          className="text-sm font-medium text-primary hover:underline underline-offset-2 mt-1"
        >
          Continue exploring →
        </Link>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      className={cn(
        'space-y-3',
        isCompact && 'flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2',
        className
      )}
    >
      <div className={cn('space-y-2', isCompact && 'flex-1 min-w-0')}>
        <Label htmlFor="waitlist-email" className={isCompact ? 'sr-only' : ''}>
          Email
        </Label>
        <Input
          id="waitlist-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === 'error') setState('idle');
          }}
          disabled={state === 'loading'}
          required
          autoComplete="email"
          className={cn(
            'w-full',
            email.length > 0 && !emailValid && 'border-warning/50 focus-visible:ring-warning/30'
          )}
          aria-invalid={email.length > 0 && !emailValid}
          aria-describedby={
            errorMessage ? 'waitlist-error' : email.length > 0 && !emailValid ? 'waitlist-email-hint' : undefined
          }
        />
        {!isCompact && email.length > 0 && !emailValid && (
          <p id="waitlist-email-hint" className="text-xs text-warning">
            Enter a valid email address.
          </p>
        )}
        {errorMessage && (
          <p id="waitlist-error" className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={!canSubmit}
        size={isCompact ? 'lg' : 'default'}
        className={cn(isCompact && 'sm:w-auto shrink-0')}
      >
        {state === 'loading' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          'Join Early Access'
        )}
      </Button>
    </form>
  );
}
