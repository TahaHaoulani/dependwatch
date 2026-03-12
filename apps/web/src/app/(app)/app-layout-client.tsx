'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from '@/components/providers/session-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { PostHogIdentify } from '@/components/providers/posthog-provider';
import { NavigationProgress } from '@/components/navigation/navigation-progress';

/**
 * Client shell for (app) routes. Receives session from server so SessionProvider
 * can use it as initial session and avoid a client-side /api/auth/session fetch on first load.
 * NavigationProgress shows a top progress bar on route changes for immediate feedback.
 */
export function AppLayoutClient({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <NavigationProgress />
        <PostHogIdentify />
        {children}
      </QueryProvider>
    </SessionProvider>
  );
}
