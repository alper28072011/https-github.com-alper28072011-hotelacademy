
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from '../locales/resources';
import { LocalizedString, LanguageDefinition } from '../types';
import { resolveContent } from '../utils/localization';
import { useAuthStore } from '../stores/useAuthStore'; 

// --- CENTRALIZED LANGUAGE CONFIG ---
export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr', isBase: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
];

// Initialize i18next with Detector
i18n
  .use(LanguageDetector) // Auto-detect user language
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'tr', 'de', 'ru', 'uk', 'ar', 'id', 'es', 'fr'],
    load: 'languageOnly', // e.g. load 'en' instead of 'en-US'
    detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false, 
    },
    react: {
      useSuspense: true,
    },
  });

/**
 * WRAPPER FOR SMART RESOLUTION ENGINE
 * Keeps backward compatibility while enabling array-based priority.
 */
export const getLocalizedContent = (
    content: LocalizedString | string | undefined, 
    langOrPrefs?: string | string[]
): string => {
    let prefs: string[] = [];

    // 1. Explicit Override
    if (Array.isArray(langOrPrefs)) {
        prefs = langOrPrefs;
    } else if (typeof langOrPrefs === 'string') {
        prefs = [langOrPrefs];
    } else {
        // 2. Smart Detection
        try {
            // We access the store state directly (non-reactive)
            const user = useAuthStore.getState().currentUser;
            
            if (user?.preferences?.contentLanguages && user.preferences.contentLanguages.length > 0) {
                prefs = [...user.preferences.contentLanguages];
                if (!prefs.includes('en')) prefs.push('en');
            } else {
                // 3. Fallback: User has no preference or is guest -> Use UI Language
                prefs = [i18n.language, 'en'];
            }
        } catch (e) {
            prefs = [i18n.language, 'en'];
        }
    }

    return resolveContent(content, prefs);
};

export default i18n;
