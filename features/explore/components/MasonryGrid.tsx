
import React from 'react';
import { Course } from '../../../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Lock, DollarSign } from 'lucide-react';
import { getLocalizedContent } from '../../../i18n/config';

interface MasonryGridProps {
  courses: Course[];
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({ courses }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {courses.map((course, index) => {
        const isPublic = course.visibility === 'PUBLIC';
        return (
            <div
            key={course.id}
            onClick={() => navigate(`/course/${course.id}`)}
            className="relative border border-[#ccc] bg-white p-1 cursor-pointer hover:border-[#3b5998] group transition-colors"
            >
                <div className="aspect-video bg-gray-200 overflow-hidden relative mb-1">
                    <img 
                        src={course.thumbnailUrl} 
                        alt={getLocalizedContent(course.title)} 
                        className="w-full h-full object-cover"
                    />
                    
                    {/* Badges */}
                    <div className="absolute top-1 right-1 flex gap-1">
                        {isPublic && course.price > 0 && (
                            <span className="bg-green-600 text-white text-[9px] font-bold px-1 py-0.5 flex items-center">
                                $
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="p-1">
                    <h4 className="text-[#3b5998] text-[11px] font-bold leading-tight line-clamp-2 group-hover:underline">
                        {getLocalizedContent(course.title)}
                    </h4>
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {course.tags?.slice(0,2).map(tag => (
                            <span key={tag} className="text-[9px] text-gray-500 bg-[#f0f2f5] px-1 border border-[#e9e9e9]">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
        );
      })}
    </div>
  );
};
