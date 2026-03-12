'use client';

import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { identifyUser, resetAnalytics, captureEvent, AnalyticsEvents } from '@/lib/posthog';

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const enabled = typeof window !== 'undefined' && key && host;

if (typeof window !== 'undefined' && key && host) {
  posthog.init(key, {
    api_host: host,
    capture_pageview: false,
    person_profiles: 'identified_only',
    respect_dnt: true,
  });
}

function PostHogPageView() {
  const pathname = usePathname();
  const posthogClient = usePostHog();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthogClient || !pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    posthogClient.capture('$pageview', { path: pathname });
  }, [pathname, posthogClient]);

  return null;
}

/**
 * Renders only inside app shell (SessionProvider). Identifies user when authenticated.
 * Do not render on public routes (/, /pricing, etc.) to avoid pulling in session.
 */
export function PostHogIdentify() {
  const { data: session, status } = useSession();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    const uid = session.user.id;
    if (identifiedRef.current === uid) return;
    identifiedRef.current = uid;
    identifyUser(uid, {
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
    });
  }, [status, session?.user?.id, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (status === 'unauthenticated' && identifiedRef.current) {
      identifiedRef.current = null;
      resetAnalytics();
    }
  }, [status]);

  return null;
}

/** Optional: track high-value page types as custom events for funnels */
function PostHogPageEvents() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const reportedRef = useRef<Set<string>>(new Set());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !pathname) return;
    if (reportedRef.current.has(pathname)) return;
    reportedRef.current.add(pathname);

    if (pathname === '/') captureEvent(AnalyticsEvents.landing_page_viewed);
    else if (pathname === '/pricing') captureEvent(AnalyticsEvents.pricing_page_viewed);
    else if (pathname.startsWith('/docs')) captureEvent(AnalyticsEvents.docs_page_viewed);
    else if (pathname.includes('/billing')) captureEvent(AnalyticsEvents.billing_page_viewed);
    else if (pathname.includes('/mcp')) captureEvent(AnalyticsEvents.mcp_setup_viewed);
    else if (/^\/dashboard\/[^/]+\/[^/]+$/.test(pathname) && !pathname.includes('/settings') && !pathname.includes('/mcp'))
      captureEvent(AnalyticsEvents.dashboard_viewed);
  }, [mounted, pathname]);

  return null;
}

/** Root: pageview + page events only. No session/identify — public pages stay fast. */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      <PostHogPageEvents />
      {children}
    </PHProvider>
  );
}
