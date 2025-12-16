import React from 'react';
import { motion } from 'framer-motion';
import { Play, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Course } from '../../../types';

export type StoryStatus = 'urgent' | 'mandatory' | 'progress' | 'viewed' | 'optional' | 'fiery';

interface StoryCircleProps {
  course?: Course;
  // Legacy props for GM message or static items
  image?: string;
  label?: string;
  status?: StoryStatus;
  onClick?: () => void;
}

export const StoryCircle: React.FC<StoryCircleProps> = ({ course, image, label, status = 'viewed', onClick }) => {
  const navigate = useNavigate();

  // If a course is passed, derive data from it
  const isCourse = !!course;
  const displayImage = course ? course.thumbnailUrl : image;
  const displayLabel = course ? course.title.substring(0, 10) + (course.title.length > 10 ? '...' : '') : label;
  
  // Logic for Course Status
  let derivedStatus: StoryStatus = status as StoryStatus;
  if (isCourse && course) {
      if (course.priority === 'HIGH') derivedStatus = 'urgent';
      else derivedStatus = 'mandatory';
  }

  // Handle Navigation
  const handleClick = () => {
      if (onClick) {
          onClick();
      } else if (isCourse && course) {
          navigate(`/course/${course.id}`);
      }
  };

  // Ring Styles based on Status
  const getRingStyle = () => {
    switch (derivedStatus) {
      case 'fiery': // Special Effect
        return "bg-gradient-to-t from-orange-500 via-red-500 to-yellow-400 animate-pulse ring-4 ring-orange-500/30";
      case 'urgent': // HIGH PRIORITY (Red/Pulse)
        return "bg-gradient-to-tr from-red-600 via-red-500 to-orange-500 animate-pulse ring-4 ring-red-500/20";
      case 'mandatory': // NORMAL MANDATORY (Blue/Cyan - Corporate)
        return "bg-gradient-to-tr from-blue-400 via-cyan-500 to-teal-400";
      case 'progress': // STARTED
        return "bg-gradient-to-tr from-green-400 to-emerald-600";
      case 'optional': // Optional
        return "bg-gradient-to-tr from-blue-300 to-gray-400";
      default: // Viewed
        return "bg-gray-300";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group relative" onClick={handleClick}>
      
      {/* Special Particle Effect for High Priority */}
      {derivedStatus === 'urgent' && (
          <div className="absolute -top-1 -right-1 z-10">
              <Sparkles className="w-4 h-4 text-red-500 fill-red-500 animate-bounce" />
          </div>
      )}

      <div className={`relative p-[3px] rounded-full ${getRingStyle()} transition-all duration-300 group-hover:scale-105`}>
        
        {/* White gap between ring and image */}
        <div className="bg-surface rounded-full p-[2px]"> 
            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden relative">
                {displayImage ? (
                    <img src={displayImage} alt={displayLabel} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs p-2 text-center">
                        {displayLabel?.substring(0, 2).toUpperCase()}
                    </div>
                )}
                
                {/* Play Overlay for Unread */}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                </div>
            </div>
        </div>

        {/* Priority Badge */}
        {derivedStatus === 'urgent' && (
            <div className="absolute bottom-0 right-0 bg-red-600 text-white text-[10px] p-1 rounded-full border-2 border-white animate-bounce">
                <AlertCircle className="w-3 h-3" />
            </div>
        )}
      </div>
      
      <span className={`text-xs font-medium text-center truncate w-20 text-gray-700`}>
        {displayLabel}
      </span>
    </div>
  );
};