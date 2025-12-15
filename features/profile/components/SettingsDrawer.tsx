
import React from 'react';
import { motion } from 'framer-motion';
import { X, LogOut, Bell, Globe, Moon, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useAppStore } from '../../../stores/useAppStore';
import { LanguageCode } from '../../../types';

interface SettingsDrawerProps {
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ onClose }) => {
  const { logout } = useAuthStore();
  const { setLanguage, currentLanguage } = useAppStore();

  const languages: {code: LanguageCode, label: string, flag: string}[] = [
      { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
      { code: 'en', label: 'English', flag: '🇬🇧' },
      { code: 'ru', label: 'Русский', flag: '🇷🇺' },
      { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        />

        {/* Drawer */}
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="relative w-72 h-full bg-white shadow-2xl p-6 flex flex-col"
        >
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-800">Ayarlar</h2>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="flex-1 space-y-6">
                {/* Language */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Dil Seçimi
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => setLanguage(lang.code)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                    currentLanguage === lang.code 
                                    ? 'border-primary bg-primary/5 text-primary' 
                                    : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    <span className="text-xl">{lang.flag}</span> {lang.label}
                                </span>
                                {currentLanguage === lang.code && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications (Mock) */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <Bell className="w-4 h-4" /> Bildirimler
                    </h3>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-sm font-medium text-gray-700">Anlık Bildirimler</span>
                        <div className="w-10 h-6 bg-green-500 rounded-full p-1 cursor-pointer flex justify-end">
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 pt-6">
                <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold"
                >
                    <LogOut className="w-5 h-5" />
                    Çıkış Yap
                </button>
                <div className="text-center mt-4 text-xs text-gray-300">
                    Version 1.0.2
                </div>
            </div>
        </motion.div>
    </div>
  );
};
