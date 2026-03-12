import { auth } from '@/lib/auth-server';
import { AppLayoutClient } from './app-layout-client';

/**
 * App shell: session (from server, avoids client fetch), react-query, PostHog identify.
 * Only wraps authenticated/app routes. Public routes (/, /pricing, etc.) do not mount this.
 * Passing session from server removes the ~1.4s /api/auth/session call on first app navigation.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <AppLayoutClient session={session}>{children}</AppLayoutClient>;
}
