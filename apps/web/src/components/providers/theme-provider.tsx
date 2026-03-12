'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  applyThemeToDocument,
  getResolvedDark,
  getStoredTheme,
  setStoredTheme,
  type Theme,
} from '@/lib/theme';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedDark, setResolvedDark] = useState(true);

  const setTheme = useCallback((next: Theme) => {
    setStoredTheme(next);
    setThemeState(next);
    const isDark = next === 'dark' ? true : next === 'light' ? false : getResolvedDark();
    setResolvedDark(isDark);
    applyThemeToDocument(isDark);
  }, []);

  useLayoutEffect(() => {
    const stored = getStoredTheme();
    const dark = getResolvedDark();
    setThemeState(stored);
    setResolvedDark(dark);
    applyThemeToDocument(dark);
  }, []);

  useLayoutEffect(() => {
    applyThemeToDocument(resolvedDark);
  }, [resolvedDark]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const isDark = getResolvedDark();
      setResolvedDark(isDark);
      applyThemeToDocument(isDark);
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, resolvedDark }),
    [theme, setTheme, resolvedDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'dark',
      setTheme: () => {},
      resolvedDark: true,
    };
  }
  return ctx;
}
