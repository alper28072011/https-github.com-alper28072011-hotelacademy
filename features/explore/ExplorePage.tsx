
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

      trackSearch(query);

      const results = await performGlobalSearch(query);
      setSearchResults(results);
      
      setIsSearching(false);
  };

  if (contentLoading) {
      return (
          <div className="h-screen flex items-center justify-center bg-[#eff0f2]">
              <Loader2 className="w-8 h-8 animate-spin text-[#3b5998]" />
          </div>
      );
  }

  return (
    <div className="bg-[#eff0f2] min-h-screen">
        
        {/* CLASSIC SEARCH HEADER */}
        <div className="bg-[#3b5998] p-4 border-b border-[#29487d] shadow-sm">
            <div className="max-w-[980px] mx-auto">
                <SearchOmniBox 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                />
                
                {/* Categories Bar */}
                {!hasSearched && (
                    <div className="flex gap-1 mt-3 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-bold text-[#98a9ca] uppercase py-1 mr-2">Göz At:</span>
                        {categories.slice(0, 8).map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => handleSearch(cat.title)}
                                className="px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/10 rounded-sm border border-transparent hover:border-white/20 transition-colors whitespace-nowrap"
                            >
                                {cat.title}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-[980px] mx-auto p-4 flex flex-col gap-6">
            
            {/* CASE 1: SEARCHING... */}
            {isSearching && (
                <div className="bg-white border border-[#d8dfea] p-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#3b5998]" />
                    <p className="text-xs font-bold text-gray-500">Veritabanı taranıyor...</p>
                </div>
            )}

            {/* CASE 2: SEARCH RESULTS */}
            {!isSearching && hasSearched && (
                <div className="bg-white border border-[#d8dfea] p-4">
                    <SearchResults results={searchResults} />
                </div>
            )}

            {/* CASE 3: DISCOVERY MODE (Default) */}
            {!isSearching && !hasSearched && (
                <div className="space-y-6">
                    
                    {/* Hero Selection */}
                    {smartFeed.length > 0 && (
                        <div className="bg-white border border-[#d8dfea] p-4">
                            <div className="flex items-center gap-2 mb-3 border-b border-[#eee] pb-2">
                                <Sparkles className="w-4 h-4 text-yellow-600" />
                                <span className="text-xs font-bold text-[#333] uppercase">Editörün Seçimi</span>
                            </div>
                            <HeroCourseCard course={smartFeed[0]} />
                        </div>
                    )}

                    {/* Trending Carousel */}
                    {smartFeed.length > 1 && (
                        <div className="bg-white border border-[#d8dfea] p-4">
                            <TopicSection 
                                title="Popüler Eğitimler" 
                                courses={smartFeed.slice(1, 6)} 
                            />
                        </div>
                    )}

                    {/* Discovery Grid */}
                    <div className="bg-white border border-[#d8dfea] p-4">
                        <h3 className="text-sm font-bold text-[#3b5998] mb-4 border-b border-[#eee] pb-2">Tüm Kataloğu Keşfet</h3>
                        <MasonryGrid courses={smartFeed.slice(6)} />
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
