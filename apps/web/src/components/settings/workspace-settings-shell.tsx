'use client';

import { usePathname } from 'next/navigation';
import { SettingsShell } from '@/components/settings/settings-shell';
import type { SettingsNavItem } from '@/components/settings/settings-shell';

const SEGMENT_LABELS: Record<string, string> = {
  general: 'General',
  members: 'Members',
  billing: 'Billing',
  integrations: 'Integrations',
  notifications: 'Notifications',
  security: 'Security',
  activity: 'Activity',
  danger: 'Danger zone',
};

function getWorkspaceSettingsBreadcrumbs(
  pathname: string | null,
  workspaceId: string,
  workspaceName: string,
  settingsBase: string
): { label: string; href?: string }[] {
  const dashboardHref = `/dashboard/${workspaceId}`;
  if (!pathname || !pathname.startsWith(settingsBase)) {
    return [
      { label: workspaceName, href: dashboardHref },
      { label: 'Settings' },
    ];
  }
  const rest = pathname.slice(settingsBase.length).replace(/^\//, '');
  if (!rest) {
    return [
      { label: workspaceName, href: dashboardHref },
      { label: 'Settings' },
    ];
  }
  const segment = rest.split('/')[0];
  const label = SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
  return [
    { label: workspaceName, href: dashboardHref },
    { label: 'Settings', href: settingsBase },
    { label },
  ];
}

export function WorkspaceSettingsShell({
  workspaceId,
  workspaceName,
  navItems,
  children,
}: {
  workspaceId: string;
  workspaceName: string;
  navItems: SettingsNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const settingsBase = `/dashboard/${workspaceId}/settings`;
  const breadcrumbs = getWorkspaceSettingsBreadcrumbs(pathname, workspaceId, workspaceName, settingsBase);

  return (
    <SettingsShell
      navItems={navItems}
      navHeader="Workspace settings"
      breadcrumbs={breadcrumbs}
    >
      {children}
    </SettingsShell>
  );
}
