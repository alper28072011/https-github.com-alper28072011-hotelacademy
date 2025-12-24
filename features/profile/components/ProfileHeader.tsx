
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Building2, Camera, Trash2, Loader2, X, Settings2, 
    ShieldCheck, ChevronRight, Briefcase, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    onEditClick,
    followersCount = 0,
    followingCount = 0,
    postCount = 0
}) => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuthStore();
  const [network, setNetwork] = useState<Organization | null>(null);
  const [loadingNetwork, setLoadingNetwork] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Identity Network (Primary)
  useEffect(() => {
      const fetchIdentity = async () => {
          // Priority: PrimaryNetworkId > CurrentOrganizationId
          const targetId = user.primaryNetworkId || user.currentOrganizationId;
          
          if (targetId) {
              setLoadingNetwork(true);
              const data = await getOrganizationDetails(targetId);
              setNetwork(data);
              setLoadingNetwork(false);
          }
      };
      fetchIdentity();
  }, [user.primaryNetworkId, user.currentOrganizationId]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && isOwnProfile) {
          setIsPhotoUploading(true);
          const file = e.target.files[0];
          await updateProfilePhoto(user.id, file, user.avatar);
          await refreshProfile();
          setIsPhotoUploading(false);
      }
  };

  const handleRemovePhoto = async () => {
      if (isOwnProfile && confirm("Fotoğrafı kaldırmak istiyor musun?")) {
          setIsPhotoUploading(true);
          await removeProfilePhoto(user.id, user.avatar);
          await refreshProfile();
          setIsPhotoUploading(false);
      }
  };

  const goToNetwork = () => {
      if (network) navigate(`/org/${network.id}`);
  };

  const goToAdmin = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (network) navigate('/admin');
  };

  // Determine if User manages their Primary Network
  const canManageNetwork = user.primaryNetworkRole === 'ADMIN' || user.role === 'admin' || user.role === 'manager';

  return (
    <div className="px-4 pb-2 relative">
        <div className="flex items-start gap-5 mb-6">
            
            {/* 1. AVATAR (Identity Anchor) */}
            <div className="relative shrink-0 group">
                <div className="w-24 h-24 rounded-2xl p-[2px] bg-gradient-to-br from-white to-gray-200 shadow-xl shadow-gray-200 border border-white">
                    <Avatar 
                        src={user.avatar} 
                        alt={user.name} 
                        size="xl" 
                        className="w-full h-full rounded-xl"
                    />
                </div>
                
                {/* Photo Actions */}
                {isOwnProfile && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl z-10">
                        {isPhotoUploading ? (
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md" title="Değiştir">
                                    <Camera className="w-4 h-4" />
                                </button>
                                {user.avatar && !user.avatar.startsWith('http') === false && (
                                    <button onClick={handleRemovePhoto} className="p-1.5 bg-red-500/50 hover:bg-red-500/80 rounded-full text-white backdrop-blur-md" title="Kaldır">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                    </div>
                )}
            </div>

            {/* 2. IDENTITY CARD (Business Card Style) */}
            <div className="flex-1 pt-1 min-w-0">
                <h2 className="font-bold text-gray-900 text-xl leading-tight truncate mb-1">
                    {user.name}
                </h2>
                
                {/* PRIMARY NETWORK LINK */}
                <div 
                    onClick={goToNetwork}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors cursor-pointer group mb-3 max-w-full"
                >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium truncate border-b border-transparent group-hover:border-primary">
                        {loadingNetwork ? "Yükleniyor..." : (network?.name || "Bağımsız Profesyonel")}
                    </span>
                    
                    {/* Admin Gear */}
                    {canManageNetwork && isOwnProfile && (
                        <button 
                            onClick={goToAdmin}
                            className="ml-1 p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                            title="Yönetim Paneli"
                        >
                            <Settings2 className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* ROLE / TITLE */}
                <div className="flex flex-wrap gap-2">
                    {user.roleTitle && (
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                            {user.roleTitle}
                        </span>
                    )}
                    {user.role === 'super_admin' && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Platform Sahibi
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* 3. BIO & STATS */}
        <div className="mb-6">
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {user.bio || "Henüz bir biyografi eklenmedi."}
            </p>
            
            <div className="flex items-center gap-6 pb-4 border-b border-gray-100">
                <div className="text-center">
                    <span className="block font-bold text-gray-900 text-sm">{postCount}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Gönderi</span>
                </div>
                <div className="text-center">
                    <span className="block font-bold text-gray-900 text-sm">{followersCount}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Takipçi</span>
                </div>
                <div className="text-center">
                    <span className="block font-bold text-gray-900 text-sm">{followingCount}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Takip</span>
                </div>
            </div>
        </div>

        {/* 4. ACTIONS (Only for Own Profile) */}
        {isOwnProfile && (
            <div className="flex gap-2 mb-2">
                <button 
                    onClick={onEditClick}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs hover:bg-gray-50 transition-colors shadow-sm"
                >
                    Profili Düzenle
                </button>
                <button 
                    onClick={() => navigate('/journey')}
                    className="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-bold py-2.5 rounded-xl text-xs hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    <Briefcase className="w-3 h-3" /> Kariyer Yolu
                </button>
            </div>
        )}
    </div>
  );
};
