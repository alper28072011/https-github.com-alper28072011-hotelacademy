
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Camera, Edit3, Building2, MapPin } from 'lucide-react';
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
    <div className="flex flex-col md:flex-row gap-5 items-center md:items-start text-center md:text-left">
        {/* LEFT: AVATAR BOX */}
        <div className="shrink-0 w-[120px] md:w-[140px]">
            <div className="p-1.5 bg-white border border-[#bdc7d8] relative group shadow-sm">
                <Avatar 
                    src={user.avatar} 
                    alt={user.name} 
                    size="2xl" 
                    className="w-full h-auto aspect-square bg-[#eff0f5] rounded-none border border-[#e9e9e9]" 
                />
                
                {isOwnProfile && (
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1.5 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="bg-black/70 text-white text-[10px] px-2 py-1 mb-1 flex items-center gap-1 font-bold backdrop-blur-sm shadow-md rounded">
                            <Camera className="w-3 h-3" /> Değiştir
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT: INFO AREA */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 w-full">
            
            {/* TOP SECTION */}
            <div>
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-2">
                    <h1 className="text-[22px] font-bold text-[#1c1e21] flex items-center gap-1.5 leading-tight tracking-tight">
                        {user.name}
                        {user.role === 'super_admin' && <ShieldCheck className="w-5 h-5 text-[#3b5998]" />}
                    </h1>
                    
                    {isOwnProfile && (
                        <button 
                            onClick={onEditClick}
                            className="mt-2 md:mt-0 bg-[#f5f6f7] border border-[#d8dfea] text-[#333] font-bold px-4 py-1.5 text-[11px] hover:bg-[#ebedef] flex items-center gap-1 rounded-[2px] transition-colors"
                        >
                            <Edit3 className="w-3 h-3" /> Düzenle
                        </button>
                    )}
                </div>

                {/* Subtitle */}
                <div className="text-[13px] text-[#555] mb-3 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    <span className="font-bold text-[#333]">{user.roleTitle || 'Personel'}</span>
                    
                    {network && (
                        <>
                            <span className="text-gray-300">•</span>
                            <div 
                                onClick={() => navigate(`/org/${network.id}`)}
                                className="flex items-center gap-1 text-[#3b5998] hover:underline cursor-pointer font-bold group"
                            >
                                <Building2 className="w-3 h-3 text-gray-400 group-hover:text-[#3b5998]" />
                                {network.name}
                            </div>
                        </>
                    )}
                    
                    {!network && (
                        <>
                            <span className="text-gray-300">•</span>
                            <span className="italic text-gray-400">Bağımsız</span>
                        </>
                    )}
                </div>

                {/* Bio & Level */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-4">
                    <div className="bg-[#eff0f5] border border-[#d8dfea] px-2 py-0.5 text-[10px] font-bold text-[#3b5998] uppercase tracking-wide rounded-[2px]">
                        {user.creatorLevel}
                    </div>
                    {user.bio && (
                        <p className="text-[12px] text-[#666] italic leading-snug max-w-sm">
                            "{user.bio}"
                        </p>
                    )}
                </div>
            </div>

            {/* BOTTOM SECTION: Stats Bar */}
            <div className="flex justify-center md:justify-start border-t border-[#e9e9e9] pt-3 mt-auto">
                <div className="flex gap-6 text-[11px]">
                    <div className="flex flex-col items-center md:items-start">
                        <span className="font-bold text-[#1c1e21] text-[13px]">{followersCount}</span> 
                        <span className="text-[#888]">Takipçi</span>
                    </div>
                    <div className="flex flex-col items-center md:items-start">
                        <span className="font-bold text-[#1c1e21] text-[13px]">{followingCount}</span> 
                        <span className="text-[#888]">Takip</span>
                    </div>
                    <div className="flex flex-col items-center md:items-start">
                        <span className="font-bold text-[#1c1e21] text-[13px]">{postCount}</span> 
                        <span className="text-[#888]">Gönderi</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
