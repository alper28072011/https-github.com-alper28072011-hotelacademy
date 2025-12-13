import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '../locales/resources';

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

export default i18n;