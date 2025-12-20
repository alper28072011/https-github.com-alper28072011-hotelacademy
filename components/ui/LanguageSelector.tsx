
import React, { useEffect, useState } from 'react';
import { Globe, Layout, BookOpen, Check } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { LanguageCode } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../i18n/config';
import { updateUserPreferences } from '../../services/userService';

export const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage } = useAppStore(); // UI State
  const { currentUser } = useAuthStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'APP' | 'CONTENT'>('APP');
  
  // Local state for Content Language (defaults to current UI lang if not set)
  const [contentLang, setContentLang] = useState<LanguageCode>(
      currentUser?.preferences?.contentLanguage || currentLanguage
  );

  useEffect(() => {
      // Sync local state when user profile updates
      if (currentUser?.preferences?.contentLanguage) {
          setContentLang(currentUser.preferences.contentLanguage);
      }
  }, [currentUser]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleAppLangSelect = async (code: LanguageCode) => {
    setLanguage(code); // Updates i18n immediately
    if (currentUser) {
        await updateUserPreferences(currentUser.id, { appLanguage: code });
    }
  };

  const handleContentLangSelect = async (code: LanguageCode) => {
    setContentLang(code);
    if (currentUser) {
        await updateUserPreferences(currentUser.id, { contentLanguage: code });
    }
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative z-50">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-white active:scale-95 transition-transform shadow-lg hover:bg-white/20"
      >
        <Globe className="w-5 h-5 text-accent" />
        <span className="text-sm font-bold uppercase">{currentLangObj.code}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-4 w-72 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100 animate-in fade-in zoom-in duration-200">
            
            {/* TABS */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
                <button 
                    onClick={() => setActiveTab('APP')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'APP' ? 'bg-white text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Layout className="w-3.5 h-3.5" /> Arayüz
                </button>
                <button 
                    onClick={() => setActiveTab('CONTENT')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'CONTENT' ? 'bg-white text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <BookOpen className="w-3.5 h-3.5" /> İçerik
                </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = activeTab === 'APP' 
                    ? currentLanguage === lang.code 
                    : contentLang === lang.code;

                return (
                    <button
                    key={lang.code}
                    onClick={() => activeTab === 'APP' ? handleAppLangSelect(lang.code) : handleContentLangSelect(lang.code)}
                    className={`w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                    }`}
                    >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <div className="flex flex-col items-start">
                        <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                            {lang.nativeName}
                        </span>
                        {lang.isBase && <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 rounded uppercase font-bold">Base</span>}
                        </div>
                    </div>
                    {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 text-primary" />
                        </div>
                    )}
                    </button>
                );
              })}
            </div>
            
            <div className="bg-gray-50 p-3 text-[10px] text-gray-400 text-center border-t border-gray-100">
                {activeTab === 'APP' ? 'Menü ve buton dilleri.' : 'Eğitim ve hikaye dilleri.'}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
