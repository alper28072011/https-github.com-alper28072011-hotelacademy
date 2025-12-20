
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Sparkles, Building2, MapPin, ArrowRight, X, Filter } from 'lucide-react';
import { useContentStore } from '../../stores/useContentStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getAllPublicOrganizations } from '../../services/db';
import { getSmartFeed } from '../../services/courseService'; 
import { Organization, Course } from '../../types';
import { HeroCourseCard } from './components/HeroCourseCard';
import { TopicSection } from './components/TopicSection';
import { MasonryGrid } from './components/MasonryGrid';
import { getLocalizedContent } from '../../i18n/config';

type FilterType = 'ALL' | 'COURSES' | 'ORGS';

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { 
    categories, 
    isLoading, 
    searchQuery, 
    setSearchQuery,
    courses: allCourses 
  } = useContentStore();

  // Unified State
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [smartFeed, setSmartFeed] = useState<Course[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    getAllPublicOrganizations().then(setOrgs);
  }, []);

  useEffect(() => {
      if (currentUser) {
          setFeedLoading(true);
          getSmartFeed(currentUser, false).then(data => {
              setSmartFeed(data);
              setFeedLoading(false);
          });
      }
  }, [currentUser]);

  // --- UNIFIED SEARCH LOGIC ---
  const results = useMemo(() => {
      const query = searchQuery.toLowerCase().trim();
      
      // 1. Filter Courses
      const filteredCourses = allCourses.filter(c => 
          getLocalizedContent(c.title).toLowerCase().includes(query) ||
          c.tags?.some(tag => tag.toLowerCase().includes(query))
      );

      // 2. Filter Orgs
      const filteredOrgs = orgs.filter(o => 
          o.name.toLowerCase().includes(query) || 
          o.code.toLowerCase().includes(query)
      );

      return {
          courses: filteredCourses,
          orgs: filteredOrgs,
          hasResults: filteredCourses.length > 0 || filteredOrgs.length > 0
      };
  }, [searchQuery, allCourses, orgs]);

  // Determine what to show based on Filter + Search
  const showCourses = activeFilter === 'ALL' || activeFilter === 'COURSES';
  const showOrgs = activeFilter === 'ALL' || activeFilter === 'ORGS';

  if (isLoading) {
      return (
          <div className="h-screen flex items-center justify-center bg-gray-50">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
        
        {/* 1. COMPACT STICKY HEADER */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-sm transition-all duration-300">
            <div className="px-4 py-3">
                {/* Search Input */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input 
                        type="text"
                        placeholder="Eğitim, otel veya konu ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-100/80 border-0 rounded-xl py-2.5 pl-10 pr-10 text-gray-900 placeholder-gray-500 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Filter Pills (Horizontal Scroll) */}
                <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                    <FilterButton 
                        label="Tümü" 
                        isActive={activeFilter === 'ALL'} 
                        onClick={() => setActiveFilter('ALL')} 
                    />
                    <FilterButton 
                        label="Eğitimler" 
                        isActive={activeFilter === 'COURSES'} 
                        onClick={() => setActiveFilter('COURSES')} 
                        count={results.courses.length > 0 && searchQuery ? results.courses.length : undefined}
                    />
                    <FilterButton 
                        label="Kurumlar" 
                        isActive={activeFilter === 'ORGS'} 
                        onClick={() => setActiveFilter('ORGS')} 
                        count={results.orgs.length > 0 && searchQuery ? results.orgs.length : undefined}
                    />
                    {/* Add Category Pills dynamically if needed */}
                    {!searchQuery && categories.slice(0, 5).map(cat => (
                        <button 
                            key={cat.id}
                            className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200 transition-all"
                        >
                            {cat.title}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* 2. CONTENT AREA */}
        <div className="p-4 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* SEARCH EMPTY STATE (Discover Mode) */}
            {!searchQuery && activeFilter === 'ALL' && (
                <>
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

                    {/* Featured Organizations (Horizontal) */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-bold text-gray-900">Öne Çıkan Kurumlar</h3>
                            <button onClick={() => setActiveFilter('ORGS')} className="text-xs font-bold text-primary hover:underline">Tümünü Gör</button>
                        </div>
                        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 snap-x">
                            {orgs.slice(0, 5).map(org => (
                                <div 
                                    key={org.id} 
                                    onClick={() => navigate(`/org/${org.id}`)}
                                    className="min-w-[260px] snap-start bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
                                            {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-gray-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 truncate">{org.name}</h4>
                                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {org.location || 'Global'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-lg group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                        <span>{org.memberCount || 1} Üye</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span>{org.sector}</span>
                                        <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Discovery Grid */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 px-1 mb-4">Daha Fazla Keşfet</h3>
                        <MasonryGrid courses={smartFeed.slice(6)} />
                    </div>
                </>
            )}

            {/* SEARCH RESULTS MODE */}
            {(searchQuery || activeFilter !== 'ALL') && (
                <div className="space-y-8">
                    {!results.hasResults && searchQuery && (
                        <div className="text-center py-20 opacity-50">
                            <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p className="font-bold text-gray-500">Sonuç bulunamadı.</p>
                        </div>
                    )}

                    {/* Organization Results */}
                    {showOrgs && results.orgs.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Kurumlar ({results.orgs.length})</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {results.orgs.map(org => (
                                    <div 
                                        key={org.id} 
                                        onClick={() => navigate(`/org/${org.id}`)}
                                        className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
                                    >
                                        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-gray-300" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 text-base mb-0.5 group-hover:text-primary transition-colors">{org.name}</h4>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-700">
                                                    {org.sector}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {org.location || 'Konum Yok'}
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Course Results */}
                    {showCourses && results.courses.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Eğitimler ({results.courses.length})</h3>
                            <MasonryGrid courses={results.courses} />
                        </div>
                    )}
                </div>
            )}

        </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const FilterButton: React.FC<{ 
    label: string, 
    isActive: boolean, 
    onClick: () => void,
    count?: number
}> = ({ label, isActive, onClick, count }) => (
    <button 
        onClick={onClick}
        className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
            isActive 
            ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        }`}
    >
        {label}
        {count !== undefined && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {count}
            </span>
        )}
    </button>
);
