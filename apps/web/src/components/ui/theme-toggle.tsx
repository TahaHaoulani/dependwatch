'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { setTheme, resolvedDark } = useTheme();

  const handleToggle = () => {
    setTheme(resolvedDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground',
        'hover:bg-accent hover:text-accent-foreground transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
      aria-label={resolvedDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {resolvedDark ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}
