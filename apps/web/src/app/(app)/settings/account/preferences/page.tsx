import { auth } from '@/lib/auth-server';
import { getOrCreateUserPreference } from '@/lib/user-preference';
import { AccountPreferencesClient } from '@/components/settings/account-preferences-client';

export default async function AccountPreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const prefs = await getOrCreateUserPreference(session.user.id);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Preferences</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Theme, timezone, and default behavior. Stored per account.
      </p>
      <AccountPreferencesClient initialPrefs={prefs} />
    </>
  );
}
