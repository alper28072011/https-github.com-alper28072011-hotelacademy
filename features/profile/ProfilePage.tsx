
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
    Grid, Bookmark, Building2, 
    Plus, ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProfileHeader } from './components/ProfileHeader';
import { Organization, FeedPost } from '../../types';
import { getUserManagedPages } from '../../services/organizationService';
import { getFollowedPages } from '../../services/userService';
import { getUserPosts } from '../../services/db';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'POSTS' | 'PAGES' | 'SAVED'>('POSTS');
  const [isEditing, setIsEditing] = useState(false);
  
  // Data State
  const [managedPages, setManagedPages] = useState<Organization[]>([]);
  const [followedPages, setFollowedPages] = useState<Organization[]>([]);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
      if (currentUser) {
          // Fetch Managed Pages
          getUserManagedPages(currentUser.id).then(setManagedPages);
          // Fetch Followed Pages
          getFollowedPages(currentUser.id).then(setFollowedPages);
          // Fetch Posts
          getUserPosts(currentUser.id).then(setMyPosts);
      }
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-white pb-24 pt-4">
        
        {/* HEADER: Social Stats */}
        <ProfileHeader 
            user={currentUser}
            isOwnProfile={true}
            onEditClick={() => setIsEditing(true)}
            followersCount={currentUser.followers?.length || 0}
            followingCount={currentUser.following?.length || 0}
            postCount={myPosts.length}
        />

        {/* TABS */}
        <div className="sticky top-[60px] bg-white z-30 border-b border-gray-200 flex justify-around">
            <button 
                onClick={() => setActiveTab('POSTS')}
                className={`py-3 px-4 border-b-2 transition-all ${activeTab === 'POSTS' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
            >
                <Grid className="w-6 h-6" />
            </button>
            <button 
                onClick={() => setActiveTab('PAGES')}
                className={`py-3 px-4 border-b-2 transition-all ${activeTab === 'PAGES' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
            >
                <Building2 className="w-6 h-6" />
            </button>
            <button 
                onClick={() => setActiveTab('SAVED')}
                className={`py-3 px-4 border-b-2 transition-all ${activeTab === 'SAVED' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
            >
                <Bookmark className="w-6 h-6" />
            </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 min-h-[300px]">
            
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

            {/* TAB: PAGES & COMMUNITIES */}
            {activeTab === 'PAGES' && (
                <div className="space-y-6">
                    {/* Create New */}
                    <button 
                        onClick={() => navigate('/lobby')}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
                    >
                        <Plus className="w-5 h-5" /> Yeni Sayfa Oluştur
                    </button>

                    {/* Managed Pages */}
                    {managedPages.length > 0 && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">Yönettiğim Sayfalar</h3>
                            <div className="space-y-3">
                                {managedPages.map(page => (
                                    <div key={page.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center font-bold text-gray-500">
                                                {page.logoUrl ? <img src={page.logoUrl} className="w-full h-full object-cover rounded-lg"/> : page.name[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-900">{page.name}</div>
                                                <div className="text-xs text-gray-500">{page.followersCount} Takipçi</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => navigate(`/admin`)} // Should set context first
                                            className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg"
                                        >
                                            Yönet
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Followed Pages */}
                    {followedPages.length > 0 && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">Takip Ettiklerim</h3>
                            <div className="space-y-3">
                                {followedPages.map(page => (
                                    <div key={page.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm" onClick={() => navigate(`/org/${page.id}`)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-500">
                                                {page.name[0]}
                                            </div>
                                            <div className="font-bold text-sm text-gray-900">{page.name}</div>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: SAVED */}
            {activeTab === 'SAVED' && (
                <div className="text-center py-20 text-gray-400">
                    <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    Kaydedilen içerik yok.
                </div>
            )}
        </div>
    </div>
  );
};
