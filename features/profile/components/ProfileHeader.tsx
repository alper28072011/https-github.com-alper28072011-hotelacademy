
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Settings, ExternalLink, ShieldCheck, Building2, 
    ChevronRight, LayoutDashboard, Crown
} from 'lucide-react';
import { User, Organization } from '../../../types';
import { getOrganizationDetails } from '../../../services/db';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  onSettingsClick?: () => void;
  onEditClick?: () => void;
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
    user, 
    isOwnProfile, 
    onSettingsClick, 
    onEditClick,
    followersCount = 0,
    followingCount = 0,
    postCount = 0
}) => {
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);

  // 1. Fetch Organization Details
  useEffect(() => {
      const fetchOrg = async () => {
          if (user.currentOrganizationId) {
              setLoadingOrg(true);
              const data = await getOrganizationDetails(user.currentOrganizationId);
              setOrg(data);
              setLoadingOrg(false);
          }
      };
      fetchOrg();
  }, [user.currentOrganizationId]);

  // 2. Strict Navigation Logic
  const handleActionClick = () => {
      // Case 1: Freelancer (No Org)
      if (!user.currentOrganizationId) {
          navigate('/lobby');
          return;
      }

      // Case 2: Management Check (Role OR Ownership)
      // We check org.ownerId to handle race conditions where user.role might lag slightly
      const isOwner = org && org.ownerId === user.id;
      const isAdminOrManager = ['admin', 'manager', 'super_admin'].includes(user.role);

      if (isOwner || isAdminOrManager) {
          navigate('/admin');
      } else {
          // Staff Members go to Dashboard (Home) or Org Profile
          navigate('/');
      }
  };

  // 3. Helper for Role Display
  const getRoleLabel = (role: string) => {
      switch(role) {
          case 'super_admin': return "Platform Sahibi";
          case 'admin': return "Kurucu / İşletme Sahibi";
          case 'manager': return "Departman Müdürü";
          case 'staff': return "Ekip Üyesi";
          default: return "Kullanıcı";
      }
  };

  const renderActionSection = () => {
      const roleLabel = getRoleLabel(user.role);
      const orgName = loadingOrg ? "Yükleniyor..." : (org?.name || "Bilinmeyen Kurum");
      const isManagement = ['admin', 'manager', 'super_admin'].includes(user.role);

      // --- SCENARIO 1: OWN PROFILE ---
      if (isOwnProfile) {
          // A. Freelancer
          if (!user.currentOrganizationId) {
              return (
                <div 
                    onClick={handleActionClick}
                    className="bg-gray-50 border-2 border-dashed border-gray-300 py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group hover:border-accent mb-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-200 rounded-full group-hover:bg-accent group-hover:text-primary transition-colors">
                            <Building2 className="w-5 h-5 text-gray-500 group-hover:text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-800">Bir Yapı Oluştur / Katıl</span>
                            <span className="text-[10px] text-gray-500">Kariyerini bir üst seviyeye taşı</span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              );
          }

          // B. Manager / Admin
          if (isManagement) {
              return (
                <div 
                    onClick={handleActionClick}
                    className="bg-primary text-white py-4 px-5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-primary/30 relative overflow-hidden group mb-6"
                >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                            <Crown className="w-6 h-6 text-accent" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-bold leading-tight">{orgName} Yönetim Paneli</span>
                            <span className="text-[11px] text-white/60 font-medium">{roleLabel} olarak yönetiyorsun</span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-accent relative z-10" />
                </div>
              );
          }

          // C. Staff
          return (
            <div 
                onClick={handleActionClick}
                className="bg-white border border-gray-200 shadow-sm py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:bg-gray-50 mb-6"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-100 rounded-full text-gray-600">
                        <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{orgName} Sayfasına Git</span>
                        <span className="text-[10px] text-gray-500">Çalıştığın kurum</span>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          );
      }

      // --- SCENARIO 2: OTHER USER PROFILE ---
      if (user.currentOrganizationId) {
          return (
              <div 
                onClick={() => navigate(`/hotel/${user.currentOrganizationId}`)}
                className="flex items-center gap-2 mb-4 cursor-pointer group w-max"
              >
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200 group-hover:border-primary/30 transition-all">
                      <Building2 className="w-3.5 h-3.5 text-gray-500 group-hover:text-primary" />
                      <span className="text-xs font-bold text-gray-700 group-hover:text-primary">{orgName}</span>
                      <span className="text-gray-300 mx-1">•</span>
                      <span className="text-xs text-gray-500">{roleLabel}</span>
                  </div>
              </div>
          );
      }

      return null;
  };

  return (
    <div className="px-4 pt-6 pb-2">
        {/* Top Row */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold flex items-center gap-1">
                {user.phoneNumber} 
                {user.isSuperAdmin && (
                    <span className="text-blue-500" title="Doğrulanmış Hesap">
                        <ShieldCheck className="w-4 h-4 fill-current" />
                    </span>
                )}
            </h1>
            {isOwnProfile && onSettingsClick && (
                <button onClick={onSettingsClick} className="text-gray-800 hover:bg-gray-100 p-2 rounded-full transition-colors">
                    <Settings className="w-6 h-6" />
                </button>
            )}
        </div>

        {/* Profile Info Row */}
        <div className="flex items-center gap-6 mb-4">
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-pink-600 shadow-md">
                    <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100">
                        {user.avatar.length > 5 ? (
                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-2xl">{user.avatar}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="flex-1 flex justify-around text-center">
                <div>
                    <div className="font-bold text-lg text-gray-900">{postCount}</div>
                    <div className="text-xs text-gray-500">Gönderi</div>
                </div>
                <div>
                    <div className="font-bold text-lg text-gray-900">{followersCount}</div>
                    <div className="text-xs text-gray-500">Takipçi</div>
                </div>
                <div>
                    <div className="font-bold text-lg text-gray-900">{followingCount}</div>
                    <div className="text-xs text-gray-500">Takip</div>
                </div>
            </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-2">
            <h2 className="font-bold text-gray-900 text-lg">{user.name}</h2>
            
            {/* Render Badge Here for Others */}
            {!isOwnProfile && renderActionSection()}
            
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-tight mt-1">
                {user.bio || "Henüz bir biyografi eklenmedi."}
            </p>
            {user.instagramHandle && (
                <a href={`https://instagram.com/${user.instagramHandle.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-blue-900 mt-2">
                    <ExternalLink className="w-3 h-3" /> {user.instagramHandle}
                </a>
            )}
        </div>

        {/* ACTION BUTTON (Only for Self) */}
        {isOwnProfile && (
            <div className="mt-6">
                {renderActionSection()}
                
                {/* Secondary Actions */}
                <div className="flex gap-2 mb-2">
                    <button 
                        onClick={onEditClick}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg text-sm transition-colors"
                    >
                        Profili Düzenle
                    </button>
                    <button 
                        onClick={() => navigate('/journey')}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg text-sm transition-colors"
                    >
                        Kariyer Yolu
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
