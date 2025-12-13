import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Clock, Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useContentStore } from '../../stores/useContentStore';

export const LibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    courses, 
    categories, 
    isLoading, 
    fetchContent, 
    searchQuery, 
    setSearchQuery,
    getFeaturedCourse,
    getCoursesByCategory 
  } = useContentStore();

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const featuredCourse = getFeaturedCourse() || courses[0];

  // Filter for Search
  const displayedCourses = searchQuery.length > 0 
    ? courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  if (isLoading && courses.length === 0) {
      return (
          <div className="h-screen flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
      );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-surface">
      
      {/* 1. SEARCH BAR (Sticky) */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 py-3 border-b border-gray-100">
        <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input 
                type="text"
                placeholder="Eğitim ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 rounded-full py-3 pl-12 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
        </div>
      </div>

      {/* SEARCH RESULTS MODE */}
      {searchQuery.length > 0 ? (
          <div className="p-4 grid grid-cols-2 gap-4">
              {displayedCourses.map(course => (
                  <div key={course.id} onClick={() => navigate(`/course/${course.id}`)} className="cursor-pointer">
                      <div className="aspect-[16/9] rounded-xl overflow-hidden mb-2 relative">
                           <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/20" />
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight">{course.title}</h3>
                  </div>
              ))}
              {displayedCourses.length === 0 && (
                  <div className="col-span-2 text-center text-gray-400 py-10">
                      Sonuç bulunamadı.
                  </div>
              )}
          </div>
      ) : (
        <>
            {/* 2. HERO SECTION */}
            {featuredCourse && (
                <div className="relative w-full aspect-[4/5] md:aspect-[21/9] mb-8 group cursor-pointer" onClick={() => navigate(`/course/${featuredCourse.id}`)}>
                    <img 
                        src={featuredCourse.thumbnailUrl} 
                        alt="Featured" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 pt-12">
                         <div className="inline-flex items-center gap-2 bg-accent text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
                             <Zap className="w-3 h-3 fill-primary" />
                             Öne Çıkan
                         </div>
                         <h1 className="text-4xl font-bold text-primary mb-2 leading-none max-w-[80%]">
                             {featuredCourse.title}
                         </h1>
                         <p className="text-gray-600 line-clamp-2 mb-4 text-sm font-medium opacity-80 max-w-[90%]">
                             {featuredCourse.description}
                         </p>
                         
                         <div className="flex gap-3">
                             <button className="flex-1 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                                 <Play className="w-5 h-5 fill-current" />
                                 Hemen İzle
                             </button>
                             <button className="px-4 py-3 bg-white/50 backdrop-blur rounded-xl font-bold text-primary flex items-center gap-2">
                                 <Clock className="w-5 h-5" />
                                 {featuredCourse.duration} dk
                             </button>
                         </div>
                    </div>
                </div>
            )}

            {/* 3. SHELVES */}
            <div className="flex flex-col gap-8 pb-8">
                {categories.map(cat => {
                    const catCourses = getCoursesByCategory(cat.id);
                    if(catCourses.length === 0) return null;

                    return (
                        <div key={cat.id} className="flex flex-col gap-3">
                            <h3 className="text-lg font-bold text-primary px-4 flex items-center gap-2">
                                {cat.title} <span className="text-gray-300 text-xs font-normal">({catCourses.length})</span>
                            </h3>
                            
                            {/* Horizontal Scroll Container */}
                            <div className="flex overflow-x-auto no-scrollbar px-4 pb-4 gap-4 snap-x">
                                {catCourses.map(course => (
                                    <motion.div 
                                        key={course.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate(`/course/${course.id}`)}
                                        className="min-w-[200px] snap-start flex flex-col gap-2 group cursor-pointer"
                                    >
                                        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-sm">
                                            <img 
                                                src={course.thumbnailUrl} 
                                                alt={course.title} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            {/* Duration Badge */}
                                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                {course.duration} dk
                                            </div>
                                            {/* Play Overlay */}
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                                    <Play className="w-5 h-5 text-white fill-white" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                                {course.title}
                                            </h4>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Zap className="w-3 h-3 text-accent fill-accent" />
                                                <span className="text-xs text-gray-400 font-bold">{course.xpReward} XP</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
      )}
    </div>
  );
};
