import { useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store';
import { getTheme, ThemeType, Theme } from './themes';

export interface UseThemeReturn {
  theme: Theme;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
  isDark: boolean;
  isLight: boolean;
  isNeon: boolean;
  toggleTheme: () => void;
  colors: Theme['colors'];
  spacing: Theme['spacing'];
  borderRadius: Theme['borderRadius'];
  shadows: Theme['shadows'];
}

/**
 * Hook para gerenciar tema da aplicação
 * Suporta: Light, Dark, Neon
 * Com suporte a system theme (auto dark/light)
 */
export function useTheme(): UseThemeReturn {
  const colorScheme = useColorScheme();
  const { theme: storedTheme, setTheme: setStoredTheme } = useAppStore();

  // Determinar tema ativo
  let activeTheme: ThemeType = storedTheme;

  // Se tema for 'auto', usar system preference
  if (storedTheme === 'auto' || storedTheme === 'system') {
    activeTheme = (colorScheme === 'dark' ? 'dark' : 'light') as ThemeType;
  }

  const theme = getTheme(activeTheme);

  const setTheme = useCallback(
    (newTheme: ThemeType) => {
      setStoredTheme(newTheme);
    },
    [setStoredTheme]
  );

  const toggleTheme = useCallback(() => {
    const themes: ThemeType[] = ['light', 'dark', 'neon'];
    const currentIndex = themes.indexOf(activeTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }, [activeTheme, setTheme]);

  return {
    theme,
    themeType: activeTheme,
    setTheme,
    isDark: activeTheme === 'dark',
    isLight: activeTheme === 'light',
    isNeon: activeTheme === 'neon',
    toggleTheme,
    colors: theme.colors,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,
  };
}

/**
 * Estender StyleSheet do React Native com suporte a tema
 */
export function createThemedStyles(themeType: ThemeType) {
  const theme = getTheme(themeType);
  return theme;
}

export default useTheme;
