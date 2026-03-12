import { auth } from '@/lib/auth-server';
import { getOrCreateUserPreference } from '@/lib/user-preference';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AccountNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  await getOrCreateUserPreference(session.user.id);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How and when you receive alerts and product updates.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Personal notification preferences</CardTitle>
          <CardDescription>
            Notification preferences (e.g. digest frequency and in-app alerts) are configured in Preferences. Alert delivery is via Slack (configured per project in Project → Settings → Alerts).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/settings/account/preferences">Edit preferences</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
