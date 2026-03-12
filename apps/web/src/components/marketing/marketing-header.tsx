'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { TrackedLink } from '@/components/analytics/tracked-link';
import { AnalyticsEvents } from '@/lib/posthog';
import { getLandingCopy, isWaitlistMode } from '@/lib/landing-mode';

/**
 * Public marketing header. Auth state comes from server via isAuthenticated prop only — no useSession(),
 * so the landing page never triggers /api/auth/session or client session fetches.
 * CTA copy and hrefs respect NEXT_PUBLIC_LANDING_MODE (product | waitlist).
 */
export function MarketingHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const copy = getLandingCopy();
  const isWaitlist = isWaitlistMode();
  const loginHref = isWaitlist ? '/#waitlist' : '/login';
  const signUpHref = isWaitlist ? '/#waitlist' : '/login?signup=1';

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <span className="text-xl text-primary">◇</span>
          DependWatch
        </Link>
        <nav className="flex flex-wrap items-center gap-4 sm:gap-6" aria-label="Main">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background rounded"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background rounded"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background rounded"
          >
            Docs
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <TrackedLink href={loginHref} eventName={AnalyticsEvents.login_cta_clicked}>
                <Button variant="ghost" size="sm">
                  {copy.headerLogin}
                </Button>
              </TrackedLink>
              <TrackedLink href={signUpHref} eventName={AnalyticsEvents.signup_cta_clicked}>
                <Button size="sm">{copy.headerSignUp}</Button>
              </TrackedLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
