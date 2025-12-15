
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { useContentStore } from '../../stores/useContentStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { FilterPills } from './components/FilterPills';
import { HeroCourseCard } from './components/HeroCourseCard';
import { TopicSection } from './components/TopicSection';
import { MasonryGrid } from './components/MasonryGrid';

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { 
    fetchContent, 
    categories, 
    isLoading, 
    searchQuery, 
    setSearchQuery,
    getExploreFeed,
    courses // needed for raw search filtering
  } = useContentStore();

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Derived State: The Feed
  const feed = useMemo(() => {
      if (!currentUser) return null;
      return getExploreFeed(currentUser);
  }, [currentUser, courses]);

  // Derived State: Search/Filter Logic
  const displayContent = useMemo(() => {
      if (!feed) return null;

      // If Searching, return flat list matching query
      if (searchQuery.length > 0) {
          return {
              mode: 'search',
              items: courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
          };
      }

      // If Category Selected, filter flat list
      if (selectedCatId) {
          return {
              mode: 'category',
              items: courses.filter(c => c.categoryId === selectedCatId)
          };
      }

      // Default: The Algorithmic Feed
      return {
          mode: 'feed',
          feed: feed
      };

  }, [feed, searchQuery, selectedCatId, courses]);

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
            <div className="px-4 mb-2">
                <div className="relative group">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-accent transition-colors" />
                    <input 
                        type="text"
                        placeholder={t('nav_learning') + "..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all border border-white/10"
                    />
                </div>
            </div>
            
            {/* 2. FILTER PILLS */}
            <FilterPills 
                categories={categories} 
                selectedCatId={selectedCatId} 
                onSelect={setSelectedCatId} 
            />
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 flex flex-col gap-8">
            
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
        </div>
    </div>
  );
};
