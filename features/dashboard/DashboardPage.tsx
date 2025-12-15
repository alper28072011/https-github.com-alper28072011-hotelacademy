
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContentStore } from '../../stores/useContentStore';
import { getFeedPosts } from '../../services/db';
import { StoryCircle, StoryStatus } from './components/StoryCircle';
import { FeedPostCard } from './components/FeedPostCard';
import { X, Quote, Map, RefreshCw, Settings, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course, FeedPost } from '../../types';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { courses, fetchContent } = useContentStore();
  
  const [storyCourses, setStoryCourses] = useState<Course[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [showGmModal, setShowGmModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Guard: Redirect to Lobby if no Org is active
  useEffect(() => {
      if (!currentUser?.currentOrganizationId) {
          navigate('/lobby');
      }
  }, [currentUser, navigate]);

  // 2. Fetch Content
  useEffect(() => {
    if (currentUser && currentUser.currentOrganizationId) {
        fetchContent(currentUser.currentOrganizationId);
    }
  }, [fetchContent, currentUser]);

  useEffect(() => {
    const loadData = async () => {
        if (!currentUser || !currentUser.currentOrganizationId) return;
        
        // --- SMART SORTING ALGORITHM FOR STORIES ---
        
        // 1. Filter Relevant Courses
        const myDept = currentUser.department;
        const relevantCourses = courses.filter(course => {
            if (course.categoryId === 'cat_onboarding') return true;
            if (course.assignmentType === 'GLOBAL') return true;
            if (course.assignmentType === 'DEPARTMENT' && course.targetDepartments?.includes(myDept)) return true;
            return false;
        });

        // 2. Assign Scores
        const getScore = (c: Course) => {
            const isCompleted = currentUser.completedCourses.includes(c.id);
            if (isCompleted) return 0;
            let score = 50; 
            if (c.categoryId === 'cat_onboarding') score += 100;
            if (currentUser.startedCourses?.includes(c.id)) score += 60;
            if (c.priority === 'HIGH') score += 50;
            return score;
        };

        const sortedCourses = relevantCourses.sort((a, b) => getScore(b) - getScore(a));
        setStoryCourses(sortedCourses.slice(0, 15)); 

        // --- LOAD FEED POSTS (Scoped to Org) ---
        const posts = await getFeedPosts(currentUser.department, currentUser.currentOrganizationId);
        setFeedPosts(posts);
    };

    if (courses.length > 0 || currentUser?.currentOrganizationId) {
        loadData();
    }
  }, [currentUser, courses]);

  const handleRefresh = async () => {
      if(!currentUser || !currentUser.currentOrganizationId) return;
      setIsRefreshing(true);
      const posts = await getFeedPosts(currentUser.department, currentUser.currentOrganizationId);
      setFeedPosts(posts);
      setTimeout(() => setIsRefreshing(false), 500);
  };

  const getStoryStatus = (course: Course): StoryStatus => {
      if (!currentUser) return 'viewed';
      if (currentUser.completedCourses.includes(course.id)) return 'viewed';
      if (currentUser.startedCourses?.includes(course.id)) return 'progress';
      if (course.categoryId === 'cat_onboarding') return 'fiery';
      if (course.priority === 'HIGH') return 'urgent';
      return 'mandatory'; 
  };

  // Safe Guard Render
  if (!currentUser?.currentOrganizationId) return null;

  const isOwner = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'super_admin';

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100 px-4 py-3 flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-primary font-bold text-lg">H</span>
            </div>
            <span className="text-primary font-bold text-xl tracking-tight">Hotelgram</span>
         </div>
         <div className="flex items-center gap-4">
            
            {/* OWNER UI BUTTON */}
            {isOwner && (
                <button 
                    onClick={() => navigate('/admin/settings')}
                    className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-primary hover:text-white transition-all shadow-sm"
                    aria-label="Manage Hotel"
                >
                    <Settings className="w-5 h-5" />
                </button>
            )}

            <button onClick={handleRefresh} className={`${isRefreshing ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-6 h-6 text-gray-700" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden cursor-pointer border border-gray-300" onClick={logout}>
                {currentUser?.avatar && currentUser.avatar.length > 4 ? (
                    <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                        {currentUser?.avatar}
                    </div>
                )}
            </div>
         </div>
      </div>

      {/* STORIES */}
      <div className="bg-white py-4 border-b border-gray-100 overflow-x-auto no-scrollbar">
         <div className="flex gap-4 px-4 min-w-max">
            <div className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group" onClick={() => navigate('/journey')}>
                <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-blue-400 to-indigo-600 animate-pulse-slow">
                    <div className="bg-white rounded-full p-[2px]">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                            <Map className="w-7 h-7 text-indigo-600" />
                        </div>
                    </div>
                </div>
                <span className="text-xs font-bold text-gray-800">Yolculuğum</span>
            </div>

            <StoryCircle 
                label={t('stories_gm')} 
                image="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150" 
                status="urgent"
                onClick={() => setShowGmModal(true)}
            />

            {storyCourses.map(course => (
                <StoryCircle 
                    key={course.id} 
                    label={course.title.substring(0, 10) + "..."} 
                    image={course.thumbnailUrl} 
                    status={getStoryStatus(course)}
                    onClick={() => navigate(`/course/${course.id}`)} 
                />
            ))}
         </div>
      </div>

      {/* FEED */}
      <div className="flex-1 max-w-lg mx-auto w-full pb-20">
          {feedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <p>Henüz gönderi yok.</p>
                  <p className="text-sm">Yöneticin bir şeyler paylaştığında burada görünecek.</p>
              </div>
          ) : (
              <div className="md:pt-6">
                  {feedPosts.map(post => (
                      <FeedPostCard key={post.id} post={post} />
                  ))}
              </div>
          )}
      </div>

      {/* GM Message Modal */}
      <AnimatePresence>
        {showGmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setShowGmModal(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                />
                <motion.div 
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="bg-white w-full max-w-sm rounded-3xl overflow-hidden relative z-10 shadow-2xl"
                >
                    <div className="relative h-48">
                        <img 
                            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600" 
                            className="w-full h-full object-cover" 
                            alt="GM" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <button 
                            onClick={() => setShowGmModal(false)}
                            className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-4 left-4 text-white">
                            <div className="text-xs font-bold text-accent uppercase tracking-wider mb-1">Genel Müdür</div>
                            <h3 className="text-xl font-bold">Mr. Anderson</h3>
                        </div>
                    </div>
                    <div className="p-6">
                        <Quote className="w-8 h-8 text-primary/20 mb-2" />
                        <p className="text-gray-600 italic text-lg leading-relaxed mb-6">
                            "Günaydın arkadaşlar! Bugün doluluk oranımız %98. Özellikle resepsiyon ve kat hizmetleri ekiplerimizden ekstra özen bekliyorum."
                        </p>
                        <button 
                            onClick={() => setShowGmModal(false)}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold"
                        >
                            Mesajı Kapat
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
