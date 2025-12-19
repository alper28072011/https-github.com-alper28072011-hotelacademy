
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              {title}
          </h3>
      </div>

      <div className="flex overflow-x-auto no-scrollbar px-2 gap-4 snap-x pb-4">
          {courses.map((course, index) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/course/${course.id}`)}
                className="min-w-[160px] w-[160px] snap-start group cursor-pointer"
              >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-800 shadow-md border border-white/5">
                      <img 
                        src={course.thumbnailUrl} 
                        alt={getLocalizedContent(course.title)} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                      />
                      {course.isNew && (
                          <div className="absolute top-2 left-2 bg-accent text-primary text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                              YENİ
                          </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Play className="w-5 h-5 text-white fill-white" />
                          </div>
                      </div>
                  </div>
                  <h4 className="text-white text-sm font-bold mt-2 leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                      {getLocalizedContent(course.title)}
                  </h4>
                  <p className="text-gray-500 text-[10px] mt-0.5">{course.duration} dk • {course.xpReward} XP</p>
              </motion.div>
          ))}
      </div>
    </div>
  );
};
