'use client';

import type { Session } from 'next-auth';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

const REFETCH_INTERVAL_SEC = 5 * 60; // 5 min — refetch so server can roll session when updateAge (24h) has passed

/**
 * When session is passed (e.g. from RSC layout), NextAuth uses it as initial session
 * and does not trigger an immediate client /api/auth/session fetch — faster dashboard entry.
 */
export function SessionProvider({
  session,
  children,
}: {
  session?: Session | null;
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchInterval={REFETCH_INTERVAL_SEC}
      refetchOnWindowFocus={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
