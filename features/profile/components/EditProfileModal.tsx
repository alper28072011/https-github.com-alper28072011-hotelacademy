
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Save } from 'lucide-react';
import { User as UserType } from '../../../types';
import { updateUserProfile } from '../../../services/db';
import { useAuthStore } from '../../../stores/useAuthStore';

interface EditProfileModalProps {
  user: UserType;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose }) => {
  const { updateCurrentUser } = useAuthStore();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [phone, setPhone] = useState(user.phoneNumber || ''); 
  const [instagram, setInstagram] = useState(user.instagramHandle || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile(user.id, {
        name,
        bio,
        phoneNumber: phone,
        instagramHandle: instagram,
      });

      updateCurrentUser({
          name,
          bio,
          phoneNumber: phone,
          instagramHandle: instagram
      });

      onClose();
    } catch (error) {
      alert("Profil güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="bg-white w-full max-w-md border-[4px] border-[#555] shadow-2xl"
      >
        {/* Retro Header */}
        <div className="bg-[#3b5998] px-3 py-2 flex justify-between items-center text-white">
          <h2 className="text-[13px] font-bold">Profili Düzenle</h2>
          <button onClick={onClose} className="hover:bg-[#2d4373] p-0.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4 bg-[#eff0f5]">
          
          <div>
            <label className="block text-[11px] font-bold text-[#666] mb-1">Görünen İsim</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none text-[#333]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#666] mb-1">Hakkımda</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none resize-none h-20 text-[#333]"
              maxLength={150}
            />
            <div className="text-right text-[10px] text-[#999]">{bio.length}/150</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-[11px] font-bold text-[#666] mb-1">Telefon</label>
                <input 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none text-[#333]"
                  placeholder="+90..."
                />
            </div>
            <div>
                <label className="block text-[11px] font-bold text-[#666] mb-1">Instagram</label>
                <input 
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none text-[#333]"
                  placeholder="@kullanici"
                />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#f7f7f7] border-t border-[#ccc] p-3 flex justify-end gap-2">
            <button 
                onClick={onClose}
                className="bg-white border border-[#999] text-[#333] px-4 py-1 text-[11px] font-bold hover:bg-[#e9e9e9]"
            >
                İptal
            </button>
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-[#3b5998] border border-[#29447e] text-white px-4 py-1 text-[11px] font-bold flex items-center gap-1 hover:bg-[#2d4373]"
            >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Kaydet'}
            </button>
        </div>
      </motion.div>
    </div>
  );
};
