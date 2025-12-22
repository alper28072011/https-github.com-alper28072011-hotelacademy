
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LanguageCode, SystemSettings } from '../types';
import i18n from '../i18n/config';
import { getSystemSettings } from '../services/superAdminService';

interface AppState {
  currentLanguage: LanguageCode;
  isLoading: boolean;
  systemSettings: SystemSettings | null;
  
  setLanguage: (lang: LanguageCode) => void;
  setLoading: (loading: boolean) => void;
  fetchSystemSettings: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentLanguage: 'en',
      isLoading: false,
      systemSettings: null,

      setLanguage: (lang) => {
        // Change i18n instance language
        i18n.changeLanguage(lang);
        // Update document direction for RTL support (Arabic)
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        
        set({ currentLanguage: lang });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),

      fetchSystemSettings: async () => {
          try {
              const settings = await getSystemSettings();
              set({ systemSettings: settings });
          } catch (e) {
              console.error("Failed to load system settings", e);
          }
      }
    }),
    {
      name: 'hotel-academy-storage',
    }
  )
);
