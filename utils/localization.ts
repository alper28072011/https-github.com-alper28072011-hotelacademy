
import { LocalizedString, LanguageCode } from '../types';

/**
 * SMART CONTENT RESOLUTION ENGINE
 * 
 * Determines the best string to display based on a prioritized list of user languages.
 * 
 * Algorithm:
 * 1. Check legacy string format (fallback).
 * 2. Iterate through user's priority list (e.g. ['tr', 'ru', 'en']).
 * 3. Return first match found in content object.
 * 4. Fallback to 'en' (Base).
 * 5. Fallback to first available key.
 * 
 * @param content - The localized object (e.g., { en: "Hello", tr: "Merhaba" })
 * @param preferredLanguages - Array of language codes in order of preference.
 */
export const resolveContent = (
    content: LocalizedString | string | undefined | null, 
    preferredLanguages: string[] = ['en']
): string => {
    if (!content) return "";
    
    // 1. Handle Legacy (String)
    if (typeof content === 'string') return content;

    // 2. Iterate Priority List
    for (const lang of preferredLanguages) {
        if (content[lang]) {
            return content[lang];
        }
    }

    // 3. Fallback to English (Base)
    if (content['en']) return content['en'];

    // 4. Fallback to First Available
    const keys = Object.keys(content);
    if (keys.length > 0) return content[keys[0]];

    return "";
};

/**
 * Helper to get a safe display list for the UI.
 * Returns array of objects { code, label, isPresent }
 */
export const getContentAvailability = (
    content: LocalizedString, 
    supportedLangs: { code: string, nativeName: string }[]
) => {
    return supportedLangs.map(lang => ({
        ...lang,
        hasContent: !!content[lang.code]
    }));
};
