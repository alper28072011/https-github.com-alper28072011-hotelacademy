
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContentStore } from '../../stores/useContentStore';
import { getCareerPath, getFeedPosts } from '../../services/db';
import { StoryCircle } from './components/StoryCircle';
import { FeedPostCard } from './components/FeedPostCard';
import { X, Quote, Map, RefreshCw } from 'lucide-react';
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

  // 1. Fetch Content & Stories
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    const loadData = async () => {
        if (!currentUser) return;
        
        // --- LOAD STORIES (COURSES) ---
        // Filter courses relevant to user (Career Path or Featured)
        let relevantCourses: Course[] = [];
        if (currentUser.assignedPathId) {
            const path = await getCareerPath(currentUser.assignedPathId);
            if (path) {
                const pendingIds = path.courseIds.filter(id => !currentUser.completedCourses.includes(id));
                const pathCourses = courses.filter(c => pendingIds.includes(c.id));
                relevantCourses = [...relevantCourses, ...pathCourses];
            }
        }
        // Fill remaining slots
        if (relevantCourses.length < 5) {
             const others = courses.filter(c => 
                !currentUser.completedCourses.includes(c.id) && 
                !relevantCourses.find(rc => rc.id === c.id) && 
                c.isFeatured
             );
             relevantCourses = [...relevantCourses, ...others];
        }
        setStoryCourses(relevantCourses.slice(0, 8));

        // --- LOAD FEED POSTS ---
        const posts = await getFeedPosts(currentUser.department);
        setFeedPosts(posts);
    };

    loadData();
  }, [currentUser, courses]);

  const handleRefresh = async () => {
      if(!currentUser) return;
      setIsRefreshing(true);
      const posts = await getFeedPosts(currentUser.department);
      setFeedPosts(posts);
      setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      
      {/* HEADER: Hotelgram Style */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-100 px-4 py-3 flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-primary font-bold text-lg">H</span>
            </div>
            <span className="text-primary font-bold text-xl tracking-tight">Hotelgram</span>
         </div>
         <div className="flex items-center gap-4">
            <button onClick={handleRefresh} className={`${isRefreshing ? 'animate-spin' : ''}`}>
                <RefreshCw className="w-6 h-6 text-gray-700" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden cursor-pointer" onClick={logout}>
                <div className="w-full h-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                    {currentUser?.avatar}
                </div>
            </div>
         </div>
      </div>

      {/* STORIES SECTION (Sticky below header) */}
      <div className="bg-white py-4 border-b border-gray-100 overflow-x-auto no-scrollbar">
         <div className="flex gap-4 px-4 min-w-max">
            
            {/* GM Message (Story) */}
            <StoryCircle 
                label={t('stories_gm')} 
                image="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150" 
                status="urgent"
                onClick={() => setShowGmModal(true)}
            />

            {/* Courses as Stories */}
            {storyCourses.map(course => (
                <StoryCircle 
                    key={course.id} 
                    label={course.title.substring(0, 12) + "..."} 
                    image={course.thumbnailUrl} 
                    status="new"
                    onClick={() => navigate(`/course/${course.id}`)}
                />
            ))}
            
            {/* Journey Map Link (Special Bubble) */}
            <div className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group" onClick={() => navigate('/journey')}>
                <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-blue-400 to-indigo-600">
                    <div className="bg-white rounded-full p-[2px]">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <Map className="w-8 h-8 text-indigo-600" />
                        </div>
                    </div>
                </div>
                <span className="text-xs font-medium text-gray-700">Yolculuğum</span>
            </div>
         </div>
      </div>

      {/* FEED SECTION */}
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
