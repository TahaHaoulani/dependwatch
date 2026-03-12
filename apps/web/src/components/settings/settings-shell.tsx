'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  Settings,
  Key,
  Bell,
  Database,
  BarChart3,
  GitBranch,
  Bot,
  AlertTriangle,
  User,
  Shield,
  SlidersHorizontal,
  Monitor,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ICONS: Record<string, LucideIcon> = {
  Settings,
  Key,
  Bell,
  Database,
  BarChart3,
  GitBranch,
  Bot,
  AlertTriangle,
  User,
  Shield,
  SlidersHorizontal,
  Monitor,
};

export type SettingsNavItem = {
  label: string;
  href: string;
  group?: string;
  icon?: string;
};

export function SettingsShell({
  title,
  description,
  navItems,
  children,
  breadcrumbs,
  navHeader,
}: {
  title?: string;
  description?: string;
  navItems: SettingsNavItem[];
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  navHeader?: string;
}) {
  const pathname = usePathname();

  const grouped = useMemo(
    () =>
      navItems.reduce<Record<string, SettingsNavItem[]>>((acc, item) => {
        const g = item.group ?? 'General';
        if (!acc[g]) acc[g] = [];
        acc[g].push(item);
        return acc;
      }, {}),
    [navItems]
  );

  return (
    <div className="flex flex-col gap-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
              )}
              {b.href ? (
                <Link
                  href={b.href}
                  className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[180px]"
                >
                  {b.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium truncate">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:gap-10">
        <aside className="w-full shrink-0 lg:w-52 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-2.5 lg:py-3">
            {navHeader && (
              <p className="mb-3 px-2.5 text-xs font-semibold text-foreground">
                {navHeader}
              </p>
            )}
            <nav aria-label="Settings">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="mb-4 last:mb-0">
                  <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                      const Icon = item.icon ? NAV_ICONS[item.icon] : null;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            )}
                          >
                            {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>
        <div className="min-w-0 flex-1 max-w-3xl">
          <div className="space-y-6">
            {(title != null && title !== '') && (
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description && (
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
