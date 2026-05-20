import { useCallback, useState } from 'react';
import { getTheme, setTheme as persistTheme } from '../theme/theme.js';

export function useTheme() {
  const [theme, setThemeState] = useState(() => getTheme());

  const setTheme = useCallback((next) => {
    setThemeState(persistTheme(next));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme,
    toggleTheme,
  };
}
