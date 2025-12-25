
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Building2, Camera, Trash2, Loader2, Settings2, 
    ShieldCheck
} from 'lucide-react';
import { User, Organization } from '../../../types';
import { getOrganizationDetails } from '../../../services/db';
import { updateProfilePhoto, removeProfilePhoto } from '../../../services/userService';
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

  return (
    <div className="mb-4">
        <div className="flex gap-4">
            
            {/* 1. PROFILE PICTURE BOX */}
            <div className="w-[180px] shrink-0">
                <div className="p-1 bg-white border border-[#ccc]">
                    <Avatar 
                        src={user.avatar} 
                        alt={user.name} 
                        size="2xl" 
                        className="w-full h-auto rounded-none aspect-square"
                    />
                </div>
                {isOwnProfile && (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 w-full text-center text-[11px] text-[#3b5998] hover:underline"
                    >
                        Fotoğrafı Değiştir
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                    </button>
                )}
            </div>

            {/* 2. INFO AREA */}
            <div className="flex-1 pt-1">
                <h1 className="text-[20px] font-bold text-[#333] mb-2 flex items-center gap-2">
                    {user.name}
                    {user.role === 'super_admin' && <ShieldCheck className="w-4 h-4 text-[#3b5998]" />}
                </h1>
                
                <div className="border-t border-b border-[#e9e9e9] py-2 mb-3">
                    <div className="grid grid-cols-[100px_1fr] gap-1 text-[11px]">
                        <div className="text-[#999] font-bold">Ağ:</div>
                        <div>
                            {network ? (
                                <a href={`#/org/${network.id}`} className="text-[#3b5998] hover:underline font-bold">
                                    {network.name}
                                </a>
                            ) : (
                                <span className="text-[#666]">Bağımsız</span>
                            )}
                        </div>
                        
                        <div className="text-[#999] font-bold">Ünvan:</div>
                        <div className="text-[#333]">{user.roleTitle || 'Personel'}</div>
                        
                        <div className="text-[#999] font-bold">Durum:</div>
                        <div className="text-[#333]">{user.bio || 'Mesaj yok.'}</div>
                    </div>
                </div>

                {/* Actions */}
                {isOwnProfile && (
                    <div className="flex gap-2">
                        <button 
                            onClick={onEditClick}
                            className="bg-[#f5f6f7] border border-[#d8dfea] text-[#333] font-bold px-3 py-1 text-[11px] hover:bg-[#ebedef]"
                        >
                            Bilgileri Düzenle
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
