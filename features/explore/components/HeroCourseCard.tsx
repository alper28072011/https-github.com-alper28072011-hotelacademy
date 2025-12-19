
import React from 'react';
import { Course } from '../../../types';
import { Play, Clock, Zap, Star, Globe, Lock, DollarSign, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getLocalizedContent } from '../../../i18n/config';

interface HeroCourseCardProps {
  course: Course;
}

export const HeroCourseCard: React.FC<HeroCourseCardProps> = ({ course }) => {
  const navigate = useNavigate();

  const isPublic = course.visibility === 'PUBLIC';
  const authorName = course.authorName || (course.organizationId ? 'Kurumsal' : 'Anonim');
  const authorAvatar = course.authorAvatarUrl;

  const handleAuthorClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (course.authorType === 'USER') navigate(`/user/${course.authorId}`);
      else navigate(`/org/${course.authorId || course.organizationId}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl group cursor-pointer"
      onClick={() => navigate(`/course/${course.id}`)}
    >
      {/* Background Image */}
      <img 
        src={course.thumbnailUrl} 
        alt={getLocalizedContent(course.title)} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/60 to-transparent" />

      {/* AUTHOR BADGE (Top Left) */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full p-1 pr-3 border border-white/10 z-10 cursor-pointer hover:bg-black/60 transition-colors" onClick={handleAuthorClick}>
          <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20">
              {authorAvatar ? <img src={authorAvatar} className="w-full h-full object-cover"/> : <Building2 className="p-1 text-white"/>}
          </div>
          <span className="text-[10px] font-bold text-white">{authorName}</span>
      </div>

      {/* Priority Badge (Below Author) */}
      {course.priority === 'HIGH' && (
          <div className="absolute top-14 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg w-max animate-pulse">
              <Star className="w-3 h-3 fill-current" /> Zorunlu
          </div>
      )}

      {/* Visibility Badge (Top Right) */}
      <div className="absolute top-4 right-4">
          {isPublic ? (
              <div className="flex gap-2">
                  <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg">
                      <Globe className="w-4 h-4" />
                  </div>
                  {course.price > 0 && (
                      <div className="bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg font-bold text-xs flex items-center">
                          <DollarSign className="w-3 h-3" />{course.price}
                      </div>
                  )}
              </div>
          ) : (
              <div className="bg-gray-800/80 backdrop-blur text-white p-2 rounded-full shadow-lg border border-white/10">
                  <Lock className="w-4 h-4" />
              </div>
          )}
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <h2 className="text-3xl font-bold text-white mb-2 leading-none drop-shadow-lg">
              {getLocalizedContent(course.title)}
          </h2>
          <p className="text-gray-300 text-sm line-clamp-2 mb-6 font-medium opacity-90">
              {getLocalizedContent(course.description)}
          </p>

          <div className="flex items-center gap-4">
              <button className="flex-1 bg-accent hover:bg-white text-primary font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:scale-95 transition-all">
                  <Play className="w-5 h-5 fill-current" />
                  {course.price > 0 ? 'Satın Al & İzle' : 'Devam Et'}
              </button>
              <div className="flex flex-col text-white/80 text-xs font-mono">
                  <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {course.duration} dk
                  </div>
                  <div className="flex items-center gap-1 text-accent">
                      <Zap className="w-3 h-3 fill-current" /> +{course.xpReward} XP
                  </div>
              </div>
          </div>
      </div>
    </motion.div>
  );
};
