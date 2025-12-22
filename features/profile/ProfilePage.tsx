
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
    Grid, Bookmark, Building2, 
    Plus, ExternalLink, Hash, X, Briefcase
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProfileHeader } from './components/ProfileHeader';
import { Organization, FeedPost } from '../../types';
import { getUserManagedPages } from '../../services/organizationService';
import { getFollowedPages } from '../../services/userService';
import { getUserPosts } from '../../services/db';
import { toggleTagFollow } from '../../services/socialService';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, refreshProfile } = useAuthStore();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'INTERESTS' | 'WORKSPACES' | 'POSTS'>('INTERESTS');
  const [isEditing, setIsEditing] = useState(false);
  
  // Data State
  const [managedPages, setManagedPages] = useState<Organization[]>([]);
  const [followedPages, setFollowedPages] = useState<Organization[]>([]);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
      if (currentUser) {
          getUserManagedPages(currentUser.id).then(setManagedPages);
          getFollowedPages(currentUser.id).then(setFollowedPages);
          getUserPosts(currentUser.id).then(setMyPosts);
      }
  }, [currentUser]);

  const handleRemoveTag = async (tag: string) => {
      if(!currentUser) return;
      await toggleTagFollow(currentUser.id, tag, false);
      refreshProfile(); // Sync local state
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

        {/* TABS */}
        <div className="sticky top-[60px] bg-white z-30 border-b border-gray-200 flex justify-around">
            <button 
                onClick={() => setActiveTab('INTERESTS')}
                className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'INTERESTS' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
            >
                <Hash className="w-5 h-5" />
                <span className="text-xs font-bold">İlgi Alanları</span>
            </button>
            <button 
                onClick={() => setActiveTab('WORKSPACES')}
                className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'WORKSPACES' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
            >
                <Briefcase className="w-5 h-5" />
                <span className="text-xs font-bold">Çalışma Alanı</span>
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
        <div className="p-4 min-h-[300px]">
            
            {/* TAB: INTERESTS & FEED CONFIG */}
            {activeTab === 'INTERESTS' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-primary" /> Takip Edilen Konular
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {currentUser.followedTags?.map(tag => (
                                <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                                    #{tag}
                                    <button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                            {(!currentUser.followedTags || currentUser.followedTags.length === 0) && (
                                <p className="text-sm text-gray-400 italic">Henüz bir konu takip etmiyorsunuz. Keşfet sayfasından arama yapabilirsiniz.</p>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">Takip Edilen Sayfalar (Public)</h3>
                        <div className="space-y-3">
                            {followedPages.map(page => (
                                <div key={page.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm" onClick={() => navigate(`/org/${page.id}`)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-500 overflow-hidden">
                                            {page.logoUrl ? <img src={page.logoUrl} className="w-full h-full object-cover"/> : page.name[0]}
                                        </div>
                                        <div className="font-bold text-sm text-gray-900">{page.name}</div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                </div>
                            ))}
                            {followedPages.length === 0 && <p className="text-sm text-gray-400 italic">Henüz bir sayfa takip etmiyorsunuz.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: WORKSPACES (Corporate) */}
            {activeTab === 'WORKSPACES' && (
                <div className="space-y-6">
                    {/* Create New */}
                    <button 
                        onClick={() => navigate('/lobby')}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
                    >
                        <Plus className="w-5 h-5" /> Yeni Çalışma Alanı Bul/Kur
                    </button>

                    {/* Joined Pages (Memberships) */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">Üyesi Olduğum Kurumlar</h3>
                        <div className="space-y-3">
                            {/* Managed Pages are also memberships generally, but let's show all IDs in joinedPageIds */}
                            {/* For this view we rely on `managedPages` and logic to fetch joined ones if separate. 
                                Ideally, fetch organization details for all IDs in currentUser.joinedPageIds */}
                            {currentUser.joinedPageIds?.length === 0 && <p className="text-sm text-gray-400 italic">Henüz bir kuruma katılmadınız.</p>}
                            
                            {/* Note: In a real app we'd fetch these details. Reusing managedPages for now as proxy if user is admin */}
                            {managedPages.map(page => (
                                <div key={page.id} className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center font-bold text-gray-500">
                                            {page.logoUrl ? <img src={page.logoUrl} className="w-full h-full object-cover rounded-lg"/> : page.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-gray-900">{page.name}</div>
                                            <div className="text-[10px] text-blue-600 font-bold uppercase">Yönetici</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/admin`)}
                                        className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg"
                                    >
                                        Yönet
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
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
                    {myPosts.length === 0 && <div className="col-span-3 text-center py-10 text-gray-400">Henüz gönderi yok.</div>}
                </div>
            )}
        </div>
    </div>
  );
};
