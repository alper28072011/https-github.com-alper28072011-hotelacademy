
import React from 'react';
import { Course } from '../../../types';
import { Play, Clock, Zap, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLocalizedContent } from '../../../i18n/config';

interface HeroCourseCardProps {
  course: Course;
}

export const HeroCourseCard: React.FC<HeroCourseCardProps> = ({ course }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="relative w-full h-64 border border-[#999] cursor-pointer group bg-black"
      onClick={() => navigate(`/course/${course.id}`)}
    >
      <img 
        src={course.thumbnailUrl} 
        alt={getLocalizedContent(course.title)} 
        className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h2 className="text-2xl font-bold mb-1 leading-tight drop-shadow-md font-sans">
              {getLocalizedContent(course.title)}
          </h2>
          <p className="text-gray-300 text-xs line-clamp-2 mb-3 max-w-xl">
              {getLocalizedContent(course.description)}
          </p>

          <div className="flex items-center gap-3">
              <button className="bg-[#3b5998] border border-[#fff] hover:bg-[#4c69ba] text-white font-bold py-1 px-4 text-xs flex items-center justify-center gap-1">
                  <Play className="w-3 h-3 fill-current" />
                  İzle
              </button>
              <div className="flex gap-3 text-xs font-bold text-gray-300">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration} dk</span>
                  <span className="flex items-center gap-1 text-yellow-400"><Zap className="w-3 h-3 fill-current" /> +{course.xpReward} XP</span>
              </div>
          </div>
      </div>
    </div>
  );
};
