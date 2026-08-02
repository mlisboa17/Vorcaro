export type ThemeType = 'light' | 'dark' | 'neon';

export interface Theme {
  name: ThemeType;
  colors: {
    background: string;
    text: string;
    textSecondary: string;
    primary: string;
    primaryLight: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    border: string;
    surface: string;
    surfaceLight: string;
    disabled: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export const LIGHT_THEME: Theme = {
  name: 'light',
  colors: {
    background: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    primary: '#2196F3',
    primaryLight: '#64B5F6',
    secondary: '#FF6B6B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    border: '#E5E7EB',
    surface: '#F9FAFB',
    surfaceLight: '#F3F4F6',
    disabled: '#D1D5DB',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
};

export const DARK_THEME: Theme = {
  name: 'dark',
  colors: {
    background: '#111827',
    text: '#F3F4F6',
    textSecondary: '#D1D5DB',
    primary: '#64B5F6',
    primaryLight: '#93C5FD',
    secondary: '#EF9A9A',
    success: '#6EE7B7',
    warning: '#FCD34D',
    error: '#FCA5A5',
    border: '#374151',
    surface: '#1F2937',
    surfaceLight: '#2D3748',
    disabled: '#4B5563',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  },
};

export const NEON_THEME: Theme = {
  name: 'neon',
  colors: {
    background: '#0A0E27',
    text: '#00FF00',
    textSecondary: '#00AA00',
    primary: '#00FFFF',
    primaryLight: '#00FFFF',
    secondary: '#FF00FF',
    success: '#00FF00',
    warning: '#FFFF00',
    error: '#FF0000',
    border: '#00FFFF',
    surface: '#1A1A3E',
    surfaceLight: '#2D2D5F',
    disabled: '#004400',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  shadows: {
    sm: '0 0 10px rgba(0, 255, 255, 0.3)',
    md: '0 0 20px rgba(0, 255, 255, 0.5)',
    lg: '0 0 30px rgba(0, 255, 255, 0.7)',
  },
};

export const THEMES: Record<ThemeType, Theme> = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
  neon: NEON_THEME,
};

export const getTheme = (type: ThemeType): Theme => {
  return THEMES[type] || LIGHT_THEME;
};

export const isLightTheme = (type: ThemeType): boolean => type === 'light';
export const isDarkTheme = (type: ThemeType): boolean => type === 'dark';
export const isNeonTheme = (type: ThemeType): boolean => type === 'neon';
