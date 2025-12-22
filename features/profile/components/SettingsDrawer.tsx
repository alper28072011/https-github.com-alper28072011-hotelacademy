
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, LogOut, Trash2, AlertTriangle, Loader2, Building2, Eye, Languages, Lock } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { deleteUserSmart } from '../../../services/userService';
import { updateUserProfile } from '../../../services/db';
import { LanguagePreferences } from './LanguagePreferences';

interface SettingsDrawerProps {
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ onClose }) => {
  const { logout, currentUser } = useAuthStore();
  
  // Danger Zone State
  const [deleteStep, setDeleteStep] = useState(0); 
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState(''); // New Password State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings Toggles
  const [privacy, setPrivacy] = useState(currentUser?.privacySettings || { showInSearch: true, allowTagging: true, isPrivateAccount: false });

  const togglePrivacy = async (key: keyof typeof privacy) => {
      if(!currentUser) return;
      const newVal = !privacy[key];
      setPrivacy({...privacy, [key]: newVal});
      await updateUserProfile(currentUser.id, {
          privacySettings: { ...privacy, [key]: newVal },
          isPrivate: key === 'isPrivateAccount' ? newVal : currentUser.isPrivate
      });
  };

  const handleDeleteAccount = async () => {
      if (confirmText !== 'SIL' || !currentUser) return;
      if (!password) {
          setErrorMsg("Onaylamak için şifrenizi girmelisiniz.");
          return;
      }

      setIsDeleting(true);
      setErrorMsg(null);

      // Pass password to service for re-authentication
      const result = await deleteUserSmart(currentUser, password);

      if (result.success) {
          logout();
          window.location.reload();
      } else {
          setErrorMsg(result.error || "Silme işlemi başarısız.");
          // Don't reset step so they can see the error
      }
      setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        />

        <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col overflow-hidden rounded-l-[2rem]"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-800">Ayarlar</h2>
                <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-sm">
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
                
                {/* 1. Language Section */}
                <section>
                    <LanguagePreferences />
                </section>

                <div className="h-px bg-gray-100" />

                {/* 2. Privacy Section */}
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Gizlilik & Görünürlük
                    </h3>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden p-4 flex justify-between items-center shadow-sm">
                        <span className="text-sm font-medium text-gray-700">Gizli Hesap</span>
                        <button onClick={() => togglePrivacy('isPrivateAccount')} className={`w-12 h-7 rounded-full p-1 transition-colors ${privacy.isPrivateAccount ? 'bg-primary' : 'bg-gray-200'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${privacy.isPrivateAccount ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>
                </section>

                {/* 3. Danger Zone */}
                <section className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-red-500 uppercase mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Tehlikeli Bölge
                    </h3>
                    
                    {errorMsg && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-4 text-xs text-red-700 font-medium flex gap-2 items-start">
                            <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
                            {errorMsg}
                        </div>
                    )}

                    <div className="space-y-3">
                        {deleteStep === 0 ? (
                            <button 
                                onClick={() => setDeleteStep(1)}
                                className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-xl transition-colors text-sm font-bold"
                            >
                                <span>Hesabı Sil</span>
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="bg-red-50 border border-red-200 p-4 rounded-xl animate-in fade-in zoom-in">
                                <p className="text-xs text-red-800 font-medium mb-3 leading-relaxed">
                                    Hesabınızı ve tüm verilerinizi kalıcı olarak silmek üzeresiniz. 
                                </p>
                                
                                <div className="space-y-2 mb-3">
                                    {/* Confirmation Text */}
                                    <div>
                                        <label className="text-[10px] font-bold text-red-400 uppercase">Onay Kodu</label>
                                        <input 
                                            value={confirmText}
                                            onChange={e => setConfirmText(e.target.value.toUpperCase())}
                                            placeholder="SIL"
                                            className="w-full p-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-white"
                                        />
                                    </div>

                                    {/* Password Input (Required for Firebase Security) */}
                                    <div>
                                        <label className="text-[10px] font-bold text-red-400 uppercase flex items-center gap-1">
                                            <Lock className="w-3 h-3" /> Şifreniz
                                        </label>
                                        <input 
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Güvenlik için şifrenizi girin"
                                            className="w-full p-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setDeleteStep(0); setConfirmText(''); setPassword(''); setErrorMsg(null); }}
                                        className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-600"
                                    >
                                        İptal
                                    </button>
                                    <button 
                                        onClick={handleDeleteAccount}
                                        disabled={confirmText !== 'SIL' || !password || isDeleting}
                                        className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex justify-center items-center gap-2"
                                    >
                                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Kalıcı Olarak Sil'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* LOGOUT BUTTON - FIXED AT BOTTOM */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                <button 
                    onClick={logout} 
                    className="w-full flex items-center justify-center gap-3 p-4 bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-2xl transition-colors font-bold shadow-sm active:scale-95"
                >
                    <LogOut className="w-5 h-5" /> 
                    Oturumu Kapat
                </button>
            </div>
        </motion.div>
    </div>
  );
};
