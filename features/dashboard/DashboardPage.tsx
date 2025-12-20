
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContentStore } from '../../stores/useContentStore';
import { getDashboardFeed } from '../../services/db';
import { FeedPostCard } from './components/FeedPostCard';
import { StoryRail } from './components/StoryRail';
import { X, Quote, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course, FeedPost } from '../../types';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { fetchContent } = useContentStore();
  
  // Separate State for Feed
  const [feedItems, setFeedItems] = useState<(Course | FeedPost)[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGmModal, setShowGmModal] = useState(false);

  // Initial Sync (Categories, etc.)
  useEffect(() => {
    if (currentUser) {
        fetchContent(currentUser.currentOrganizationId || ''); 
    }
  }, [fetchContent, currentUser]);

  // Main Data Fetcher
  useEffect(() => {
    const loadDashboardData = async () => {
        if (!currentUser) return;
        setLoading(true);

        try {
            // Fetch Feed (Stories are now handled by StoryRail self-fetch)
            const feedData = await getDashboardFeed(currentUser);
            setFeedItems(feedData);
        } catch (error) {
            console.error("Dashboard Load Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (currentUser) {
        loadDashboardData();
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const isFreelancer = !currentUser.currentOrganizationId;

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      
      {/* 1. STORIES AREA (Story Rail) */}
      {!isFreelancer && (
          <StoryRail user={currentUser} />
      )}

      {/* 2. FEED AREA (Main Scroll) */}
      <div className="flex-1 max-w-lg mx-auto w-full pt-4">
          {feedItems.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center px-6">
                  <p className="font-bold mb-1">Akış Boş</p>
                  <p className="text-sm">
                      {isFreelancer 
                        ? "Bir işletmeye katılarak veya diğer profesyonelleri takip ederek akışını canlandır." 
                        : "Henüz bir içerik paylaşılmamış."}
                  </p>
                  {isFreelancer && (
                      <button onClick={() => navigate('/lobby')} className="mt-4 text-primary font-bold text-sm bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
                          İşletme Bul
                      </button>
                  )}
              </div>
          ) : (
              <div className="md:pt-0">
                  {feedItems.map(item => (
                      <FeedPostCard key={item.id} post={item as any} />
                  ))}
              </div>
          )}
          
          {loading && (
              <div className="p-10 text-center text-gray-400 text-sm">Yükleniyor...</div>
          )}
      </div>

      {/* GM Message Modal (Legacy support / Special Announcement) */}
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
