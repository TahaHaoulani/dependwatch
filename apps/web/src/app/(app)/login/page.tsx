'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import { signIn, getProviders, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { captureEvent, AnalyticsEvents } from '@/lib/posthog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2 } from 'lucide-react';

type ProviderId = 'google' | 'github' | 'email';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const rawCallback = searchParams.get('callbackUrl') ?? '';
  const callbackUrl =
    typeof rawCallback === 'string' && rawCallback.startsWith('/') && !rawCallback.startsWith('//')
      ? rawCallback
      : '/onboarding';
  const isExpired = searchParams.get('expired') === '1';
  const isSignUp = searchParams.get('signup') === '1';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<string, { id: string; name: string }> | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProviders().then((p) => setProviders(p ?? null));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      captureEvent(AnalyticsEvents.auth_login_completed);
      if (isSignUp) captureEvent(AnalyticsEvents.auth_signup_completed);
      router.replace(callbackUrl);
      return;
    }
  }, [status, callbackUrl, router, isSignUp]);

  useEffect(() => {
    if (status === 'unauthenticated' && !sent) emailInputRef.current?.focus();
  }, [status, sent]);

  const hasProvider = (id: ProviderId) => !!providers?.[id];

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (isSignUp) captureEvent(AnalyticsEvents.auth_signup_started, { method: 'email' });
    captureEvent(AnalyticsEvents.auth_provider_used, { provider: 'email' });
    try {
      const res = await signIn('email', {
        email,
        callbackUrl,
        redirect: false,
      });
      if (res?.error) {
        setError(
          res.error === 'EmailSignin'
            ? 'We couldn’t send the email. Check your address and try again.'
            : String(res.error)
        );
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  const providerSummary = [
    hasProvider('google') && 'Google',
    hasProvider('github') && 'GitHub',
    hasProvider('email') && 'email',
  ]
    .filter(Boolean)
    .join(', ');
  const cardDesc = providerSummary
    ? (isSignUp ? `Get started with ${providerSummary}.` : `Sign in with ${providerSummary}.`)
    : isSignUp
      ? 'Get started with a magic link.'
      : 'Use your email to continue.';

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          <p className="text-sm text-muted-foreground">Checking session…</p>
        </div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          <p className="text-sm text-muted-foreground">Taking you back…</p>
        </div>
      </div>
    );
  }

  const showReturnMessage = callbackUrl && callbackUrl !== '/onboarding';

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
            <span className="text-xl text-primary">◇</span>
            DependWatch
          </Link>
        </div>

        {isExpired && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-center text-sm text-warning">
            Your session expired. Sign in again to continue where you left off.
          </div>
        )}

        {showReturnMessage && !isExpired && (
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Sign in and we’ll take you back to where you were.
          </p>
        )}

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {isSignUp ? 'Create account' : 'Sign in'}
            </CardTitle>
            <CardDescription>{cardDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sent ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-medium text-foreground">Check your inbox</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a sign-in link to <strong className="text-foreground">{email}</strong>.
                  Click the link to continue.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Link expires in 24 hours. Didn’t get it? Check spam or try again below.
                </p>
                <p className="mt-2 text-xs text-muted-foreground/90">
                  Local dev? If email isn’t configured, check the terminal where <code className="rounded bg-muted px-1 font-mono">npm run dev</code> is running for the sign-in link.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSent(false)}
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <>
                {(hasProvider('google') || hasProvider('github')) && (
                  <div className="space-y-2">
                    {hasProvider('google') && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (isSignUp) captureEvent(AnalyticsEvents.auth_signup_started, { method: 'google' });
                          captureEvent(AnalyticsEvents.auth_provider_used, { provider: 'google' });
                          signIn('google', { callbackUrl });
                        }}
                        disabled={loading}
                      >
                        Continue with Google
                      </Button>
                    )}
                    {hasProvider('github') && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (isSignUp) captureEvent(AnalyticsEvents.auth_signup_started, { method: 'github' });
                          captureEvent(AnalyticsEvents.auth_provider_used, { provider: 'github' });
                          signIn('github', { callbackUrl });
                        }}
                        disabled={loading}
                      >
                        Continue with GitHub
                      </Button>
                    )}
                  </div>
                )}
                {hasProvider('email') && (
                  <>
                    {(hasProvider('google') || hasProvider('github')) && (
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase tracking-wider text-muted-foreground">
                          <span className="bg-card px-2">Or with email</span>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleMagicLink} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          ref={emailInputRef}
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          autoComplete="email"
                        />
                      </div>
                      {error && (
                        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {error}
                        </p>
                      )}
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          'Send magic link'
                        )}
                      </Button>
                    </form>
                  </>
                )}
                {!providers && (
                  <div className="flex flex-col gap-2">
                    <div className="h-10 rounded-md bg-muted animate-pulse" />
                    <div className="h-10 rounded-md bg-muted animate-pulse" />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>
              <Link href="/login" className="underline hover:text-foreground">Already have an account? Sign in</Link>
              <span className="mx-2">·</span>
              <Link href="/" className="underline hover:text-foreground">Back to home</Link>
            </>
          ) : (
            <>
              <Link href="/login?signup=1" className="underline hover:text-foreground">Create account</Link>
              <span className="mx-2">·</span>
              <Link href="/" className="underline hover:text-foreground">Back to home</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function LoginLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2">
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted/80 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 rounded-md bg-muted animate-pulse" />
          <div className="h-10 rounded-md bg-muted animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
