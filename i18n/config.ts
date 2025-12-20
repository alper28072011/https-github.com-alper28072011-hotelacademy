
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '../locales/resources';
import { LocalizedString, LanguageDefinition } from '../types';
import { resolveContent } from '../utils/localization';

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
 * @param content - Localized object
 * @param langOrPrefs - Either a single language code OR a priority array. 
 *                      Defaults to current i18n language if omitted.
 */
export const getLocalizedContent = (
    content: LocalizedString | string | undefined, 
    langOrPrefs?: string | string[]
): string => {
    let prefs: string[] = [];

    if (Array.isArray(langOrPrefs)) {
        prefs = langOrPrefs;
    } else if (typeof langOrPrefs === 'string') {
        prefs = [langOrPrefs];
    } else {
        // Default to current UI language, then fallback to English
        prefs = [i18n.language, 'en'];
    }

    return resolveContent(content, prefs);
};

export default i18n;
