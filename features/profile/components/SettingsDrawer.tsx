
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Bell, Globe, ChevronRight, Trash2, AlertTriangle, Loader2, Shield, Lock, Eye, EyeOff, Download, PauseCircle, Phone, Smartphone } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useAppStore } from '../../../stores/useAppStore';
import { LanguageCode } from '../../../types';
import { checkUserOwnership } from '../../../services/superAdminService';
import { deleteUserSmart, downloadUserData, suspendAccount } from '../../../services/userService';
import { updateUserProfile } from '../../../services/db';

interface SettingsDrawerProps {
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ onClose }) => {
  const { logout, currentUser } = useAuthStore();
  const { setLanguage, currentLanguage } = useAppStore();
  
  // Danger Zone State
  const [deleteStep, setDeleteStep] = useState(0); 
  const [confirmText, setConfirmText] = useState('');
  
  // Data Action States
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);

  // Settings Toggles (Mock Optimistic UI)
  const [privacy, setPrivacy] = useState(currentUser?.privacySettings || { showInSearch: true, allowTagging: true, isPrivateAccount: false });

  const togglePrivacy = async (key: keyof typeof privacy) => {
      if(!currentUser) return;
      const newVal = !privacy[key];
      setPrivacy({...privacy, [key]: newVal});
      
      // Update DB
      await updateUserProfile(currentUser.id, {
          privacySettings: { ...privacy, [key]: newVal },
          isPrivate: key === 'isPrivateAccount' ? newVal : currentUser.isPrivate
      });
  };

  const languages: {code: LanguageCode, label: string, flag: string}[] = [
      { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
      { code: 'en', label: 'English', flag: '🇬🇧' },
      { code: 'ru', label: 'Русский', flag: '🇷🇺' },
      { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  ];

  const handleDownloadData = async () => {
      if(!currentUser) return;
      setIsDownloading(true);
      const blob = await downloadUserData(currentUser.id);
      if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `hotel-academy-data-${currentUser.id}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
      } else {
          alert("Veri indirilemedi.");
      }
      setIsDownloading(false);
  };

  const handleSuspend = async () => {
      if(!currentUser || !window.confirm("Hesabınızı dondurmak üzeresiniz. İstediğiniz zaman tekrar giriş yaparak aktif edebilirsiniz.")) return;
      setIsSuspending(true);
      await suspendAccount(currentUser.id);
      logout();
      window.location.reload();
  };

  const handleDeleteAccount = async () => {
      if (confirmText !== 'SIL' || !currentUser) return;
      setDeleteStep(2);

      // 1. Check if they own an Active Org
      const ownedOrg = await checkUserOwnership(currentUser.id);
      if (ownedOrg && ownedOrg.status !== 'ARCHIVED') {
          alert(`HATA: ${ownedOrg.name} otelinin sahibisiniz. Lütfen önce işletme ayarlarından 'Güvenli Çıkış' yapın.`);
          setDeleteStep(0);
          setConfirmText('');
          return;
      }

      // 2. Execute Smart Delete Protocol
      try {
          const success = await deleteUserSmart(currentUser);
          if (success) {
              logout();
              window.location.reload();
          } else {
              throw new Error("Silme protokolü başarısız.");
          }
      } catch (error) {
          console.error(error);
          alert("Silme işlemi başarısız. Lütfen tekrar deneyin.");
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
            className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Kontrol Merkezi</h2>
                <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* 1. Account & Security */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Hesap & Güvenlik
                    </h3>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Telefon Numarası</span>
                            </div>
                            <span className="text-xs font-bold text-gray-400">{currentUser?.phoneNumber}</span>
                        </div>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-5 h-5 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">İki Faktörlü Doğrulama</span>
                            </div>
                            <div className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded">AKTİF</div>
                        </button>
                    </div>
                </section>

                {/* 2. Privacy */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Gizlilik & Görünürlük
                    </h3>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {privacy.isPrivateAccount ? <Lock className="w-5 h-5 text-gray-500" /> : <Globe className="w-5 h-5 text-gray-500" />}
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700">Gizli Hesap</span>
                                    <span className="text-[10px] text-gray-400">Sadece takipçilerin içeriğini görür</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => togglePrivacy('isPrivateAccount')}
                                className={`w-12 h-7 rounded-full p-1 transition-colors ${privacy.isPrivateAccount ? 'bg-primary' : 'bg-gray-300'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${privacy.isPrivateAccount ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-gray-500" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700">Keşfette Görün</span>
                                    <span className="text-[10px] text-gray-400">İşletmeler seni bulabilsin</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => togglePrivacy('showInSearch')}
                                className={`w-12 h-7 rounded-full p-1 transition-colors ${privacy.showInSearch ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${privacy.showInSearch ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* 3. Language */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Dil Seçimi
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => setLanguage(lang.code)}
                                className={`flex items-center justify-center p-3 rounded-xl border transition-all ${
                                    currentLanguage === lang.code 
                                    ? 'border-primary bg-primary/5 text-primary font-bold' 
                                    : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <span className="text-xl mr-2">{lang.flag}</span> {lang.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 4. Data & Danger */}
                <section className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-red-500 uppercase mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Tehlikeli Bölge
                    </h3>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={handleDownloadData}
                            disabled={isDownloading}
                            className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors text-sm font-bold"
                        >
                            <span>Verilerimi İndir (JSON)</span>
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>

                        <button 
                            onClick={handleSuspend}
                            disabled={isSuspending}
                            className="w-full flex items-center justify-between p-4 bg-orange-50 border border-orange-100 text-orange-700 hover:bg-orange-100 rounded-xl transition-colors text-sm font-bold"
                        >
                            <span>Hesabı Dondur (Geçici)</span>
                            {isSuspending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
                        </button>

                        {deleteStep === 0 ? (
                            <button 
                                onClick={() => setDeleteStep(1)}
                                className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-xl transition-colors text-sm font-bold"
                            >
                                <span>Hesabı Sil (Kalıcı)</span>
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl animate-in fade-in zoom-in">
                                <p className="text-xs text-red-800 font-medium mb-3 leading-relaxed">
                                    Bu işlem <b>geri alınamaz</b>. Verileriniz tamamen silinecektir. Onaylamak için <b>SIL</b> yazın.
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
                                        {deleteStep === 2 ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sil'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Logout */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
                <button 
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-bold shadow-sm"
                >
                    <LogOut className="w-5 h-5" />
                    Oturumu Kapat
                </button>
                <div className="text-center mt-3 text-[10px] text-gray-300 uppercase tracking-widest font-bold">
                    Hotel Academy v2.1
                </div>
            </div>
        </motion.div>
    </div>
  );
};
