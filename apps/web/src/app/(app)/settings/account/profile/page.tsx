import { auth } from '@/lib/auth-server';
import { AccountProfileClient } from '@/components/settings/account-profile-client';
import { AccountIntegrationsClient } from '@/components/settings/account-integrations-client';

export default async function AccountProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your display name and email. Email is managed by your sign-in provider.
      </p>
      <div className="mt-6 space-y-6">
        <AccountProfileClient
          name={session.user.name ?? ''}
          email={session.user.email ?? ''}
          image={session.user.image ?? null}
        />
        <AccountIntegrationsClient userEmail={session.user.email ?? undefined} />
      </div>
    </>
  );
}
