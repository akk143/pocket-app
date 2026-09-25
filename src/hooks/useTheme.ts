import { useState, useEffect } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'pockettrack-theme';

export function useTheme() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ThemePreference) || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const preference = (localStorage.getItem(STORAGE_KEY) as ThemePreference) || 'system';
    if (preference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return preference;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themePreference);

    const isDark =
      themePreference === 'dark' ||
      (themePreference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setResolvedTheme(isDark ? 'dark' : 'light');

    const metaThemeColor = document.getElementById('theme-color-meta');

    if (isDark) {
      document.documentElement.classList.add('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#171717');
    } else {
      document.documentElement.classList.remove('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f7f7f5');
    }

    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const systemIsDark = e.matches;
        setResolvedTheme(systemIsDark ? 'dark' : 'light');
        if (systemIsDark) {
          document.documentElement.classList.add('dark');
          if (metaThemeColor) metaThemeColor.setAttribute('content', '#171717');
        } else {
          document.documentElement.classList.remove('dark');
          if (metaThemeColor) metaThemeColor.setAttribute('content', '#f7f7f5');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themePreference]);

  return {
    themePreference,
    resolvedTheme,
    setThemePreference,
  };
}
