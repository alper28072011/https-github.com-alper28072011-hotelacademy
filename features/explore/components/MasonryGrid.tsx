
import React from 'react';
import { Course } from '../../../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Lock, DollarSign } from 'lucide-react';

interface MasonryGridProps {
  courses: Course[];
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({ courses }) => {
  const navigate = useNavigate();

  return (
    <div className="columns-2 md:columns-3 gap-4 space-y-4 px-2">
      {courses.map((course, index) => {
        const isPublic = course.visibility === 'PUBLIC';
        return (
            <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/course/${course.id}`)}
            className="break-inside-avoid relative rounded-xl overflow-hidden group cursor-pointer bg-gray-800"
            >
            <img 
                src={course.thumbnailUrl} 
                alt={course.title} 
                className="w-full object-cover transition-opacity duration-300 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />
            
            {/* Type Badge */}
            <div className="absolute top-2 right-2">
                {isPublic ? (
                    <div className="bg-blue-500/80 backdrop-blur p-1 rounded-full shadow-sm">
                        <Globe className="w-3 h-3 text-white" />
                    </div>
                ) : (
                    <div className="bg-gray-900/80 backdrop-blur p-1 rounded-full shadow-sm">
                        <Lock className="w-3 h-3 text-white/70" />
                    </div>
                )}
            </div>

            {/* Price Badge */}
            {isPublic && course.price > 0 && (
                <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center">
                    <DollarSign className="w-3 h-3" />{course.price}
                </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-3">
                <h4 className="text-white text-xs font-bold leading-tight line-clamp-2">
                    {course.title}
                </h4>
                <div className="flex gap-1 mt-1 flex-wrap">
                    {course.tags?.slice(0,2).map(tag => (
                        <span key={tag} className="text-[9px] text-gray-300 opacity-80">{tag}</span>
                    ))}
                </div>
            </div>
            </motion.div>
        );
      })}
    </div>
  );
};
