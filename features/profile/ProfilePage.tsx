
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
    Grid, Building2, 
    ExternalLink, Hash, X, Network, Tv, CheckCircle2, LogOut, Loader2, AlertCircle, ArrowRight
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContextStore } from '../../stores/useContextStore';
import { ProfileHeader } from './components/ProfileHeader';
import { Organization, FeedPost, Channel } from '../../types';
import { getUserManagedPages, updateUserSubscriptions, kickMember } from '../../services/organizationService';
import { getFollowedPages } from '../../services/userService';
import { getUserPosts, getSubscribedChannelsDetails } from '../../services/db';
import { toggleTagFollow, unfollowEntity } from '../../services/socialService';
import { EditProfileModal } from './components/EditProfileModal';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, refreshProfile, updateCurrentUser } = useAuthStore();
  const { contextType } = useContextStore(); 
  
  // UI State
  const [activeTab, setActiveTab] = useState<'INTERESTS' | 'POSTS'>('INTERESTS');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [managedPages, setManagedPages] = useState<Organization[]>([]);
  const [followedPages, setFollowedPages] = useState<Organization[]>([]);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [subscribedChannels, setSubscribedChannels] = useState<{ channel: Channel, organization: { id: string, name: string, logoUrl: string } }[]>([]);

  useEffect(() => {
      if (contextType === 'ORGANIZATION') return;
      loadProfileData();
  }, [currentUser?.id, contextType]);

  const loadProfileData = async () => {
      if (!currentUser) return;
      setLoading(true);
      
      try {
          const [managed, followed, posts, channels] = await Promise.all([
              getUserManagedPages(currentUser.id), 
              getFollowedPages(currentUser.id),
              getUserPosts(currentUser.id),
              getSubscribedChannelsDetails(currentUser)
          ]);
          
          setManagedPages(managed); 
          setFollowedPages(followed);
          setMyPosts(posts);
          setSubscribedChannels(channels);
      } catch (e) {
          console.error("Profile Load Error", e);
      } finally {
          setLoading(false);
      }
  };

  // --- ACTIONS ---
  const handleRemoveTag = async (tag: string) => {
      if(!currentUser) return;
      await toggleTagFollow(currentUser.id, tag, false);
      refreshProfile(); 
  };

  const handleUnfollowPage = async (orgId: string) => {
      if(!currentUser) return;
      if(confirm("Bu sayfayı takipten çıkarmak istiyor musun?")) {
          await unfollowEntity(currentUser.id, orgId, 'ORGANIZATION');
          setFollowedPages(prev => prev.filter(p => p.id !== orgId));
      }
  };

  const handleUnsubscribeChannel = async (channelId: string) => {
      if(!currentUser) return;
      const newSubs = currentUser.channelSubscriptions.filter(id => id !== channelId);
      await updateUserSubscriptions(currentUser.id, newSubs);
      updateCurrentUser({ channelSubscriptions: newSubs });
      setSubscribedChannels(prev => prev.filter(c => c.channel.id !== channelId));
  };

  const handleLeaveOrganization = async (orgId: string) => {
      if(!currentUser) return;
      if(confirm("Bu işletmeden ayrılmak istediğinize emin misiniz? Tüm yetkileriniz gidecek.")) {
          await kickMember(orgId, currentUser.id);
          const newJoined = currentUser.joinedPageIds.filter(id => id !== orgId);
          updateCurrentUser({ joinedPageIds: newJoined, currentOrganizationId: null });
          setManagedPages(prev => prev.filter(p => p.id !== orgId));
          window.location.reload();
      }
  };

  if (!currentUser) return null;

  if (contextType === 'ORGANIZATION') {
      return (
          <div className="bg-white border border-[#dd3c10] p-4 m-4 text-center rounded-sm">
              <div className="font-bold text-[#dd3c10] mb-2 text-sm">Hesap Modu Hatası</div>
              <p className="text-xs text-gray-600 mb-4">
                  Kişisel profilinizi görüntülerken Kurumsal Moddasınız.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-[#3b5998] text-white px-4 py-1 text-xs font-bold rounded-sm border border-[#29447e]"
              >
                  Modu Değiştir
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col gap-4">
        
        {/* HEADER SECTION */}
        <div className="bg-white border border-[#bdc7d8] p-4 rounded-t-md shadow-sm">
            <ProfileHeader 
                user={currentUser}
                isOwnProfile={true}
                onEditClick={() => setIsEditing(true)}
                followersCount={currentUser.followersCount || 0}
                followingCount={currentUser.followingCount || 0}
                postCount={myPosts.length}
            />
        </div>

        {/* EDIT MODAL */}
        <AnimatePresence>
            {isEditing && (
                <EditProfileModal 
                    user={currentUser} 
                    onClose={() => setIsEditing(false)} 
                />
            )}
        </AnimatePresence>

        {/* CONTENT AREA */}
        <div>
            {/* RETRO TABS HEADER */}
            <div className="flex items-end border-b border-[#899bc1] h-[29px] pl-2 mb-[-1px] z-10 relative">
                <button 
                    onClick={() => setActiveTab('INTERESTS')}
                    className={`px-3 py-1.5 text-[11px] font-bold border-t border-l border-r mr-1 focus:outline-none rounded-t-sm flex items-center gap-2 ${activeTab === 'INTERESTS' ? 'bg-white border-[#899bc1] text-[#333] pb-2' : 'bg-[#d8dfea] border-[#d8dfea] text-[#3b5998] hover:bg-[#eff0f5]'}`}
                >
                    <Network className="w-3 h-3" /> Ağım & İlgi Alanlarım
                </button>
                <button 
                    onClick={() => setActiveTab('POSTS')}
                    className={`px-3 py-1.5 text-[11px] font-bold border-t border-l border-r mr-1 focus:outline-none rounded-t-sm flex items-center gap-2 ${activeTab === 'POSTS' ? 'bg-white border-[#899bc1] text-[#333] pb-2' : 'bg-[#d8dfea] border-[#d8dfea] text-[#3b5998] hover:bg-[#eff0f5]'}`}
                >
                    <Grid className="w-3 h-3" /> Paylaşımlar
                </button>
            </div>

            <div className="bg-white border border-[#bdc7d8] min-h-[400px] p-3 rounded-b-md shadow-sm relative z-0">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>
                ) : (
                    <div className="space-y-4">
                        {/* TAB: NETWORK & INTERESTS */}
                        {activeTab === 'INTERESTS' && (
                            <div className="space-y-4">
                                {/* 1. MEMBERSHIPS */}
                                <div>
                                    <div className="bg-[#f7f7f7] border-b border-[#e9e9e9] p-2 text-[11px] font-bold text-[#3b5998] flex items-center gap-2 mb-1">
                                        <Building2 className="w-3 h-3" /> Üyesi Olduğum Kurumlar
                                    </div>
                                    <div className="space-y-1">
                                        {managedPages.length > 0 ? managedPages.map(org => (
                                            <div key={org.id} className="flex items-center justify-between p-2 hover:bg-[#eff0f5] border border-transparent hover:border-[#d8dfea] rounded-sm transition-colors group">
                                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/org/${org.id}`)}>
                                                    <div className="w-8 h-8 bg-white border border-[#ccc] flex items-center justify-center overflow-hidden rounded-sm">
                                                        {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover"/> : <Building2 className="w-4 h-4 text-gray-400" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[11px] text-[#3b5998] hover:underline">{org.name}</div>
                                                        <div className="text-[9px] text-green-600 font-bold uppercase flex items-center gap-1">
                                                            <CheckCircle2 className="w-2.5 h-2.5" /> Üye
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleLeaveOrganization(org.id)} className="text-[10px] text-[#999] hover:text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Ayrıl
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="text-center py-4 text-[11px] text-gray-400 bg-[#f9f9f9] border border-[#eee]">
                                                Henüz bir işletmeye üye değilsiniz. <span onClick={() => navigate('/lobby')} className="text-[#3b5998] cursor-pointer hover:underline">Grup Bul.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. CHANNELS */}
                                <div>
                                    <div className="bg-[#f7f7f7] border-b border-[#e9e9e9] p-2 text-[11px] font-bold text-[#3b5998] flex items-center gap-2 mb-1">
                                        <Tv className="w-3 h-3" /> Kanal Abonelikleri
                                    </div>
                                    <div className="space-y-1">
                                        {subscribedChannels.length > 0 ? subscribedChannels.map(item => (
                                            <div key={item.channel.id} className="flex items-center justify-between p-2 hover:bg-[#eff0f5] border border-transparent hover:border-[#d8dfea] rounded-sm transition-colors group">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-[#d8dfea] flex items-center justify-center text-[#3b5998] rounded-sm border border-[#ccc]">
                                                        <Hash className="w-3 h-3" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[11px] text-[#333]">{item.channel.name}</div>
                                                        <div className="text-[9px] text-gray-500">{item.organization.name}</div>
                                                    </div>
                                                </div>
                                                {!item.channel.isMandatory && (
                                                    <button onClick={() => handleUnsubscribeChannel(item.channel.id)} className="text-[9px] text-[#999] hover:text-red-500 font-bold opacity-0 group-hover:opacity-100">Kaldır</button>
                                                )}
                                            </div>
                                        )) : (
                                            <div className="text-center py-4 text-[11px] text-gray-400 bg-[#f9f9f9] border border-[#eee]">Hiçbir kanala abone değilsiniz.</div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. FOLLOWED PAGES */}
                                <div>
                                    <div className="bg-[#f7f7f7] border-b border-[#e9e9e9] p-2 text-[11px] font-bold text-[#3b5998] flex items-center gap-2 mb-1">
                                        <ExternalLink className="w-3 h-3" /> Takip Edilen Sayfalar
                                    </div>
                                    <div className="space-y-1">
                                        {followedPages.length > 0 ? followedPages.map(page => (
                                            <div key={page.id} className="flex items-center justify-between p-2 hover:bg-[#eff0f5] border border-transparent hover:border-[#d8dfea] rounded-sm transition-colors group">
                                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/org/${page.id}`)}>
                                                    <div className="w-8 h-8 bg-white border border-[#ccc] flex items-center justify-center overflow-hidden rounded-sm">
                                                        {page.logoUrl ? <img src={page.logoUrl} className="w-full h-full object-cover"/> : <Building2 className="w-4 h-4 text-gray-400" />}
                                                    </div>
                                                    <div className="font-bold text-[11px] text-[#3b5998] hover:underline">{page.name}</div>
                                                </div>
                                                <button onClick={() => handleUnfollowPage(page.id)} className="text-[10px] text-[#999] hover:text-red-600 font-bold opacity-0 group-hover:opacity-100">
                                                    Bırak
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="text-center py-4 text-[11px] text-gray-400 bg-[#f9f9f9] border border-[#eee]">Takip edilen sayfa yok.</div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. TAGS */}
                                <div className="p-2 border border-[#e9e9e9] bg-[#f9f9f9] rounded-sm">
                                    <h4 className="text-[10px] font-bold text-gray-500 mb-2 uppercase">İlgi Alanları (Etiketler)</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {currentUser.followedTags && currentUser.followedTags.length > 0 ? currentUser.followedTags.map(tag => (
                                            <span key={tag} className="bg-white border border-[#d8dfea] text-[#3b5998] px-2 py-1 text-[10px] font-bold flex items-center gap-1 group cursor-default shadow-sm">
                                                #{tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="text-[#ccc] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                                            </span>
                                        )) : (
                                            <span className="text-[11px] text-gray-400 italic">Etiket takip etmiyorsunuz.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: POSTS */}
                        {activeTab === 'POSTS' && (
                            <div className="p-1">
                                <div className="grid grid-cols-3 gap-1">
                                    {myPosts.map(post => (
                                        <div key={post.id} className="aspect-square bg-[#eee] relative border border-[#ccc] hover:opacity-90 cursor-pointer">
                                            <img src={post.mediaUrl} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {myPosts.length === 0 && <div className="col-span-3 text-center py-10 text-gray-400 text-xs bg-[#f9f9f9] border border-[#eee]">Henüz gönderi yok.</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
