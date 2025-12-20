
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Search as SearchIcon } from 'lucide-react';
import { useContentStore } from '../../stores/useContentStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getSmartFeed } from '../../services/courseService'; 
import { performGlobalSearch, trackSearch } from '../../services/searchService';
import { Course, SearchResult } from '../../types';
import { HeroCourseCard } from './components/HeroCourseCard';
import { TopicSection } from './components/TopicSection';
import { MasonryGrid } from './components/MasonryGrid';
import { SearchOmniBox } from './components/SearchOmniBox';
import { SearchResults } from './components/SearchResults';

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { 
    categories, 
    isLoading: contentLoading
  } = useContentStore();

  // --- OMNI SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --- DISCOVERY FEED STATE ---
  const [smartFeed, setSmartFeed] = useState<Course[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Initial Load (Smart Feed)
  useEffect(() => {
      if (currentUser) {
          setFeedLoading(true);
          getSmartFeed(currentUser, false).then(data => {
              setSmartFeed(data);
              setFeedLoading(false);
          });
      }
  }, [currentUser]);

  // --- SEARCH HANDLER ---
  const handleSearch = async (query: string) => {
      if (!query.trim()) {
          setHasSearched(false);
          return;
      }
      
      setSearchQuery(query);
      setIsSearching(true);
      setHasSearched(true);

      // 1. Track Query
      trackSearch(query);

      // 2. Perform Global Search (Courses + Orgs + Users + Semantic)
      const results = await performGlobalSearch(query);
      setSearchResults(results);
      
      setIsSearching(false);
  };

  if (contentLoading) {
      return (
          <div className="h-screen flex items-center justify-center bg-gray-50">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
        
        {/* HERO SEARCH SECTION */}
        <div className="relative bg-white pb-6 pt-4 rounded-b-[2.5rem] shadow-sm border-b border-gray-100 z-30">
            <div className="px-4 mb-4">
                <SearchOmniBox 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                />
            </div>
            
            {/* Categories (Only visible in discovery mode) */}
            {!hasSearched && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2">
                    {categories.slice(0, 6).map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => handleSearch(cat.title)}
                            className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200 transition-all"
                        >
                            {cat.title}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* MAIN CONTENT */}
        <div className="p-4 flex flex-col gap-8 min-h-[500px]">
            
            {/* CASE 1: SEARCHING... */}
            {isSearching && (
                <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                    <p className="text-sm font-medium animate-pulse">Arama sonuçları derleniyor...</p>
                </div>
            )}

            {/* CASE 2: SEARCH RESULTS */}
            {!isSearching && hasSearched && (
                <SearchResults results={searchResults} />
            )}

            {/* CASE 3: DISCOVERY MODE (Default) */}
            {!isSearching && !hasSearched && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
                    
                    {/* Hero Selection */}
                    {smartFeed.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 px-1">
                                <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Günün Önerisi</span>
                            </div>
                            <HeroCourseCard course={smartFeed[0]} />
                        </div>
                    )}

                    {/* Trending Carousel */}
                    {smartFeed.length > 1 && (
                        <TopicSection 
                            title="Popüler Eğitimler" 
                            courses={smartFeed.slice(1, 6)} 
                        />
                    )}

                    {/* Discovery Grid */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 px-1 mb-4">Daha Fazla Keşfet</h3>
                        <MasonryGrid courses={smartFeed.slice(6)} />
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
