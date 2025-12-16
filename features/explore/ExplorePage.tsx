
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Sparkles, Building2, MapPin, ArrowRight, Laptop, Heart, GraduationCap, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useContentStore } from '../../stores/useContentStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getAllPublicOrganizations } from '../../services/db';
import { getSmartFeed } from '../../services/courseService'; // NEW
import { Organization, OrganizationSector, Course } from '../../types';
import { FilterPills } from './components/FilterPills';
import { HeroCourseCard } from './components/HeroCourseCard';
import { TopicSection } from './components/TopicSection';
import { MasonryGrid } from './components/MasonryGrid';

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { 
    categories, 
    isLoading, 
    searchQuery, 
    setSearchQuery,
    courses: allCourses // Still needed for fallback or initial cache
  } = useContentStore();

  const [activeTab, setActiveTab] = useState<'LEARNING' | 'ORGS'>('LEARNING');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<OrganizationSector | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  
  // NEW: Smart Feed State
  const [smartFeed, setSmartFeed] = useState<Course[]>([]);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    // Fetch organizations
    getAllPublicOrganizations().then(setOrgs);
  }, []);

  // Fetch Smart Feed when filter changes
  useEffect(() => {
      if (currentUser) {
          setFeedLoading(true);
          getSmartFeed(currentUser, showVerifiedOnly).then(data => {
              setSmartFeed(data);
              setFeedLoading(false);
          });
      }
  }, [currentUser, showVerifiedOnly]);

  // Derived State: Search/Filter Logic
  const displayContent = useMemo(() => {
      // Search Logic (Overrides feed)
      if (searchQuery.length > 0) {
          if (activeTab === 'LEARNING') {
              return {
                  mode: 'search',
                  items: allCourses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
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
              items: allCourses.filter(c => c.categoryId === selectedCatId)
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
          items: smartFeed
      };

  }, [smartFeed, searchQuery, selectedCatId, selectedSector, allCourses, orgs, activeTab]);

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

            <div className="px-4 mb-2 flex gap-2">
                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-accent transition-colors" />
                    <input 
                        type="text"
                        placeholder={activeTab === 'LEARNING' ? "Eğitim ara..." : "Kurum ara..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-400 font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all border border-white/10"
                    />
                </div>
                {activeTab === 'LEARNING' && !searchQuery && (
                    <button 
                        onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                        className={`p-3 rounded-2xl border transition-all ${showVerifiedOnly ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30' : 'bg-white/10 border-white/10 text-gray-400'}`}
                    >
                        <CheckCircle2 className="w-6 h-6" />
                    </button>
                )}
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
                    {displayContent.mode === 'feed' && (
                        <>
                            {feedLoading ? (
                                <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" /></div>
                            ) : (
                                <>
                                    {/* Verified Filter Indicator */}
                                    {showVerifiedOnly && (
                                        <div className="bg-blue-600/10 border border-blue-500/30 p-3 rounded-xl flex items-center gap-3 mb-4">
                                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                                            <span className="text-sm font-bold text-blue-200">Sadece Onaylı Uzman İçerikleri Gösteriliyor</span>
                                        </div>
                                    )}

                                    {/* POOL A: PRIORITY (Hero) - First Item */}
                                    {displayContent.items.length > 0 && (
                                        <div className="flex flex-col gap-6">
                                            <div className="flex items-center gap-2 px-2 opacity-80">
                                                <Sparkles className="w-4 h-4 text-accent" />
                                                <span className="text-xs font-bold uppercase tracking-widest text-accent">Senin İçin Seçildi</span>
                                            </div>
                                            <HeroCourseCard course={displayContent.items[0]} />
                                        </div>
                                    )}

                                    {/* POOL B: TRENDING - Next 5 Items */}
                                    {displayContent.items.length > 1 && (
                                        <TopicSection 
                                            title="Trend Olanlar" 
                                            courses={displayContent.items.slice(1, 6)} 
                                        />
                                    )}

                                    {/* POOL C: DISCOVERY - Rest */}
                                    <div>
                                        <h3 className="text-lg font-bold text-white px-2 mb-4">Ufkunu Genişlet</h3>
                                        <MasonryGrid courses={displayContent.items.slice(6)} />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    </div>
  );
};
