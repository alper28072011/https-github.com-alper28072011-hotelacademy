
import React from 'react';
import { Course } from '../../../types';
import { Play, Clock, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface HeroCourseCardProps {
  course: Course;
}

export const HeroCourseCard: React.FC<HeroCourseCardProps> = ({ course }) => {
  const navigate = useNavigate();

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
        alt={course.title} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/60 to-transparent" />

      {/* Floating Badges */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
          {course.priority === 'HIGH' && (
              <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg w-max animate-pulse">
                  <Star className="w-3 h-3 fill-current" /> Zorunlu
              </div>
          )}
          {course.tags?.map(tag => (
              <div key={tag} className="bg-black/40 backdrop-blur-md text-white/80 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-white/10 w-max">
                  {tag}
              </div>
          ))}
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <h2 className="text-3xl font-bold text-white mb-2 leading-none drop-shadow-lg">
              {course.title}
          </h2>
          <p className="text-gray-300 text-sm line-clamp-2 mb-6 font-medium opacity-90">
              {course.description}
          </p>

          <div className="flex items-center gap-4">
              <button className="flex-1 bg-accent hover:bg-white text-primary font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:scale-95 transition-all">
                  <Play className="w-5 h-5 fill-current" />
                  Devam Et
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
