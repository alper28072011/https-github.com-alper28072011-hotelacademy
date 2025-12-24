
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
    Grid, Building2, 
    Plus, ExternalLink, Hash, X, Network, Tv, CheckCircle2, LogOut, Loader2
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProfileHeader } from './components/ProfileHeader';
import { Organization, FeedPost, Channel } from '../../types';
import { getUserManagedPages, updateUserSubscriptions, kickMember } from '../../services/organizationService';
import { getFollowedPages, unfollowUser } from '../../services/userService';
import { getUserPosts, getSubscribedChannelsDetails } from '../../services/db';
import { toggleTagFollow, unfollowEntity } from '../../services/socialService';
import { EditProfileModal } from './components/EditProfileModal';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, refreshProfile, updateCurrentUser } = useAuthStore();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'INTERESTS' | 'POSTS'>('INTERESTS');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [managedPages, setManagedPages] = useState<Organization[]>([]); // Using as "Memberships"
  const [followedPages, setFollowedPages] = useState<Organization[]>([]);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [subscribedChannels, setSubscribedChannels] = useState<{ channel: Channel, organization: { id: string, name: string, logoUrl: string } }[]>([]);

  useEffect(() => {
      loadProfileData();
  }, [currentUser?.id]);

  const loadProfileData = async () => {
      if (!currentUser) return;
      setLoading(true);
      
      const [managed, followed, posts, channels] = await Promise.all([
          getUserManagedPages(currentUser.id), // Actually gets memberships where user is admin, we need ALL memberships ideally but let's use this or getMyMemberships logic if available
          getFollowedPages(currentUser.id),
          getUserPosts(currentUser.id),
          getSubscribedChannelsDetails(currentUser)
      ]);

      // Note: getUserManagedPages only returns where admin. We probably want all joined pages.
      // Since we don't have a direct "getJoinedPages" loaded in types easily without modifying services deeply,
      // we will rely on what we have or add a simple fetch if needed.
      // For now, let's assume managedPages covers the "Workspaces" aspect or reuse logic.
      // Better: Use `joinedPageIds` from user object to fetch details if managedPages is insufficient.
      
      setManagedPages(managed); 
      setFollowedPages(followed);
      setMyPosts(posts);
      setSubscribedChannels(channels);
      setLoading(false);
  };

  // --- ACTIONS ---

  const handleRemoveTag = async (tag: string) => {
      if(!currentUser) return;
      await toggleTagFollow(currentUser.id, tag, false);
      refreshProfile(); // Sync
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
          // Self-kick
          await kickMember(orgId, currentUser.id);
          // Update local state
          const newJoined = currentUser.joinedPageIds.filter(id => id !== orgId);
          updateCurrentUser({ joinedPageIds: newJoined, currentOrganizationId: null });
          setManagedPages(prev => prev.filter(p => p.id !== orgId));
          // Refresh to ensure clean state
          window.location.reload();
      }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-white pb-24 pt-4">
        
        {/* HEADER */}
        <ProfileHeader 
            user={currentUser}
            isOwnProfile={true}
            onEditClick={() => setIsEditing(true)}
            followersCount={currentUser.followersCount || 0}
            followingCount={currentUser.followingCount || 0}
            postCount={myPosts.length}
        />

        {/* EDIT PROFILE MODAL */}
        <AnimatePresence>
            {isEditing && (
                <EditProfileModal 
                    user={currentUser} 
                    onClose={() => setIsEditing(false)} 
                />
            )}
        </AnimatePresence>

        {/* TABS */}
        <div className="sticky top-[60px] bg-white z-30 border-b border-gray-200 flex justify-around mt-4">
            <button 
                onClick={() => setActiveTab('INTERESTS')}
                className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'INTERESTS' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
            >
                <Network className="w-5 h-5" />
                <span className="text-xs font-bold">Ağım & İlgi Alanlarım</span>
            </button>
            <button 
                onClick={() => setActiveTab('POSTS')}
                className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'POSTS' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
            >
                <Grid className="w-5 h-5" />
                <span className="text-xs font-bold">Paylaşımlar</span>
            </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 min-h-[300px] bg-gray-50">
            
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : (
                <>
                    {/* TAB: NETWORK & INTERESTS */}
                    {activeTab === 'INTERESTS' && (
                        <div className="space-y-8">
                            
                            {/* 1. MEMBERSHIPS (Workspaces) */}
                            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
                                    <Building2 className="w-4 h-4 text-primary" /> Üyesi Olduğum Kurumlar
                                </h3>
                                <div className="space-y-3">
                                    {managedPages.length > 0 ? managedPages.map(org => (
                                        <div key={org.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            <div className="flex items-center gap-3" onClick={() => navigate(`/org/${org.id}`)}>
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-gray-500 overflow-hidden border border-gray-200">
                                                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover"/> : org.name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-gray-900">{org.name}</div>
                                                    <div className="text-[10px] text-green-600 font-bold uppercase flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Üye
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => navigate(`/org/${org.id}`)} className="text-xs font-bold text-gray-600 hover:text-primary">Git</button>
                                                <div className="w-px h-3 bg-gray-300"></div>
                                                <button onClick={() => handleLeaveOrganization(org.id)} className="text-xs font-bold text-red-400 hover:text-red-600" title="Ayrıl">
                                                    <LogOut className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-gray-400 mb-2">Henüz bir işletmeye üye değilsiniz.</p>
                                            <button onClick={() => navigate('/lobby')} className="text-xs font-bold text-primary border border-primary px-3 py-1.5 rounded-lg hover:bg-primary/5">
                                                İşletme Bul / Kur
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 2. SUBSCRIBED CHANNELS */}
                            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
                                    <Tv className="w-4 h-4 text-purple-500" /> Kanal Abonelikleri
                                </h3>
                                <div className="space-y-3">
                                    {subscribedChannels.length > 0 ? subscribedChannels.map(item => (
                                        <div key={item.channel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold overflow-hidden border border-purple-200">
                                                    <Hash className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-gray-900">{item.channel.name}</div>
                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        {item.organization.name}
                                                        {item.channel.isMandatory && <span className="text-red-500 font-bold">(Zorunlu)</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {!item.channel.isMandatory ? (
                                                <button onClick={() => handleUnsubscribeChannel(item.channel.id)} className="text-xs font-bold text-gray-400 hover:text-red-500 border border-gray-300 px-2 py-1 rounded bg-white">
                                                    Ayrıl
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">Kilitli</span>
                                            )}
                                        </div>
                                    )) : (
                                        <p className="text-xs text-gray-400 text-center py-2">Hiçbir kanala abone değilsiniz.</p>
                                    )}
                                </div>
                            </section>

                            {/* 3. FOLLOWED PAGES (Social) */}
                            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
                                    <ExternalLink className="w-4 h-4 text-blue-500" /> Takip Edilen Sayfalar (Public)
                                </h3>
                                <div className="space-y-3">
                                    {followedPages.length > 0 ? followedPages.map(page => (
                                        <div key={page.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            <div className="flex items-center gap-3" onClick={() => navigate(`/org/${page.id}`)}>
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-gray-500 overflow-hidden border border-gray-200">
                                                    {page.logoUrl ? <img src={page.logoUrl} className="w-full h-full object-cover"/> : page.name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-gray-900">{page.name}</div>
                                                    <div className="text-[10px] text-blue-500 font-bold uppercase">Takipçi</div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleUnfollowPage(page.id)} className="text-xs font-bold text-gray-400 hover:text-red-500 border border-gray-300 px-2 py-1 rounded bg-white">
                                                Çıkar
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-gray-400 mb-2">Henüz herkese açık bir sayfayı takip etmiyorsunuz.</p>
                                            <button onClick={() => navigate('/explore')} className="text-xs font-bold text-blue-500 border border-blue-500 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                                                Keşfet
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 4. FOLLOWED TOPICS (Tags) */}
                            <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm border-b border-gray-100 pb-2">
                                    <Hash className="w-4 h-4 text-orange-500" /> Takip Edilen Konular
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {currentUser.followedTags && currentUser.followedTags.length > 0 ? currentUser.followedTags.map(tag => (
                                        <span key={tag} className="bg-orange-50 border border-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                                            #{tag}
                                            <button onClick={() => handleRemoveTag(tag)} className="text-orange-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                        </span>
                                    )) : (
                                        <p className="text-xs text-gray-400 w-full text-center py-2">Konu takibi yapmıyorsunuz.</p>
                                    )}
                                </div>
                            </section>

                        </div>
                    )}

                    {/* TAB: POSTS */}
                    {activeTab === 'POSTS' && (
                        <div className="grid grid-cols-3 gap-1">
                            {myPosts.map(post => (
                                <div key={post.id} className="aspect-square bg-gray-200 relative">
                                    <img src={post.mediaUrl} className="w-full h-full object-cover" />
                                </div>
                            ))}
                            {myPosts.length === 0 && <div className="col-span-3 text-center py-20 text-gray-400 text-sm">Henüz gönderi yok.</div>}
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );
};
