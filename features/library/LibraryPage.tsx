
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Play, Clock, Zap, Loader2, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useContentStore } from '../../stores/useContentStore';
import { getLocalizedContent } from '../../i18n/config';

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

  // Filter for Search using Localization Helper
  const displayedCourses = searchQuery.length > 0 
    ? courses.filter(c => getLocalizedContent(c.title).toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  if (isLoading && courses.length === 0) {
      return (
          <div className="h-screen flex items-center justify-center bg-primary-dark">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
      );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-primary-dark text-white">
      
      {/* 1. SEARCH BAR (Sticky Glassmorphism) */}
      <div className="sticky top-0 z-40 px-4 py-3 bg-primary-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input 
                type="text"
                placeholder="Eğitim ara... (Örn: Kahve, Yangın)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all border border-white/10"
            />
        </div>
      </div>

      {/* SEARCH RESULTS MODE */}
      {searchQuery.length > 0 ? (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
              {displayedCourses.map(course => (
                  <motion.div 
                    key={course.id} 
                    onClick={() => navigate(`/course/${course.id}`)} 
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer group"
                  >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative shadow-lg">
                           <img src={course.thumbnailUrl} alt={getLocalizedContent(course.title)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                           <div className="absolute bottom-2 left-2 right-2">
                              <span className="text-[10px] font-bold bg-accent text-primary px-1.5 py-0.5 rounded flex items-center w-max gap-1">
                                <Clock className="w-3 h-3" /> {course.duration} dk
                              </span>
                           </div>
                      </div>
                      <h3 className="font-bold text-gray-200 text-sm leading-tight line-clamp-2">{getLocalizedContent(course.title)}</h3>
                  </motion.div>
              ))}
              {displayedCourses.length === 0 && (
                  <div className="col-span-2 text-center text-gray-400 py-10 flex flex-col items-center">
                      <Search className="w-12 h-12 opacity-20 mb-2" />
                      Sonuç bulunamadı.
                  </div>
              )}
          </div>
      ) : (
        <>
            {/* 2. HERO SECTION (Cinematic) */}
            {featuredCourse && (
                <div className="relative w-full aspect-[4/5] md:aspect-[21/9] mb-8 group cursor-pointer overflow-hidden" onClick={() => navigate(`/course/${featuredCourse.id}`)}>
                    <img 
                        src={featuredCourse.thumbnailUrl} 
                        alt="Featured" 
                        className="w-full h-full object-cover animate-in fade-in duration-1000"
                    />
                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary-dark/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/80 via-transparent to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 flex flex-col items-start">
                         <div className="inline-flex items-center gap-2 bg-accent text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 shadow-lg shadow-accent/20">
                             <Star className="w-3 h-3 fill-primary" />
                             Haftanın Önerisi
                         </div>
                         <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 leading-none max-w-[80%] drop-shadow-xl">
                             {getLocalizedContent(featuredCourse.title)}
                         </h1>
                         <p className="text-gray-300 line-clamp-2 mb-6 text-sm font-medium opacity-90 max-w-[90%] drop-shadow-md">
                             {getLocalizedContent(featuredCourse.description)}
                         </p>
                         
                         <div className="flex gap-3 w-full md:w-auto">
                             <button className="flex-1 md:flex-none bg-accent hover:bg-white text-primary font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:scale-95 transition-all">
                                 <Play className="w-5 h-5 fill-current" />
                                 Hemen İzle
                                 <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-extrabold ml-1">+{featuredCourse.xpReward} XP</span>
                             </button>
                         </div>
                    </div>
                </div>
            )}

            {/* 3. SHELVES (Portrait Posters) */}
            <div className="flex flex-col gap-8 pb-8">
                {categories.map(cat => {
                    const catCourses = getCoursesByCategory(cat.id);
                    if(catCourses.length === 0) return null;

                    return (
                        <div key={cat.id} className="flex flex-col gap-3 animate-in slide-in-from-right-8 duration-700">
                            <h3 className="text-lg font-bold text-white px-4 flex items-center gap-2 border-l-4 border-accent pl-3 ml-4">
                                {cat.title} 
                                <span className="text-gray-500 text-xs font-normal">({catCourses.length})</span>
                            </h3>
                            
                            {/* Horizontal Scroll Container */}
                            <div className="flex overflow-x-auto no-scrollbar px-4 pb-4 gap-4 snap-x">
                                {catCourses.map(course => (
                                    <motion.div 
                                        key={course.id}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate(`/course/${course.id}`)}
                                        className="min-w-[140px] md:min-w-[180px] snap-start flex flex-col gap-2 group cursor-pointer"
                                    >
                                        {/* PORTRAIT POSTER CARD */}
                                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg bg-gray-800 border border-white/5">
                                            <img 
                                                src={course.thumbnailUrl} 
                                                alt={getLocalizedContent(course.title)} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                            />
                                            
                                            {/* Top Right Badge */}
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10">
                                                {course.duration} dk
                                            </div>

                                            {/* Bottom Info Overlay */}
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent opacity-100" />
                                            
                                            {/* Play Button Overlay (Hover) */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <div className="w-10 h-10 rounded-full bg-accent/90 flex items-center justify-center shadow-xl">
                                                    <Play className="w-5 h-5 text-primary fill-primary" />
                                                 </div>
                                            </div>

                                            {/* XP Badge */}
                                            <div className="absolute bottom-2 left-2 flex items-center gap-1">
                                                <Zap className="w-3 h-3 text-accent fill-accent" />
                                                <span className="text-[10px] font-bold text-gray-200">{course.xpReward} XP</span>
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-gray-300 text-xs md:text-sm leading-tight line-clamp-2 group-hover:text-white transition-colors pl-1">
                                            {getLocalizedContent(course.title)}
                                        </h4>
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
