
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContentStore } from '../../stores/useContentStore';
import { getDashboardFeed } from '../../services/db';
import { getPersonalizedRecommendations } from '../../services/recommendationService';
import { FeedPostCard } from './components/FeedPostCard';
import { StoryRail } from './components/StoryRail';
import { Course, FeedPost } from '../../types';
import { Briefcase, CheckCircle2, Play, Lock, ChevronRight, Target, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getLocalizedContent } from '../../i18n/config';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { fetchContent } = useContentStore();
  
  // State
  const [feedItems, setFeedItems] = useState<(Course | FeedPost)[]>([]);
  const [duties, setDuties] = useState<Course[]>([]);
  const [visionCourses, setVisionCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
        fetchContent(currentUser.currentOrganizationId || ''); 
        loadDashboardData();
    }
  }, [fetchContent, currentUser?.id]);

  const loadDashboardData = async () => {
      if (!currentUser) return;
      setLoading(true);

      try {
          // 1. Fetch Feed
          const feedData = await getDashboardFeed(currentUser);
          setFeedItems(feedData);

          // 2. Fetch Dual Engine Recommendations
          // Use primaryNetworkId if available, else current org context
          const networkId = currentUser.primaryNetworkId || currentUser.currentOrganizationId || '';
          const { duties, vision } = await getPersonalizedRecommendations(currentUser.id, networkId);
          
          setDuties(duties);
          setVisionCourses(vision);

      } catch (error) {
          console.error("Dashboard Load Error:", error);
      } finally {
          setLoading(false);
      }
  };

  if (!currentUser) return null;
  const hasNetwork = !!(currentUser.primaryNetworkId || currentUser.currentOrganizationId);

  return (
    <div className="flex flex-col bg-[#f8f9fa] min-h-full pb-20">
      
      {/* 1. NETWORK UPDATES (Duties) - HERO SECTION */}
      {hasNetwork && (
          <div className="bg-white border-b border-gray-100 pb-6 pt-2">
              <StoryRail user={currentUser} />
              
              {/* Mandatory Tasks / Duties */}
              {duties.length > 0 && (
                  <div className="px-4 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-500 fill-red-500/20" />
                          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Acil Görevler</h3>
                      </div>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                          {duties.map(course => (
                              <div 
                                  key={course.id} 
                                  onClick={() => navigate(`/course/${course.id}`)}
                                  className="min-w-[260px] bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:scale-95 transition-transform"
                              >
                                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                                      <Play className="w-5 h-5 fill-current" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-gray-900 text-sm truncate">{getLocalizedContent(course.title)}</h4>
                                      <div className="text-[10px] text-red-600 font-bold uppercase mt-0.5">Zorunlu Eğitim</div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-red-300" />
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* 2. CAREER VISION (Growth) */}
      <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Kariyer Hedefin</h3>
              </div>
              <button onClick={() => navigate('/journey')} className="text-[10px] font-bold text-blue-600 hover:underline">
                  Haritayı Gör
              </button>
          </div>

          {visionCourses.length > 0 ? (
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] p-5 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                  
                  <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                          <div>
                              <div className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Sıradaki Adım</div>
                              <h2 className="text-lg font-bold leading-tight max-w-[80%]">
                                  {getLocalizedContent(visionCourses[0].title)}
                              </h2>
                          </div>
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                              <Briefcase className="w-5 h-5 text-white" />
                          </div>
                      </div>

                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium text-blue-100">
                              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">+ {visionCourses[0].xpReward} XP</span>
                              <span>{visionCourses[0].duration} dk</span>
                          </div>
                          <button 
                              onClick={() => navigate(`/course/${visionCourses[0].id}`)}
                              className="bg-white text-blue-700 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
                          >
                              Başla
                          </button>
                      </div>
                  </div>
              </div>
          ) : (
              <div 
                  onClick={() => navigate('/journey')}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                      <Target className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700">Henüz Bir Hedefin Yok</h4>
                  <p className="text-xs text-gray-400 mt-1">Kariyer yolu seçmek için tıkla.</p>
              </div>
          )}
      </div>

      {/* 3. FEED (Mixed Content) */}
      <div className="px-4 mt-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Akış</h3>
          {feedItems.length === 0 && !loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                  Henüz akışta bir şey yok.
                  {!hasNetwork && (
                      <button onClick={() => navigate('/lobby')} className="block mx-auto mt-2 text-primary font-bold">
                          Bir ağa katıl
                      </button>
                  )}
              </div>
          ) : (
              <div className="space-y-6">
                  {feedItems.map(item => (
                      <FeedPostCard key={item.id} post={item as any} />
                  ))}
              </div>
          )}
          {loading && <div className="p-10 text-center text-gray-400 text-xs">Yükleniyor...</div>}
      </div>

    </div>
  );
};
