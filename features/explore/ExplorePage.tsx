
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Sparkles, Building2, MapPin, ArrowRight, Laptop, Heart, GraduationCap, ShoppingBag } from 'lucide-react';
import { useContentStore } from '../../stores/useContentStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getAllPublicOrganizations } from '../../services/db';
import { Organization, OrganizationSector } from '../../types';
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

  const [activeTab, setActiveTab] = useState<'LEARNING' | 'ORGS'>('LEARNING');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<OrganizationSector | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    if (currentUser?.currentOrganizationId) {
        fetchContent(currentUser.currentOrganizationId);
    }
    // Fetch organizations
    getAllPublicOrganizations().then(setOrgs);
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
                  mode: 'search_orgs',
                  items: orgs.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
              };
          }
      }

      // If Learning Category Selected
      if (selectedCatId && activeTab === 'LEARNING') {
          return {
              mode: 'category',
              items: courses.filter(c => c.categoryId === selectedCatId)
          };
      }

      // If Org Sector Selected
      if (selectedSector && activeTab === 'ORGS') {
          return {
              mode: 'sector',
              items: orgs.filter(o => o.sector === selectedSector)
          };
      }

      // Default Feed
      return {
          mode: 'feed',
          feed: feed
      };

  }, [feed, searchQuery, selectedCatId, selectedSector, courses, orgs, activeTab]);

  const sectors: { id: OrganizationSector, label: string }[] = [
      { id: 'tourism', label: 'Turizm' },
      { id: 'technology', label: 'Teknoloji' },
      { id: 'health', label: 'Sağlık' },
      { id: 'education', label: 'Eğitim' },
      { id: 'retail', label: 'Perakende' },
  ];

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
                        onClick={() => setActiveTab('ORGS')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ORGS' ? 'bg-accent text-primary shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Kurumlar
                    </button>
                </div>
            </div>

            <div className="px-4 mb-2">
                <div className="relative group">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-accent transition-colors" />
                    <input 
                        type="text"
                        placeholder={activeTab === 'LEARNING' ? "Eğitim ara..." : "Kurum ara..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-400 font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all border border-white/10"
                    />
                </div>
            </div>
            
            {/* Filter Pills (Learning) */}
            {activeTab === 'LEARNING' && (
                <FilterPills 
                    categories={categories} 
                    selectedCatId={selectedCatId} 
                    onSelect={setSelectedCatId} 
                />
            )}

            {/* Filter Pills (Orgs) */}
            {activeTab === 'ORGS' && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2 pt-2">
                    <button onClick={() => setSelectedSector(null)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${!selectedSector ? 'bg-white text-primary' : 'bg-white/10 border-white/10 text-white/70'}`}>Tümü</button>
                    {sectors.map(s => (
                        <button 
                            key={s.id}
                            onClick={() => setSelectedSector(s.id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedSector === s.id ? 'bg-white text-primary' : 'bg-white/10 border-white/10 text-white/70'}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 flex flex-col gap-8">
            
            {/* --- ORGS TAB --- */}
            {activeTab === 'ORGS' && (
                <div className="grid grid-cols-1 gap-4">
                    {(searchQuery || selectedSector ? displayContent.items : orgs).map((org: any) => (
                        <div 
                            key={org.id} 
                            onClick={() => navigate(`/org/${org.id}`)}
                            className="bg-gray-800 rounded-2xl p-4 flex items-center gap-4 border border-white/5 hover:border-accent cursor-pointer group transition-all"
                        >
                            <div className="w-16 h-16 rounded-xl bg-gray-700 overflow-hidden border border-gray-600 group-hover:border-accent">
                                {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-full h-full p-4 text-gray-500" />}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-white group-hover:text-accent transition-colors">{org.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {org.location || '-'}</span>
                                    <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded capitalize">{org.sector}</span>
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
                                    title="Trend Olanlar" 
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
