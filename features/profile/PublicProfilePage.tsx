
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus, UserCheck, Grid, Heart, BookOpen, Lock, MoreHorizontal } from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, FeedPost, Course, FollowStatus } from '../../types';
import { getUserById, getUserPosts, getInstructorCourses } from '../../services/db';
import { followUserSmart, unfollowUserSmart, checkFollowStatus } from '../../services/socialService';
import { useAuthStore } from '../../stores/useAuthStore';
import { MasonryGrid } from '../explore/components/MasonryGrid';
import { ProfileHeader } from './components/ProfileHeader';

export const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  // Data
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<FeedPost[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Social State
  const [followStatus, setFollowStatus] = useState<FollowStatus>('NONE');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'POSTS' | 'COURSES'>('POSTS');

  // --- ARCHITECTURE FIX: REDIRECT IF SELF ---
  // If the user tries to view their own "public" profile, redirect to the main "Me" dashboard.
  if (currentUser && userId === currentUser.id) {
      return <Navigate to="/profile" replace />;
  }

  const isMe = currentUser?.id === userId;

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);
      
      const user = await getUserById(userId);
      setProfileUser(user);

      if (currentUser && user) {
          const status = await checkFollowStatus(currentUser.id, user.id);
          setFollowStatus(status);
          
          // Privacy Gate: If Private AND Not Following AND Not Me -> Don't fetch content
          const canView = !user.isPrivate || status === 'FOLLOWING' || isMe;
          
          if (canView) {
              const [posts, courses] = await Promise.all([
                  getUserPosts(userId),
                  getInstructorCourses(userId)
              ]);
              setUserPosts(posts);
              setCreatedCourses(courses);
          }
      }
      setLoading(false);
    };
    fetchData();
  }, [userId, currentUser, isMe]);

  const handleFollowToggle = async () => {
      if (!currentUser || !profileUser || isActionLoading) return;
      setIsActionLoading(true);

      if (followStatus === 'FOLLOWING' || followStatus === 'PENDING') {
          // Unfollow
          await unfollowUserSmart(currentUser.id, profileUser.id);
          setFollowStatus('NONE');
          // Optimistic update for counters
          if (followStatus === 'FOLLOWING') {
              setProfileUser(prev => prev ? ({...prev, followersCount: Math.max(0, (prev.followersCount || 0) - 1)}) : null);
          }
      } else {
          // Follow
          const res = await followUserSmart(currentUser.id, profileUser.id);
          setFollowStatus(res.status);
          if (res.status === 'FOLLOWING') {
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
              setProfileUser(prev => prev ? ({...prev, followersCount: (prev.followersCount || 0) + 1}) : null);
          } else {
              alert("Takip isteği gönderildi.");
          }
      }
      setIsActionLoading(false);
  };

  const isContentHidden = profileUser?.isPrivate && followStatus !== 'FOLLOWING' && !isMe;

  if (loading) {
      return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!profileUser) return <div>User not found</div>;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header / Nav */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md z-30 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-800">
                  <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="font-bold text-lg text-gray-900">{profileUser.name}</h1>
          </div>
          <button className="text-gray-800"><MoreHorizontal className="w-6 h-6" /></button>
      </div>

      {/* Profile Header (Centralized Logic) */}
      <ProfileHeader 
          user={profileUser}
          isOwnProfile={isMe}
          followersCount={profileUser.followersCount}
          followingCount={profileUser.followingCount}
          postCount={userPosts.length}
      />

      {/* Social Actions (Follow etc) - Only if not own profile */}
      {!isMe && (
          <div className="px-6 mb-4">
              <div className="flex gap-2">
                  <button 
                    onClick={handleFollowToggle}
                    disabled={isActionLoading}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        followStatus === 'FOLLOWING' 
                        ? 'bg-gray-100 text-gray-800 border border-gray-200' 
                        : followStatus === 'PENDING'
                            ? 'bg-gray-100 text-gray-500 border border-gray-200'
                            : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    }`}
                  >
                      {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                       followStatus === 'FOLLOWING' ? <><UserCheck className="w-4 h-4" /> Takiptesin</> : 
                       followStatus === 'PENDING' ? 'İstek Gönderildi' :
                       <><UserPlus className="w-4 h-4" /> Takip Et</>}
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-800 font-bold py-2 rounded-lg text-sm hover:bg-gray-200">
                      Mesaj
                  </button>
              </div>
          </div>
      )}

      {/* Tabs */}
      <div className="border-t border-gray-100 sticky top-[60px] bg-white z-20 flex justify-center">
          <button 
            onClick={() => setActiveTab('POSTS')}
            className={`p-3 flex-1 flex justify-center border-b-2 transition-colors ${activeTab === 'POSTS' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
          >
              <Grid className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('COURSES')}
            className={`p-3 flex-1 flex justify-center border-b-2 transition-colors ${activeTab === 'COURSES' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
          >
              <BookOpen className="w-6 h-6" />
          </button>
      </div>

      {/* Content */}
      <div className="bg-gray-50 min-h-[300px]">
          {isContentHidden ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                  <div className="p-4 rounded-full border-2 border-gray-300">
                      <Lock className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                      <h3 className="font-bold text-gray-800">Bu Hesap Gizli</h3>
                      <p className="text-sm">Fotoğraflarını ve videolarını görmek için bu hesabı takip et.</p>
                  </div>
              </div>
          ) : (
              <>
                  {activeTab === 'POSTS' ? (
                      <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                          {userPosts.map(post => (
                              <div key={post.id} className="aspect-square bg-gray-200 relative group overflow-hidden cursor-pointer">
                                  {post.type === 'video' ? (
                                      <video src={post.mediaUrl} className="w-full h-full object-cover" />
                                  ) : (
                                      <img src={post.mediaUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                  )}
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="flex items-center gap-1 text-white font-bold">
                                          <Heart className="w-5 h-5 fill-white" /> {post.likes}
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {userPosts.length === 0 && <div className="col-span-3 py-12 text-center text-gray-400 text-sm">Henüz gönderi yok.</div>}
                      </div>
                  ) : (
                      <div className="p-4">
                          <MasonryGrid courses={createdCourses} />
                          {createdCourses.length === 0 && <div className="text-center py-10 text-gray-400">Henüz yayınlanmış kurs yok.</div>}
                      </div>
                  )}
              </>
          )}
      </div>
    </div>
  );
};
