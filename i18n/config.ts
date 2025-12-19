
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '../locales/resources';
import { LocalizedString } from '../types';

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
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
 * Returns the best matching string for the current language.
 * Priority: Current Lang -> English -> Turkish -> First Available
 */
export const getLocalizedContent = (content: LocalizedString | string | undefined, lang: string = i18n.language): string => {
    if (!content) return "";
    
    // Handle legacy string data (if database hasn't fully migrated)
    if (typeof content === 'string') return content;

    // 1. Try Current Language
    if (content[lang]) return content[lang];

    // 2. Try English (Global Standard)
    if (content['en']) return content['en'];

    // 3. Try Turkish (Origin)
    if (content['tr']) return content['tr'];

    // 4. Return first available key
    const keys = Object.keys(content);
    if (keys.length > 0) return content[keys[0]];

    return "";
};

export default i18n;
