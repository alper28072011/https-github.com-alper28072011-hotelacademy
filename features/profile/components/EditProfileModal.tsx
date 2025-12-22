
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Save, Loader2, User, Phone, Instagram, Check } from 'lucide-react';
import { User as UserType } from '../../../types';
import { updateUserProfile } from '../../../services/db';
import { updateProfilePhoto } from '../../../services/userService';
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
      // 1. Handle Photo Update using Service (Handles delete/replace logic)
      let photoUrl = user.avatar;
      if (avatarFile) {
        photoUrl = await updateProfilePhoto(user.id, avatarFile, user.avatar);
      }

      // 2. Handle Text Data Update
      await updateUserProfile(user.id, {
        name,
        bio,
        phoneNumber: phone,
        instagramHandle: instagram,
      });

      // 3. Update Local Store
      updateCurrentUser({
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
        className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
              <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-gray-800">Profili Düzenle</h2>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors font-bold disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-6 h-6 text-blue-600" />}
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Avatar Edit */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
                {avatarPreview.length > 5 ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-primary text-white flex items-center justify-center font-bold text-3xl">{avatarPreview}</div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera className="w-8 h-8 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <label className="absolute inset-0 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            <button className="text-blue-600 text-sm font-bold mt-3 hover:underline">Fotoğrafı Değiştir</button>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase ml-1">Görünen İsim</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 focus-within:border-primary focus-within:bg-white transition-all">
                <User className="w-5 h-5 text-gray-400" />
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent w-full outline-none text-gray-800 font-bold"
                  placeholder="Ad Soyad"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase ml-1">Hakkımda</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-gray-50 p-3 rounded-2xl border border-gray-100 outline-none text-gray-800 font-medium resize-none h-24 focus:border-primary focus:bg-white transition-all"
                placeholder="Kendini kısaca tanıt..."
                maxLength={150}
              />
              <div className="text-right text-xs text-gray-400">{bio.length}/150</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase ml-1">Telefon</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 focus-within:border-primary focus-within:bg-white transition-all">
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
              <label className="text-xs text-gray-400 font-bold uppercase ml-1">Sosyal Medya</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 focus-within:border-primary focus-within:bg-white transition-all">
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
