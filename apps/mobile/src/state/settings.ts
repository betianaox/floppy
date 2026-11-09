import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type LanguageChoice = 'system' | 'es' | 'en' | 'pt';
export type ThemeChoice = 'system' | 'light' | 'dark';

interface Settings {
  language: LanguageChoice;
  theme: ThemeChoice;
  setLanguage: (l: LanguageChoice) => void;
  setTheme: (t: ThemeChoice) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      language: 'system',
      theme: 'system',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'floppy-settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
