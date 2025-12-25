
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
import { SearchResults } from './components/SearchResults';

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { categories, isLoading: contentLoading } = useContentStore();

  // --- OMNI SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --- DISCOVERY FEED STATE ---
  const [smartFeed, setSmartFeed] = useState<Course[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Initial Load
  useEffect(() => {
      if (currentUser) {
          setFeedLoading(true);
          getSmartFeed(currentUser, false).then(data => {
              setSmartFeed(data);
              setFeedLoading(false);
          });
      }
  }, [currentUser]);

  const handleSearch = async () => {
      if (!searchQuery.trim()) {
          setHasSearched(false);
          return;
      }
      setIsSearching(true);
      setHasSearched(true);
      trackSearch(searchQuery);
      const results = await performGlobalSearch(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
  };

  if (contentLoading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#3b5998]" /></div>;

  return (
    <div className="flex flex-col gap-4">
        
        {/* SIMPLE SEARCH BOX - MATCHING FEED STYLE */}
        <div className="bg-white border border-[#bdc7d8] rounded-md p-3 shadow-sm">
            <div className="flex gap-2">
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 border border-[#bdc7d8] p-1.5 text-[13px] outline-none focus:border-[#3b5998] rounded-sm text-[#333] placeholder-gray-400"
                    placeholder="Eğitim, kişi veya departman ara..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                    onClick={handleSearch}
                    className="bg-[#3b5998] border border-[#29447e] text-white px-4 py-1 text-[11px] font-bold hover:bg-[#2d4373] rounded-sm"
                >
                    Ara
                </button>
            </div>
            
            {/* Categories */}
            {!hasSearched && (
                <div className="mt-2 pt-2 border-t border-[#e9e9e9] flex flex-wrap gap-1">
                    <span className="text-[10px] font-bold text-gray-500 pt-1 mr-1">Kategoriler:</span>
                    {categories.slice(0, 6).map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => { setSearchQuery(cat.title); handleSearch(); }}
                            className="px-2 py-0.5 text-[10px] text-[#3b5998] bg-[#f7f7f7] border border-[#d8dfea] hover:bg-[#eff0f5] rounded-sm"
                        >
                            {cat.title}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* RESULTS AREA */}
        {isSearching ? (
            <div className="bg-white border border-[#bdc7d8] rounded-md p-10 text-center shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3b5998]" />
                <p className="text-xs text-gray-500">Aranıyor...</p>
            </div>
        ) : hasSearched ? (
            <div className="bg-white border border-[#bdc7d8] rounded-md p-3 shadow-sm">
                <SearchResults results={searchResults} />
            </div>
        ) : (
            <div className="space-y-4">
                {/* Hero */}
                {smartFeed.length > 0 && (
                    <div className="bg-white border border-[#bdc7d8] rounded-md p-3 shadow-sm">
                        <div className="flex items-center gap-1 mb-2 border-b border-[#e9e9e9] pb-1">
                            <Sparkles className="w-3 h-3 text-yellow-600" />
                            <span className="text-[11px] font-bold text-[#333]">Önerilen</span>
                        </div>
                        <HeroCourseCard course={smartFeed[0]} />
                    </div>
                )}

                {/* Grid */}
                <div className="bg-white border border-[#bdc7d8] rounded-md p-3 shadow-sm">
                    <h3 className="text-[11px] font-bold text-[#3b5998] mb-2 pb-1 border-b border-[#e9e9e9]">Tüm Katalog</h3>
                    <MasonryGrid courses={smartFeed.slice(1)} />
                </div>
            </div>
        )}
    </div>
  );
};
