
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
    onEditClick,
    followersCount = 0,
    followingCount = 0,
    postCount = 0
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
        {/* LEFT: AVATAR BOX (Polaroid/Frame Style) */}
        <div className="w-[140px] shrink-0">
            <div className="p-1 bg-white border border-[#ccc] relative group shadow-sm">
                <Avatar 
                    src={user.avatar} 
                    alt={user.name} 
                    size="2xl" 
                    className="w-full h-auto aspect-square bg-[#eff0f5] rounded-none" // Force squared corners
                />
                
                {isOwnProfile && (
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="bg-black/60 text-white text-[9px] px-2 py-1 mb-1 flex items-center gap-1 font-bold backdrop-blur-sm">
                            <Camera className="w-3 h-3" /> Değiştir
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT: INFO AREA */}
        <div className="flex-1 pt-1 min-w-0">
            {/* Name & Edit Row */}
            <div className="flex justify-between items-start mb-2 border-b border-[#e9e9e9] pb-2">
                <h1 className="text-[20px] font-bold text-[#1c1e21] flex items-center gap-1 leading-tight tracking-tight">
                    {user.name}
                    {user.role === 'super_admin' && <ShieldCheck className="w-4 h-4 text-[#3b5998]" />}
                </h1>
                
                {isOwnProfile && (
                    <button 
                        onClick={onEditClick}
                        className="bg-[#f5f6f7] border border-[#d8dfea] text-[#333] font-bold px-3 py-1 text-[11px] hover:bg-[#ebedef] flex items-center gap-1 rounded-[2px]"
                    >
                        <Edit3 className="w-3 h-3" /> Profili Düzenle
                    </button>
                )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-[80px_1fr] gap-y-1 gap-x-2 text-[11px] mb-3">
                <div className="text-[#999] font-bold text-right">Ağ:</div>
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

                <div className="text-[#999] font-bold text-right">Ünvan:</div>
                <div className="text-[#333] font-medium truncate">{user.roleTitle || 'Personel'}</div>

                <div className="text-[#999] font-bold text-right">Seviye:</div>
                <div className="text-[#333] font-medium">{user.creatorLevel}</div>
                
                <div className="text-[#999] font-bold text-right">Hakkında:</div>
                <div className="text-[#333] italic">"{user.bio || 'Merhaba, ben buradayım!'}"</div>
            </div>

            {/* Social Counts Bar */}
            <div className="flex gap-4 text-[11px] px-2 py-1.5 bg-[#f2f4f7] border border-[#e9e9e9] rounded-[2px]">
                <div><span className="font-bold text-[#333]">{followersCount}</span> <span className="text-[#666]">Takipçi</span></div>
                <div className="w-px bg-[#ccc]"></div>
                <div><span className="font-bold text-[#333]">{followingCount}</span> <span className="text-[#666]">Takip</span></div>
                <div className="w-px bg-[#ccc]"></div>
                <div><span className="font-bold text-[#333]">{postCount}</span> <span className="text-[#666]">Gönderi</span></div>
            </div>
        </div>
    </div>
  );
};
