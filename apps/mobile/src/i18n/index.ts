import { getLocales } from 'expo-localization';

import { useSettings } from '@/state/settings';

import { en } from './en';
import { es, type Dictionary } from './es';
import { pt } from './pt';

export type Language = 'es' | 'en' | 'pt';
export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
  { id: 'pt', label: 'Português' },
];

const DICTIONARIES: Record<Language, Dictionary> = { es, en, pt };
export const LOCALES: Record<Language, string> = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' };

export function systemLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return code === 'en' || code === 'pt' ? code : 'es';
}

/** Reemplaza `{nombre}` por su valor. */
export function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function useI18n() {
  const choice = useSettings((s) => s.language);
  const lang: Language = choice === 'system' ? systemLanguage() : choice;
  const locale = LOCALES[lang];
  const money = (amount: number, currency = 'ARS') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  return { t: DICTIONARIES[lang], lang, locale, money };
}
