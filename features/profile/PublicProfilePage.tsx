
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, UserPlus, UserCheck, Grid, Heart, MessageCircle, BookOpen, Star, DollarSign, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, FeedPost, Course } from '../../types';
import { getUserById, getUserPosts, followUser, unfollowUser, getInstructorCourses } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { MasonryGrid } from '../explore/components/MasonryGrid'; // Reuse component

export const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<FeedPost[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'POSTS' | 'COURSES'>('POSTS');

  const isMe = currentUser?.id === userId;

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);
      const [user, posts, courses] = await Promise.all([
          getUserById(userId),
          getUserPosts(userId),
          getInstructorCourses(userId)
      ]);
      
      setProfileUser(user);
      setUserPosts(posts);
      setCreatedCourses(courses);
      
      // Check follow status
      if (currentUser && user) {
          setIsFollowing(user.followers?.includes(currentUser.id) || false);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [userId, currentUser]);

  const handleFollowToggle = async () => {
      if (!currentUser || !profileUser || isActionLoading) return;
      setIsActionLoading(true);

      if (isFollowing) {
          await unfollowUser(currentUser.id, profileUser.id);
          setIsFollowing(false);
          setProfileUser(prev => prev ? ({...prev, followersCount: (prev.followersCount || 1) - 1}) : null);
      } else {
          await followUser(currentUser.id, profileUser.id);
          setIsFollowing(true);
          confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#D4AF37', '#0B1E3B']
          });
          setProfileUser(prev => prev ? ({...prev, followersCount: (prev.followersCount || 0) + 1}) : null);
      }
      setIsActionLoading(false);
  };

  if (loading) {
      return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!profileUser) return <div>User not found</div>;

  const isInstructor = createdCourses.length > 0 || profileUser.instructorProfile;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header / Nav */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md z-30 border-b border-gray-100 px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-800">
              <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg text-gray-900">{profileUser.name}</h1>
          {isInstructor && <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Eğitmen</span>}
      </div>

      {/* Profile Header */}
      <div className="p-6">
          <div className="flex items-center gap-6 mb-6">
              {/* Avatar */}
              <div className="relative">
                  <div className={`w-20 h-20 rounded-full p-[2px] ${isInstructor ? 'bg-gradient-to-tr from-blue-400 to-indigo-600' : 'bg-gradient-to-tr from-accent to-purple-500'}`}>
                      <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100">
                          {profileUser.avatar.length > 5 ? (
                              <img src={profileUser.avatar} className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary text-white font-bold text-xl">{profileUser.avatar}</div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Stats */}
              <div className="flex-1 flex justify-around text-center">
                  <div>
                      <div className="font-bold text-lg text-gray-900">{userPosts.length}</div>
                      <div className="text-xs text-gray-500">Gönderi</div>
                  </div>
                  <div>
                      <div className="font-bold text-lg text-gray-900">{profileUser.followersCount || 0}</div>
                      <div className="text-xs text-gray-500">Takipçi</div>
                  </div>
                  <div>
                      <div className="font-bold text-lg text-gray-900">{profileUser.followingCount || 0}</div>
                      <div className="text-xs text-gray-500">Takip</div>
                  </div>
              </div>
          </div>

          {/* Bio */}
          <div className="mb-4">
              <h2 className="font-bold text-gray-900 text-sm">{profileUser.department.toUpperCase().replace('_', ' ')}</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
                  {profileUser.bio || "Hotel Academy Member"}
              </p>
          </div>

          {/* Instructor Stats (If applicable) */}
          {isInstructor && (
              <div className="grid grid-cols-3 gap-2 mb-6 bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <div className="text-center">
                      <div className="text-blue-700 font-bold flex items-center justify-center gap-1"><BookOpen className="w-3 h-3" /> {createdCourses.length}</div>
                      <div className="text-[10px] text-blue-400">Kurs</div>
                  </div>
                  <div className="text-center border-l border-blue-100">
                      <div className="text-blue-700 font-bold flex items-center justify-center gap-1"><Users className="w-3 h-3" /> {profileUser.instructorProfile?.totalStudents || 0}</div>
                      <div className="text-[10px] text-blue-400">Öğrenci</div>
                  </div>
                  <div className="text-center border-l border-blue-100">
                      <div className="text-blue-700 font-bold flex items-center justify-center gap-1"><Star className="w-3 h-3 fill-blue-700" /> {profileUser.instructorProfile?.averageRating || '5.0'}</div>
                      <div className="text-[10px] text-blue-400">Puan</div>
                  </div>
              </div>
          )}

          {/* Actions */}
          {isMe ? (
              <button 
                onClick={() => navigate('/profile')} 
                className="w-full bg-gray-100 text-gray-800 font-bold py-2 rounded-lg text-sm"
              >
                  Profili Düzenle
              </button>
          ) : (
              <div className="flex gap-2">
                  <button 
                    onClick={handleFollowToggle}
                    disabled={isActionLoading}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        isFollowing 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-primary text-white shadow-lg shadow-primary/20'
                    }`}
                  >
                      {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? <><UserCheck className="w-4 h-4" /> Takip Ediliyor</> : <><UserPlus className="w-4 h-4" /> Takip Et</>}
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-800 font-bold py-2 rounded-lg text-sm">
                      Mesaj
                  </button>
              </div>
          )}
      </div>

      {/* Tabs */}
      <div className="border-t border-gray-100 sticky top-[60px] bg-white z-20">
          <div className="flex justify-center">
              <button 
                onClick={() => setActiveTab('POSTS')}
                className={`p-3 border-b-2 flex-1 flex justify-center ${activeTab === 'POSTS' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
              >
                  <Grid className="w-6 h-6" />
              </button>
              {isInstructor && (
                  <button 
                    onClick={() => setActiveTab('COURSES')}
                    className={`p-3 border-b-2 flex-1 flex justify-center ${activeTab === 'COURSES' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
                  >
                      <BookOpen className="w-6 h-6" />
                  </button>
              )}
          </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 min-h-[300px]">
          {activeTab === 'POSTS' ? (
              <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                  {userPosts.map(post => (
                      <div key={post.id} className="aspect-square bg-gray-200 relative group overflow-hidden">
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
      </div>
    </div>
  );
};
