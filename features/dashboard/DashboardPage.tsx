
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
import { Briefcase, CheckCircle2, Play, Lock, ChevronRight, Target, AlertTriangle, PenTool } from 'lucide-react';
import { getLocalizedContent } from '../../i18n/config';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { fetchContent } = useContentStore();
  
  // State
  const [feedItems, setFeedItems] = useState<(Course | FeedPost)[]>([]);
  const [duties, setDuties] = useState<Course[]>([]);
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
          const feedData = await getDashboardFeed(currentUser);
          setFeedItems(feedData);

          const networkId = currentUser.primaryNetworkId || currentUser.currentOrganizationId || '';
          const { duties } = await getPersonalizedRecommendations(currentUser.id, networkId);
          setDuties(duties);

      } catch (error) {
          console.error("Dashboard Load Error:", error);
      } finally {
          setLoading(false);
      }
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-4">
      
      {/* 1. STATUS UPDATE BOX (New) */}
      <div className="bg-white border border-[#bdc7d8] rounded-md p-3 shadow-sm">
          <div className="flex gap-2 mb-3 border-b border-[#e9e9e9] pb-3">
              <button className="text-[11px] font-bold text-[#3b5998] flex items-center gap-1">
                  <PenTool className="w-3 h-3" /> Durum Güncelle
              </button>
              <div className="w-px bg-[#ccc] mx-1"></div>
              <button className="text-[11px] font-bold text-gray-500 hover:text-[#3b5998]">Fotoğraf Ekle</button>
          </div>
          <div className="flex gap-2">
              <input 
                  placeholder="Bugün operasyonda neler oluyor?" 
                  className="flex-1 border-none outline-none text-[13px] text-[#333] placeholder-gray-400 h-8 bg-transparent"
              />
          </div>
          <div className="flex justify-end mt-2">
              <button className="bg-[#3b5998] border border-[#29447e] text-white px-3 py-1 text-[11px] font-bold hover:bg-[#2d4373] rounded-sm">
                  Paylaş
              </button>
          </div>
      </div>

      {/* 2. URGENT DUTIES (Alert Box) */}
      {duties.length > 0 && (
          <div className="bg-white border border-[#bdc7d8] rounded-md overflow-hidden shadow-sm">
              <div className="bg-[#ffebe8] border-b border-[#dd3c10] p-2 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-[#dd3c10]" />
                  <span className="text-[11px] font-bold text-[#dd3c10]">Tamamlanması Gereken Görevler</span>
              </div>
              <div className="divide-y divide-[#e9e9e9]">
                  {duties.slice(0,3).map(course => (
                      <div 
                          key={course.id} 
                          onClick={() => navigate(`/course/${course.id}`)}
                          className="p-2 flex items-center gap-3 hover:bg-[#fff9d7] cursor-pointer transition-colors"
                      >
                          <div className="w-4 h-4 border border-[#dd3c10] rounded-sm flex items-center justify-center">
                              <div className="w-2 h-2 bg-[#dd3c10] rounded-full animate-pulse"></div>
                          </div>
                          <div className="flex-1">
                              <div className="text-[11px] font-bold text-[#333] hover:underline">{getLocalizedContent(course.title)}</div>
                              <div className="text-[9px] text-gray-500">Son Tarih: Bugün</div>
                          </div>
                          <button className="bg-[#f7f7f7] border border-[#ccc] text-[9px] font-bold px-2 py-0.5 hover:bg-[#e9e9e9] rounded-sm">Başla</button>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* 3. FEED */}
      <div>
          {feedItems.length === 0 && !loading ? (
              <div className="bg-white border border-[#bdc7d8] rounded-md p-10 text-center text-gray-400 text-xs shadow-sm">
                  Henüz akışta bir şey yok.
              </div>
          ) : (
              <div className="space-y-4">
                  {feedItems.map(item => (
                      <FeedPostCard key={item.id} post={item as any} />
                  ))}
              </div>
          )}
          {loading && <div className="p-4 text-center text-gray-400 text-xs">Yükleniyor...</div>}
      </div>

    </div>
  );
};
