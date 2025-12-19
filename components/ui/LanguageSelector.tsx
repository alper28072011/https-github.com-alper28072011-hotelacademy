
import React from 'react';
import { Globe } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { LanguageCode, Language } from '../../types';

const languages: Language[] = [
  { code: 'tr', name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

export const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage } = useAppStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
    // Persist to user profile if logged in could be added here
  };

  const currentLangObj = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <div className="relative z-50">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-white active:scale-95 transition-transform shadow-lg"
      >
        <Globe className="w-5 h-5 text-accent" />
        <span className="text-sm font-bold">{currentLangObj.flag}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-4 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 p-3 text-xs font-bold text-gray-400 uppercase text-center border-b border-gray-100">
              Uygulama & İçerik Dili
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                    currentLanguage === lang.code ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="flex flex-col items-start">
                      <span className={`text-sm font-bold ${currentLanguage === lang.code ? 'text-primary' : 'text-gray-800'}`}>
                        {lang.nativeName}
                      </span>
                    </div>
                  </div>
                  {currentLanguage === lang.code && (
                    <div className="w-2 h-2 rounded-full bg-accent shadow-md shadow-accent/50" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
