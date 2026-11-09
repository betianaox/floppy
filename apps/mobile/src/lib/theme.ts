import { useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';

// Los colores de la marca: el verde del disquete y el crema del papel.
const light = {
  mode: 'light' as 'light' | 'dark',
  background: '#F5F2EB',
  surface: '#FFFFFF',
  surfaceAlt: '#ECE7DC',
  text: '#1B2B27',
  textMuted: '#5E6B67',
  border: '#DDD6C8',
  primary: '#1F957D',
  primaryDark: '#0F5C4C',
  primarySoft: '#D6EEE7',
  onPrimary: '#FFFFFF',
  danger: '#B4441C',
  wordmarkTint: undefined as string | undefined,
};

const dark: typeof light = {
  mode: 'dark',
  background: '#101614',
  surface: '#18211E',
  surfaceAlt: '#222D29',
  text: '#EEF2EF',
  textMuted: '#9AA8A3',
  border: '#2C3834',
  primary: '#3DB89A',
  primaryDark: '#7FD6C0',
  primarySoft: '#173D33',
  onPrimary: '#06221B',
  danger: '#F08A5D',
  wordmarkTint: '#7FD6C0',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const system = useColorScheme();
  const choice = useSettings((s) => s.theme);
  const mode = choice === 'system' ? (system ?? 'light') : choice;
  return mode === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

/** Un color por categoría de gasto, que funciona en los dos temas. */
export const CATEGORY_COLORS: Record<string, string> = {
  Supermercado: '#1F957D',
  Comida: '#E0893A',
  Transporte: '#3B7DD8',
  Hogar: '#8C6BC8',
  Servicios: '#C9A227',
  Salud: '#D3545A',
  Mascotas: '#4AA5B5',
  Ropa: '#C76BA8',
  Ocio: '#6C9A3F',
  Otros: '#8A8F8D',
};
