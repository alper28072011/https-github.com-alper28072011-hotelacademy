
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContentStore } from '../../stores/useContentStore';
import { getCareerPath } from '../../services/db';
import { StoryCircle, StoryStatus } from './components/StoryCircle';
import { PriorityTaskCard } from './components/PriorityTaskCard';
import { Wrench, Calendar, LogOut, Map, X, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course } from '../../types';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { courses, fetchContent } = useContentStore();
  
  const [storyCourses, setStoryCourses] = useState<Course[]>([]);
  const [showGmModal, setShowGmModal] = useState(false);

  // 1. Fetch Content & Calculate Stories
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    const loadStories = async () => {
        if (!currentUser || courses.length === 0) return;

        let relevantCourses: Course[] = [];

        // Strategy: 
        // 1. If user has a career path, show incomplete courses from there.
        // 2. If not (or few), fill with featured/recommended courses.
        
        if (currentUser.assignedPathId) {
            const path = await getCareerPath(currentUser.assignedPathId);
            if (path) {
                // Get IDs from path that are NOT in completedCourses
                const pendingIds = path.courseIds.filter(id => !currentUser.completedCourses.includes(id));
                const pathCourses = courses.filter(c => pendingIds.includes(c.id));
                relevantCourses = [...relevantCourses, ...pathCourses];
            }
        }

        // Fill up with featured courses if we have space (up to 5 stories)
        if (relevantCourses.length < 5) {
            const otherPending = courses.filter(c => 
                !currentUser.completedCourses.includes(c.id) && 
                !relevantCourses.find(rc => rc.id === c.id) &&
                c.isFeatured
            );
            relevantCourses = [...relevantCourses, ...otherPending];
        }

        setStoryCourses(relevantCourses.slice(0, 6)); // Limit to 6 bubbles
    };

    loadStories();
  }, [currentUser, courses]);


  // Quick Actions Configuration
  const quickActions = [
    { id: 'report', icon: Wrench, label: t('quick_report'), color: 'bg-orange-100 text-orange-600', path: '/report' },
    { id: 'schedule', icon: Calendar, label: t('quick_schedule'), color: 'bg-blue-100 text-blue-600', path: '/operations' }, 
    { id: 'leave', icon: LogOut, label: t('quick_leave'), color: 'bg-purple-100 text-purple-600', path: '/profile' },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Area */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-center text-white">
        <div>
           <p className="text-accent text-sm font-medium tracking-wider uppercase mb-0.5">Hotel Academy</p>
           <h1 className="text-2xl font-bold">{t('welcome_back')} {(currentUser?.name || '').split(' ')[0]}</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold cursor-pointer" onClick={logout}>
            {currentUser?.avatar}
        </div>
      </div>

      {/* Stories Section (Horizontal Scroll) */}
      <div className="w-full overflow-x-auto no-scrollbar pl-6 pb-2 min-h-[110px]">
         <div className="flex gap-4">
            
            {/* 0. GM Message (Static & Urgent) */}
            <StoryCircle 
                label={t('stories_gm')} 
                image="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150" 
                status="urgent"
                onClick={() => setShowGmModal(true)}
            />

            {/* 1..N Course Stories */}
            {storyCourses.map(course => (
                <StoryCircle 
                    key={course.id} 
                    label={course.title} 
                    image={course.thumbnailUrl} 
                    status="new" // Logic could be refined to 'progress' if we tracked %
                    onClick={() => navigate(`/course/${course.id}`)}
                />
            ))}

            {/* Fallback if no courses */}
            {storyCourses.length === 0 && (
                <StoryCircle 
                    label="Hepsini Tamamladın!" 
                    status="viewed"
                />
            )}
         </div>
      </div>

      {/* Journey Map Link Card */}
      <div className="px-4">
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/journey')}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-6 shadow-xl relative overflow-hidden cursor-pointer"
          >
              <div className="absolute top-0 right-0 p-4 opacity-20"><Map className="w-24 h-24 text-white" /></div>
              <div className="relative z-10 text-white">
                  <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-3 border border-white/20">
                      KARİYER YOLU
                  </div>
                  <h3 className="text-xl font-bold mb-1">Geleceğe Yolculuk</h3>
                  <p className="text-indigo-100 text-sm mb-4">Bir sonraki terfi için atman gereken adımları gör.</p>
                  <div className="flex items-center gap-2 text-sm font-bold bg-white text-indigo-600 px-4 py-2 rounded-xl w-max">
                      Haritayı Aç <Map className="w-4 h-4" />
                  </div>
              </div>
          </motion.div>
      </div>

      {/* Hero / Priority Task Section */}
      <div className="px-4">
         <PriorityTaskCard />
      </div>

      {/* Quick Actions Section */}
      <div className="px-6 mt-2">
         <h3 className="text-primary font-bold text-lg mb-4">{t('section_quick_actions')}</h3>
         <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
            {quickActions.map(action => (
                <motion.button 
                    key={action.id}
                    onClick={() => navigate(action.path)}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center justify-center min-w-[100px] h-[100px] bg-white rounded-2xl shadow-sm border border-gray-100"
                >
                    <div className={`p-3 rounded-full mb-2 ${action.color}`}>
                        <action.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{action.label}</span>
                </motion.button>
            ))}
         </div>
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
                            "Günaydın arkadaşlar! Bugün doluluk oranımız %98. Özellikle resepsiyon ve kat hizmetleri ekiplerimizden ekstra özen bekliyorum. Harika bir gün olsun!"
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

      {/* Bottom Spacer for Navigation */}
      <div className="h-8" />
    </div>
  );
};
