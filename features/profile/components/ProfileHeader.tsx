
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Camera, Edit3 } from 'lucide-react';
import { User, Organization } from '../../../types';
import { getOrganizationDetails } from '../../../services/db';
import { updateProfilePhoto } from '../../../services/userService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { Avatar } from '../../../components/ui/Avatar';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  onEditClick?: () => void;
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
    user, 
    isOwnProfile, 
    onEditClick
}) => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuthStore();
  const [network, setNetwork] = useState<Organization | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const fetchIdentity = async () => {
          const targetId = user.primaryNetworkId || user.currentOrganizationId;
          if (targetId) {
              const data = await getOrganizationDetails(targetId);
              setNetwork(data);
          }
      };
      fetchIdentity();
  }, [user.primaryNetworkId, user.currentOrganizationId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              await updateProfilePhoto(user.id, e.target.files[0], user.avatar);
              await refreshProfile();
          } catch (error) {
              alert("Fotoğraf yüklenemedi.");
          }
      }
  };

  return (
    <div className="flex gap-4">
        {/* LEFT: AVATAR BOX */}
        <div className="w-[140px] shrink-0">
            <div className="p-1 bg-white border border-[#ccc] relative group">
                <Avatar 
                    src={user.avatar} 
                    alt={user.name} 
                    size="2xl" 
                    className="w-full h-auto rounded-none aspect-square bg-[#eff0f5]"
                />
                
                {isOwnProfile && (
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="bg-black/50 text-white text-[9px] px-2 py-0.5 mb-1 flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Değiştir
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT: INFO */}
        <div className="flex-1 pt-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
                <h1 className="text-[18px] font-bold text-[#333] flex items-center gap-1 leading-tight">
                    {user.name}
                    {user.role === 'super_admin' && <ShieldCheck className="w-4 h-4 text-[#3b5998]" />}
                </h1>
                
                {isOwnProfile && (
                    <button 
                        onClick={onEditClick}
                        className="bg-[#f5f6f7] border border-[#ccc] text-[#333] font-bold px-2 py-1 text-[10px] hover:bg-[#e9e9e9] flex items-center gap-1"
                    >
                        <Edit3 className="w-3 h-3" /> Düzenle
                    </button>
                )}
            </div>

            <div className="border-t border-b border-[#e9e9e9] py-2 mb-2 bg-[#f9f9f9]">
                <div className="grid grid-cols-[80px_1fr] gap-1 text-[11px] px-2">
                    <div className="text-[#999] font-bold text-right pr-2">Ağ:</div>
                    <div className="truncate">
                        {network ? (
                            <span 
                                onClick={() => navigate(`/org/${network.id}`)}
                                className="text-[#3b5998] font-bold hover:underline cursor-pointer"
                            >
                                {network.name}
                            </span>
                        ) : (
                            <span className="text-gray-500 italic">Bağımsız</span>
                        )}
                    </div>

                    <div className="text-[#999] font-bold text-right pr-2">Ünvan:</div>
                    <div className="text-[#333] truncate">{user.roleTitle || 'Personel'}</div>

                    <div className="text-[#999] font-bold text-right pr-2">Seviye:</div>
                    <div className="text-[#333]">{user.creatorLevel}</div>
                </div>
            </div>

            <div className="text-[11px] text-[#333] px-1 italic">
                "{user.bio || 'Merhaba, ben buradayım!'}"
            </div>
        </div>
    </div>
  );
};
