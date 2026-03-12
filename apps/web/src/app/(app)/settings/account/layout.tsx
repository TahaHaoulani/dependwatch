import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth-server';
import { AccountSettingsShell } from '@/components/settings/account-settings-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

const ACCOUNT_NAV: { label: string; href: string; group: string; icon: string }[] = [
  { label: 'Profile', href: 'profile', group: 'Account', icon: 'User' },
  { label: 'Security', href: 'security', group: 'Account', icon: 'Shield' },
  { label: 'Preferences', href: 'preferences', group: 'Account', icon: 'SlidersHorizontal' },
  { label: 'Sessions', href: 'sessions', group: 'Account', icon: 'Monitor' },
  { label: 'Notifications', href: 'notifications', group: 'Account', icon: 'Bell' },
];

export default async function AccountSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const base = '/settings/account';
  const navItems = ACCOUNT_NAV.map((item) => ({
    ...item,
    href: `${base}/${item.href}`,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-lg">◇</span>
              DependWatch
            </Link>
            <span className="text-sm text-muted-foreground">/ Account settings</span>
          </div>
          <DashboardHeader
            workspaceId=""
            projectId=""
            userEmail={session.user.email}
          />
        </div>
      </header>
      <main className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <AccountSettingsShell navItems={navItems}>
          {children}
        </AccountSettingsShell>
      </main>
    </div>
  );
}
