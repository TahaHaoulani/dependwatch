'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/providers/theme-provider';
import { ChevronDown, LogOut, CreditCard, FileText, Bot, Settings, ExternalLink, User, Building2, MessageCircle, Sun, Moon } from 'lucide-react';

export function DashboardHeader({
  workspaceId,
  projectId,
  userEmail,
}: {
  workspaceId: string;
  projectId: string;
  userEmail?: string | null;
}) {
  const { setTheme, resolvedDark } = useTheme();

  return (
    <div className="flex items-center gap-4">
      {projectId ? (
        <Link
          href={`/dashboard/${workspaceId}/${projectId}/mcp`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Bot className="h-4 w-4" />
          Connect assistant
        </Link>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 w-[220px] justify-between">
            <span className="truncate">{userEmail ?? 'Account'}</span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          {/* Section 1: Settings */}
          <DropdownMenuItem asChild>
            <Link href="/settings/account/profile" className="flex items-center">
              <User className="h-4 w-4 mr-2 shrink-0" />
              Account settings
            </Link>
          </DropdownMenuItem>
          {projectId ? (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/${workspaceId}/${projectId}/settings`} className="flex items-center">
                <Settings className="h-4 w-4 mr-2 shrink-0" />
                Project settings
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/${workspaceId}/settings`} className="flex items-center">
              <Building2 className="h-4 w-4 mr-2 shrink-0" />
              Workspace settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/${workspaceId}/billing`} className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2 shrink-0" />
              Billing
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Section 2: Documentation + Support */}
          <DropdownMenuItem asChild>
            <Link href="/docs" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <FileText className="h-4 w-4 mr-2 shrink-0" />
              Documentation
              <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" aria-hidden />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/support" className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-2 shrink-0" />
              Support
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Section 3: Theme + Log out */}
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="flex items-center cursor-default"
          >
            {resolvedDark ? (
              <Sun className="h-4 w-4 mr-2 shrink-0" />
            ) : (
              <Moon className="h-4 w-4 mr-2 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => setTheme(resolvedDark ? 'light' : 'dark')}
              className="flex-1 text-left font-medium"
            >
              {resolvedDark ? 'Light theme' : 'Dark theme'}
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2 shrink-0" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
