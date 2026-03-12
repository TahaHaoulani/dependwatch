import { auth } from '@/lib/auth-server';
import { AccountSecurityClient } from '@/components/settings/account-security-client';

export default async function AccountSecurityPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign-in method and two-factor authentication (MFA).
      </p>
      <AccountSecurityClient />
      <p className="mt-4 text-sm text-muted-foreground">
        You sign in with your email (magic link) or a provider (Google, GitHub). Enabling MFA adds an extra code from an authenticator app. MFA verification at login is coming in a future update; once enabled, it will be required on sign-in.
      </p>
    </>
  );
}
