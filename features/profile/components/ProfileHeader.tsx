
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ExternalLink, ShieldCheck, Building2, 
    ChevronRight, Crown, Eye, ShieldAlert,
    Camera, Trash2, Loader2, Upload, Mail, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Organization } from '../../../types';
import { getOrganizationDetails, getPendingInvites, acceptOrgInvite, declineOrgInvite } from '../../../services/db';
import { updateProfilePhoto, removeProfilePhoto } from '../../../services/userService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { Avatar } from '../../../components/ui/Avatar';
import confetti from 'canvas-confetti';

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
  const [org, setOrg] = useState<Organization | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  
  // Invites State
  const [invites, setInvites] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
      if (isOwnProfile) {
          getPendingInvites(user.id).then(setInvites);
      }
  }, [isOwnProfile, user.id]);

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
      if (isOwnProfile && confirm("Profil fotoğrafını kaldırmak istiyor musun?")) {
          setIsPhotoUploading(true);
          await removeProfilePhoto(user.id, user.avatar);
          await refreshProfile();
          setIsPhotoUploading(false);
      }
  };

  const handleManagementClick = () => {
      if (!user.currentOrganizationId) {
          navigate('/lobby');
      } else {
          navigate('/admin');
      }
  };

  const handleSuperAdminClick = () => {
      navigate('/super-admin');
  };

  const handleViewPageClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (user.currentOrganizationId) {
          navigate(`/org/${user.currentOrganizationId}`);
      }
  };

  const handleAcceptInvite = async (invite: any) => {
      setIsProcessingInvite(true);
      const success = await acceptOrgInvite(user.id, invite.id, invite.link);
      if (success) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          setInvites(prev => prev.filter(i => i.id !== invite.id));
          setShowInviteModal(false);
          await refreshProfile();
          // Extract ID from link /org/{id} and navigate
          const orgId = invite.link.split('/org/')[1];
          if(orgId) window.location.reload(); 
      } else {
          alert("Hata oluştu.");
      }
      setIsProcessingInvite(false);
  };

  const handleDeclineInvite = async (inviteId: string) => {
      await declineOrgInvite(user.id, inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
  };

  const getRoleLabel = (role: string) => {
      switch(role) {
          case 'super_admin': return "Platform Sahibi";
          case 'admin': return "Kurucu / İşletme Sahibi";
          case 'manager': return "Yönetici";
          case 'staff': return "Ekip Üyesi";
          default: return "Kullanıcı";
      }
  };

  const renderActionSection = () => {
      const roleLabel = getRoleLabel(user.role);
      const orgName = loadingOrg ? "Yükleniyor..." : (org?.name || "Bilinmeyen Kurum");
      const isSuper = user.role === 'super_admin';

      // --- SCENARIO 1: OWN PROFILE ---
      if (isOwnProfile) {
          return (
              <div className="flex flex-col gap-2 mb-6">
                  {/* SUPER ADMIN SPECIAL ACCESS */}
                  {isSuper && (
                      <button 
                          onClick={handleSuperAdminClick}
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-orange-500/20 mb-2 border border-yellow-400/30"
                      >
                          <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                  <ShieldAlert className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex flex-col text-left">
                                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Platform Master Control</span>
                                  <span className="text-sm font-bold">Süper Admin Paneli</span>
                              </div>
                          </div>
                          <ChevronRight className="w-5 h-5 opacity-50" />
                      </button>
                  )}

                  {/* Standard Org Access */}
                  {!user.currentOrganizationId ? (
                      <div className="flex gap-2">
                          <div 
                              onClick={handleManagementClick}
                              className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group hover:border-accent"
                          >
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-gray-200 rounded-full group-hover:bg-accent group-hover:text-primary transition-colors">
                                      <Building2 className="w-5 h-5 text-gray-500 group-hover:text-primary" />
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="text-sm font-bold text-gray-800">Bir İşletme Oluştur / Katıl</span>
                                      <span className="text-[10px] text-gray-500">Kariyerini bir üst seviyeye taşı</span>
                                  </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>

                          {/* Invite Notification Button */}
                          {invites.length > 0 && (
                              <button 
                                  onClick={() => setShowInviteModal(true)}
                                  className="w-14 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center relative shadow-lg shadow-red-500/30 transition-colors animate-pulse-slow"
                              >
                                  <Mail className="w-6 h-6 text-white" />
                                  <div className="absolute -top-2 -right-2 bg-white text-red-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                      {invites.length}
                                  </div>
                              </button>
                          )}
                      </div>
                  ) : (
                      <div className="flex gap-2">
                          <div 
                              onClick={handleManagementClick}
                              className="flex-1 bg-primary text-white py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-primary/30 relative overflow-hidden group"
                          >
                              <div className="flex items-center gap-3 relative z-10">
                                  <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                                      <Crown className="w-5 h-5 text-accent" />
                                  </div>
                                  <div className="flex flex-col min-w-0 text-left">
                                      <span className="text-xs font-bold opacity-80">Yönetim Paneli</span>
                                      <span className="text-sm font-bold truncate">{orgName}</span>
                                  </div>
                              </div>
                          </div>

                          {invites.length > 0 && (
                              <button 
                                  onClick={() => setShowInviteModal(true)}
                                  className="w-14 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center relative shadow-lg shadow-red-500/30 transition-colors"
                              >
                                  <Mail className="w-6 h-6 text-white" />
                                  <div className="absolute -top-2 -right-2 bg-white text-red-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                      {invites.length}
                                  </div>
                              </button>
                          )}

                          <div 
                              onClick={handleViewPageClick}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-xl flex items-center justify-center cursor-pointer active:scale-[0.98] transition-all"
                              title="Sayfayı Görüntüle"
                          >
                              <Eye className="w-6 h-6" />
                          </div>
                      </div>
                  )}
              </div>
          );
      }

      // --- SCENARIO 2: OTHER USER PROFILE ---
      if (user.currentOrganizationId) {
          return (
              <div 
                onClick={() => navigate(`/org/${user.currentOrganizationId}`)}
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
    <div className="px-4 pb-2 relative">
        {/* INVITE MODAL */}
        <AnimatePresence>
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Gelen Davetler</h3>
                            <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="space-y-3">
                            {invites.map(invite => (
                                <div key={invite.id} className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <h4 className="font-bold text-blue-900 text-sm mb-1">{invite.title}</h4>
                                    <p className="text-xs text-blue-700 mb-4">{invite.message}</p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleAcceptInvite(invite)}
                                            disabled={isProcessingInvite}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1 shadow-md shadow-blue-200"
                                        >
                                            {isProcessingInvite ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Kabul Et</>}
                                        </button>
                                        <button 
                                            onClick={() => handleDeclineInvite(invite.id)}
                                            className="flex-1 bg-white border border-blue-200 text-blue-600 py-2 rounded-xl text-xs font-bold hover:bg-blue-50"
                                        >
                                            Reddet
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {invites.length === 0 && <div className="text-center text-gray-400 text-xs py-4">Bekleyen davet yok.</div>}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <div className="flex items-center gap-6 mb-4">
            <div className="relative shrink-0 group">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-pink-600 shadow-md">
                    <Avatar 
                        src={user.avatar} 
                        alt={user.name} 
                        size="xl" 
                        className="w-full h-full border-2 border-white"
                    />
                </div>
                
                {/* PHOTO ACTIONS (OWN PROFILE) */}
                {isOwnProfile && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full z-10">
                        {isPhotoUploading ? (
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-colors" title="Değiştir">
                                    <Camera className="w-4 h-4" />
                                </button>
                                {user.avatar && !user.avatar.startsWith('http') === false && (
                                    <button onClick={handleRemovePhoto} className="p-1.5 bg-red-500/50 hover:bg-red-500/80 rounded-full text-white backdrop-blur-md transition-colors" title="Kaldır">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handlePhotoChange} 
                        />
                    </div>
                )}

                {user.role === 'super_admin' && (
                    <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-sm z-20">
                        <ShieldCheck className="w-3 h-3" />
                    </div>
                )}
            </div>

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

        <div className="mb-2">
            <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 text-lg">{user.name}</h2>
                {user.role === 'super_admin' && <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Verified Owner</span>}
            </div>
            
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

        {isOwnProfile && (
            <div className="mt-6">
                {renderActionSection()}
                
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
