
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '../locales/resources';
import { LocalizedString, LanguageDefinition } from '../types';

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
    lng: 'en', // default startup language (will be overwritten by user prefs)
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    react: {
      useSuspense: true,
    },
  });

/**
 * SMART LOCALIZATION HELPER
 * Returns the best matching string for the requested language.
 * 
 * Logic:
 * 1. Check if content exists for the requested `lang`.
 * 2. If not, fallback to 'en' (The Source of Truth).
 * 3. If 'en' is missing, return the first available key.
 * 
 * @param content - The LocalizedString object (e.g., { en: "Hello", tr: "Merhaba" })
 * @param lang - The desired language code (defaults to current i18n language)
 */
export const getLocalizedContent = (content: LocalizedString | string | undefined, lang: string = i18n.language): string => {
    if (!content) return "";
    
    // Handle legacy string data (migrated from old DB schema)
    if (typeof content === 'string') return content;

    // 1. Try Requested Language
    if (content[lang]) return content[lang];

    // 2. Try English (Global Base)
    if (content['en']) return content['en'];

    // 3. Fallback to first available
    const keys = Object.keys(content);
    if (keys.length > 0) return content[keys[0]];

    return "";
};

export default i18n;
