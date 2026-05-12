import { useColorScheme } from 'react-native';
import { createContext, useContext } from 'react';

export const DARK_COLORS = {
  bg: '#0F0F14',
  surface: '#1A1A24',
  surface2: '#22222F',
  surface3: '#2A2A3A',
  accent: '#7C6FFF',
  accent2: '#4ECDC4',
  danger: '#FF6B6B',
  warn: '#FFD166',
  text: '#F0EFF8',
  text2: '#9896B0',
  text3: '#5C5A72',
  border: '#2A2A3A',
  overlay: 'rgba(0,0,0,0.7)',
};

export const LIGHT_COLORS = {
  bg: '#F5F5FA',
  surface: '#FFFFFF',
  surface2: '#F0F0F5',
  surface3: '#E8E8F0',
  accent: '#7C6FFF',
  accent2: '#4ECDC4',
  danger: '#FF6B6B',
  warn: '#FFD166',
  text: '#0F0F14',
  text2: '#5C5A72',
  text3: '#9896B0',
  border: '#E0E0E8',
  overlay: 'rgba(0,0,0,0.5)',
};

export type Colors = typeof DARK_COLORS;

export function getThemeColors(theme: 'dark' | 'light' | 'auto', systemScheme?: string | null): Colors {
  const effective = theme === 'auto' ? (systemScheme ?? 'dark') : theme;
  return effective === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

export function useThemeColors(theme: 'dark' | 'light' | 'auto'): Colors {
  const systemScheme = useColorScheme();
  return getThemeColors(theme, systemScheme);
}

export const CURRENCIES = [
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'MAD', symbol: 'MAD', name: 'Dirham marocain' },
  { code: 'NGN', symbol: '₦', name: 'Naira nigérian' },
];

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? code;
}

export const TYPOGRAPHY = {
  sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, hero: 34 },
  weights: { regular: '400' as const, semibold: '600' as const, bold: '700' as const },
  fonts: { body: 'Sora-Regular', semibold: 'Sora-SemiBold', mono: 'SpaceMono-Regular' },
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };

export const ThemeContext = createContext<Colors>(DARK_COLORS);

export function useTheme(): Colors {
  return useContext(ThemeContext);
}
