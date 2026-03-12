'use client';

import { usePathname } from 'next/navigation';
import { SettingsShell } from '@/components/settings/settings-shell';
import type { SettingsNavItem } from '@/components/settings/settings-shell';

const SEGMENT_LABELS: Record<string, string> = {
  profile: 'Profile',
  security: 'Security',
  preferences: 'Preferences',
  sessions: 'Sessions',
  notifications: 'Notifications',
};

function getAccountBreadcrumbs(pathname: string | null, base: string): { label: string; href?: string }[] {
  if (!pathname || !pathname.startsWith(base)) return [{ label: 'Account settings' }];
  const rest = pathname.slice(base.length).replace(/^\//, '');
  if (!rest) return [{ label: 'Account settings' }];
  const segment = rest.split('/')[0];
  const label = SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
  return [
    { label: 'Account settings', href: base },
    { label },
  ];
}

export function AccountSettingsShell({
  navItems,
  children,
}: {
  navItems: SettingsNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = '/settings/account';
  const breadcrumbs = getAccountBreadcrumbs(pathname, base);

  return (
    <SettingsShell
      navItems={navItems}
      navHeader="Account settings"
      breadcrumbs={breadcrumbs}
    >
      {children}
    </SettingsShell>
  );
}
