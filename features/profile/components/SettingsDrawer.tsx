
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, LogOut, Bell, Globe, Moon, ChevronRight, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useAppStore } from '../../../stores/useAppStore';
import { LanguageCode } from '../../../types';
import { checkUserOwnership } from '../../../services/superAdminService';
import { deleteAccount } from '../../../services/authService';

interface SettingsDrawerProps {
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ onClose }) => {
  const { logout, currentUser } = useAuthStore();
  const { setLanguage, currentLanguage } = useAppStore();
  const [deleteStep, setDeleteStep] = useState(0); // 0: Normal, 1: Confirm, 2: Loading
  const [confirmText, setConfirmText] = useState('');

  const languages: {code: LanguageCode, label: string, flag: string}[] = [
      { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
      { code: 'en', label: 'English', flag: '🇬🇧' },
      { code: 'ru', label: 'Русский', flag: '🇷🇺' },
      { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  ];

  const handleDeleteAccount = async () => {
      if (confirmText !== 'SIL' || !currentUser) return;
      setDeleteStep(2);

      // Check ownership
      const ownedOrg = await checkUserOwnership(currentUser.id);
      if (ownedOrg) {
          alert(`HATA: ${ownedOrg.name} otelinin sahibi olduğunuz için hesabınızı silemezsiniz. Lütfen önce yönetici panelinden oteli silin veya sahipliği devredin.`);
          setDeleteStep(0);
          setConfirmText('');
          return;
      }

      try {
          await deleteAccount(currentUser.id);
          logout();
          window.location.reload();
      } catch (error) {
          console.error(error);
          alert("Silme işlemi başarısız. Lütfen tekrar giriş yapıp deneyin (Güvenlik gereği).");
          setDeleteStep(0);
      }
  };

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
            className="relative w-80 h-full bg-white shadow-2xl p-6 flex flex-col overflow-y-auto"
        >
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-800">Ayarlar</h2>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="flex-1 space-y-8">
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

                {/* DANGER ZONE */}
                <div className="pt-8 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-red-500 uppercase mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Tehlikeli Bölge
                    </h3>
                    
                    {deleteStep === 0 ? (
                        <button 
                            onClick={() => setDeleteStep(1)}
                            className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-xl transition-colors text-sm font-bold"
                        >
                            <span>Hesabımı Sil</span>
                            <Trash2 className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl animate-in fade-in zoom-in">
                            <p className="text-xs text-red-800 font-medium mb-3 leading-relaxed">
                                Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecektir. Onaylamak için <b>SIL</b> yazın.
                            </p>
                            <input 
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                                placeholder="SIL"
                                className="w-full p-2 border border-red-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-red-500"
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setDeleteStep(0); setConfirmText(''); }}
                                    className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-600"
                                >
                                    İptal
                                </button>
                                <button 
                                    onClick={handleDeleteAccount}
                                    disabled={confirmText !== 'SIL' || deleteStep === 2}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex justify-center"
                                >
                                    {deleteStep === 2 ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Onayla ve Sil'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 pt-6 mt-4">
                <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 p-4 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors font-bold"
                >
                    <LogOut className="w-5 h-5" />
                    Çıkış Yap
                </button>
                <div className="text-center mt-4 text-xs text-gray-300">
                    Version 1.0.3
                </div>
            </div>
        </motion.div>
    </div>
  );
};
