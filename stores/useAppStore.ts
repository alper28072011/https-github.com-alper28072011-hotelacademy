import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LanguageCode } from '../types';
import i18n from '../i18n/config';

interface AppState {
  currentLanguage: LanguageCode;
  isLoading: boolean;
  setLanguage: (lang: LanguageCode) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentLanguage: 'en',
      isLoading: false,
      setLanguage: (lang) => {
        // Change i18n instance language
        i18n.changeLanguage(lang);
        // Update document direction for RTL support (Arabic)
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        
        set({ currentLanguage: lang });
      },
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'hotel-academy-storage',
    }
  )
);