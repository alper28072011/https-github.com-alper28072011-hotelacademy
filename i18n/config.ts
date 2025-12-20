
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '../locales/resources';
import { LocalizedString, LanguageDefinition } from '../types';
import { resolveContent } from '../utils/localization';
import { useAuthStore } from '../stores/useAuthStore'; // Import store to access user prefs

// --- CENTRALIZED LANGUAGE CONFIG ---
export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr', isBase: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
];

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', 
    fallbackLng: 'en',
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
 * 
 * LOGIC UPDATE:
 * 1. If explicit lang provided -> Use it.
 * 2. If User Logged In & Has Content Prefs -> Use User Prefs.
 * 3. Fallback -> Use Current UI Language.
 * 
 * @param content - Localized object
 * @param langOrPrefs - Either a single language code OR a priority array.
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
            // We access the store state directly (non-reactive) to get the *current* user preference
            // without needing to turn this helper into a hook.
            const user = useAuthStore.getState().currentUser;
            
            if (user?.preferences?.contentLanguages && user.preferences.contentLanguages.length > 0) {
                // User has explicit content preferences (e.g. ['tr', 'en'])
                // We append 'en' (base) at the end just in case, if not present
                prefs = [...user.preferences.contentLanguages];
                if (!prefs.includes('en')) prefs.push('en');
            } else {
                // 3. Fallback: User has no preference or is guest -> Use UI Language
                prefs = [i18n.language, 'en'];
            }
        } catch (e) {
            // Fallback for edge cases (e.g. store not ready)
            prefs = [i18n.language, 'en'];
        }
    }

    return resolveContent(content, prefs);
};

export default i18n;
