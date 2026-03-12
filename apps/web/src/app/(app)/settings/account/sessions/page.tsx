import { auth } from '@/lib/auth-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutAllButton, RevokeAllSessionsButton } from '@/components/settings/sign-out-all-button';

export default async function AccountSessionsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign out from this device or invalidate all sessions (every device).
      </p>
      <Card>
        <CardHeader>
          <CardTitle>This device</CardTitle>
          <CardDescription>
            Sign out from this browser. Your session cookie will be cleared.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutAllButton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sign out all sessions</CardTitle>
          <CardDescription>
            Invalidate every session on every device. You will be signed out here too and need to sign in again. Use this if you think your account may be compromised or you lost a device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevokeAllSessionsButton />
        </CardContent>
      </Card>
    </>
  );
}
