/**
 * Theme system: 'dark' | 'light' | 'system'
 * Stored in localStorage as dependwatch-theme.
 * HTML class: 'dark' = dark mode, 'theme-light' = light mode (Tailwind dark: uses .dark).
 */

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'dependwatch-theme';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'dark' || v === 'light' || v === 'system') return v;
  return 'dark';
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function getResolvedDark(): boolean {
  if (typeof window === 'undefined') return true;
  const theme = getStoredTheme();
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Applies theme to document. Call from client and from inline script (no flash).
 */
export function applyThemeToDocument(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'theme-light');
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.add('theme-light');
  }
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

/** Inline script string to run in head before first paint (no flash). */
export const THEME_SCRIPT = `(function(){var k='dependwatch-theme';var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.remove('dark','theme-light');if(d){document.documentElement.classList.add('dark');}else{document.documentElement.classList.add('theme-light');}})();`;
