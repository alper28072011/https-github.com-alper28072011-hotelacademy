
import React from 'react';
import { Course } from '../../../types';
import { TrendingUp, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getLocalizedContent } from '../../../i18n/config';

interface TopicSectionProps {
  title: string;
  courses: Course[];
}

export const TopicSection: React.FC<TopicSectionProps> = ({ title, courses }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[#eee] pb-1 mb-2">
          <h3 className="text-sm font-bold text-[#333] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3b5998]" />
              {title}
          </h3>
          <a href="#" className="text-[10px] text-[#3b5998] font-bold hover:underline">Tümünü Gör</a>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2">
          {courses.map((course, index) => (
              <div 
                key={course.id}
                onClick={() => navigate(`/course/${course.id}`)}
                className="min-w-[140px] w-[140px] group cursor-pointer border border-[#ccc] bg-white p-1 hover:border-[#3b5998] transition-colors"
              >
                  <div className="relative aspect-[3/4] bg-gray-200 overflow-hidden mb-2">
                      <img 
                        src={course.thumbnailUrl} 
                        alt={getLocalizedContent(course.title)} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/10 transition-opacity">
                          <Play className="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                  </div>
                  <h4 className="text-[#3b5998] text-[11px] font-bold leading-tight line-clamp-2 hover:underline">
                      {getLocalizedContent(course.title)}
                  </h4>
                  <p className="text-gray-500 text-[10px] mt-0.5">{course.duration} dk • {course.xpReward} XP</p>
              </div>
          ))}
      </div>
    </div>
  );
};
