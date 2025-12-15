
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Sparkles, Building2, MapPin, ArrowRight } from 'lucide-react';
import { useContentStore } from '../../stores/useContentStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getAllPublicOrganizations } from '../../services/db';
import { Organization } from '../../types';
import { FilterPills } from './components/FilterPills';
import { HeroCourseCard } from './components/HeroCourseCard';
import { TopicSection } from './components/TopicSection';
import { MasonryGrid } from './components/MasonryGrid';

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { 
    fetchContent, 
    categories, 
    isLoading, 
    searchQuery, 
    setSearchQuery,
    getExploreFeed,
    courses 
  } = useContentStore();

  const [activeTab, setActiveTab] = useState<'LEARNING' | 'HOTELS'>('LEARNING');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [hotels, setHotels] = useState<Organization[]>([]);

  useEffect(() => {
    if (currentUser?.currentOrganizationId) {
        fetchContent(currentUser.currentOrganizationId);
    }
    // Fetch hotels separately
    getAllPublicOrganizations().then(setHotels);
  }, [fetchContent, currentUser]);

  // Derived State: The Feed
  const feed = useMemo(() => {
      if (!currentUser) return null;
      return getExploreFeed(currentUser);
  }, [currentUser, courses]);

  // Derived State: Search/Filter Logic
  const displayContent = useMemo(() => {
      if (!feed) return null;

      // Search Logic
      if (searchQuery.length > 0) {
          if (activeTab === 'LEARNING') {
              return {
                  mode: 'search',
                  items: courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
              };
          } else {
              return {
                  mode: 'search_hotels',
                  items: hotels.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
              };
          }
      }

      // If Category Selected
      if (selectedCatId && activeTab === 'LEARNING') {
          return {
              mode: 'category',
              items: courses.filter(c => c.categoryId === selectedCatId)
          };
      }

      // Default Feed
      return {
          mode: 'feed',
          feed: feed
      };

  }, [feed, searchQuery, selectedCatId, courses, hotels, activeTab]);

  if (isLoading || !displayContent) {
      return (
          <div className="h-screen flex items-center justify-center bg-primary-dark">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-primary-dark text-white pb-24">
        
        {/* 1. STICKY HEADER & SEARCH */}
        <div className="sticky top-0 z-40 bg-primary-dark/95 backdrop-blur-md border-b border-white/5 pt-4 pb-2">
            
            {/* Tab Switcher */}
            <div className="flex justify-center mb-4">
                <div className="bg-white/10 p-1 rounded-xl flex">
                    <button 
                        onClick={() => setActiveTab('LEARNING')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'LEARNING' ? 'bg-accent text-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Eğitim
                    </button>
                    <button 
                        onClick={() => setActiveTab('HOTELS')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'HOTELS' ? 'bg-accent text-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        İşletmeler
                    </button>
                </div>
            </div>

            <div className="px-4 mb-2">
                <div className="relative group">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-accent transition-colors" />
                    <input 
                        type="text"
                        placeholder={activeTab === 'LEARNING' ? "Eğitim ara..." : "Otel ara..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all border border-white/10"
                    />
                </div>
            </div>
            
            {/* Filter Pills (Only for Learning) */}
            {activeTab === 'LEARNING' && (
                <FilterPills 
                    categories={categories} 
                    selectedCatId={selectedCatId} 
                    onSelect={setSelectedCatId} 
                />
            )}
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 flex flex-col gap-8">
            
            {/* --- HOTELS TAB --- */}
            {activeTab === 'HOTELS' && (
                <div className="grid grid-cols-1 gap-4">
                    {(searchQuery ? displayContent.items : hotels).map((hotel: any) => (
                        <div 
                            key={hotel.id} 
                            onClick={() => navigate(`/hotel/${hotel.id}`)}
                            className="bg-gray-800 rounded-2xl p-4 flex items-center gap-4 border border-white/5 hover:border-accent cursor-pointer group transition-all"
                        >
                            <div className="w-16 h-16 rounded-xl bg-gray-700 overflow-hidden border border-gray-600 group-hover:border-accent">
                                {hotel.logoUrl ? <img src={hotel.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-full h-full p-4 text-gray-500" />}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-white group-hover:text-accent transition-colors">{hotel.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <MapPin className="w-3 h-3" /> {hotel.location || 'Konum yok'}
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-accent" />
                        </div>
                    ))}
                </div>
            )}

            {/* --- LEARNING TAB --- */}
            {activeTab === 'LEARNING' && (
                <>
                    {/* A. SEARCH/CATEGORY MODE */}
                    {(displayContent.mode === 'search' || displayContent.mode === 'category') && (
                        <div>
                            <h3 className="text-gray-400 text-sm mb-4">
                                {displayContent.items.length} sonuç bulundu
                            </h3>
                            <MasonryGrid courses={displayContent.items} />
                        </div>
                    )}

                    {/* B. FEED MODE */}
                    {displayContent.mode === 'feed' && displayContent.feed && (
                        <>
                            {/* POOL A: PRIORITY (Hero) */}
                            {displayContent.feed.priority.length > 0 && (
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-center gap-2 px-2 opacity-80">
                                        <Sparkles className="w-4 h-4 text-accent" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-accent">Senin İçin Seçildi</span>
                                    </div>
                                    {displayContent.feed.priority.slice(0, 1).map(course => (
                                        <HeroCourseCard key={course.id} course={course} />
                                    ))}
                                </div>
                            )}

                            {/* POOL B: TRENDING */}
                            {displayContent.feed.trending.length > 0 && (
                                <TopicSection 
                                    title="Herkes Bunu İzliyor" 
                                    courses={displayContent.feed.trending} 
                                />
                            )}

                            {/* POOL C: DISCOVERY */}
                            <div>
                                <h3 className="text-lg font-bold text-white px-2 mb-4">Ufkunu Genişlet</h3>
                                <MasonryGrid courses={displayContent.feed.discovery} />
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    </div>
  );
};
