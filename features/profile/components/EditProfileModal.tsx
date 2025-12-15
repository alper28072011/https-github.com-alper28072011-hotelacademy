
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Save, Loader2, User, Phone, Instagram } from 'lucide-react';
import { User as UserType } from '../../../types';
import { updateUserProfile } from '../../../services/db';
import { uploadFile } from '../../../services/storage';

interface EditProfileModalProps {
  user: UserType;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose }) => {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [phone, setPhone] = useState(user.phoneNumber || '');
  const [instagram, setInstagram] = useState(user.instagramHandle || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let photoUrl = user.avatar;
      
      if (avatarFile) {
        photoUrl = await uploadFile(avatarFile, 'user_avatars');
      }

      await updateUserProfile(user.id, {
        name,
        bio,
        phoneNumber: phone,
        instagramHandle: instagram,
        avatar: photoUrl
      });

      onClose();
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Profil güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <button onClick={onClose} className="text-gray-500 font-medium">İptal</button>
          <h2 className="text-base font-bold text-gray-800">Profili Düzenle</h2>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="text-primary font-bold disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bitti'}
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Avatar Edit */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100">
                {avatarPreview.length > 5 ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-primary text-white flex items-center justify-center font-bold text-2xl">{avatarPreview}</div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera className="w-8 h-8 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {/* Trigger the hidden input via overlay click logic handled by parent div usually or simple label wrap */}
              <label className="absolute inset-0 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <button className="text-blue-500 text-sm font-bold mt-3">Profil fotoğrafını değiştir</button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold uppercase ml-1">Ad Soyad</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <User className="w-5 h-5 text-gray-400" />
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent w-full outline-none text-gray-800 font-medium"
                  placeholder="Ad Soyad"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold uppercase ml-1">Biyografi</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 outline-none text-gray-800 font-medium resize-none h-24"
                placeholder="Kendin hakkında bir şeyler yaz..."
                maxLength={150}
              />
              <div className="text-right text-xs text-gray-400">{bio.length}/150</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold uppercase ml-1">Telefon</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <Phone className="w-5 h-5 text-gray-400" />
                <input 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-transparent w-full outline-none text-gray-800 font-medium"
                  placeholder="+90..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold uppercase ml-1">Instagram (Opsiyonel)</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <Instagram className="w-5 h-5 text-gray-400" />
                <input 
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="bg-transparent w-full outline-none text-gray-800 font-medium"
                  placeholder="@kullaniciadi"
                />
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
