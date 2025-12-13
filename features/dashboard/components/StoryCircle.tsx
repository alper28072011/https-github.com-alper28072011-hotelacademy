
import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export type StoryStatus = 'urgent' | 'new' | 'progress' | 'viewed';

interface StoryCircleProps {
  image?: string;
  label: string;
  status?: StoryStatus;
  onClick?: () => void;
}

export const StoryCircle: React.FC<StoryCircleProps> = ({ image, label, status = 'viewed', onClick }) => {
  
  // Ring Styles based on Status
  const getRingStyle = () => {
    switch (status) {
      case 'urgent': // GM Message (Red/Pulse)
        return "bg-gradient-to-tr from-red-600 via-red-500 to-orange-500 animate-pulse";
      case 'new': // Not Started (Instagram-like Gradient)
        return "bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600";
      case 'progress': // In Progress (Green/Gold)
        return "bg-gradient-to-tr from-green-400 to-emerald-600";
      default: // Viewed (Gray)
        return "bg-gray-300";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group" onClick={onClick}>
      <div className={`relative p-[3px] rounded-full ${getRingStyle()} transition-all duration-300 group-hover:scale-105`}>
        
        {/* White gap between ring and image */}
        <div className="bg-surface rounded-full p-[2px]"> 
            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden relative">
                {image ? (
                    <img src={image} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs p-2 text-center">
                        {label.substring(0, 2).toUpperCase()}
                    </div>
                )}
                
                {/* Play Overlay for 'new' or 'progress' */}
                {(status === 'new' || status === 'progress') && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                )}
            </div>
        </div>

        {/* Live Badge for Urgent */}
        {status === 'urgent' && (
            <div className="absolute bottom-0 right-0 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-white animate-bounce">
                LIVE
            </div>
        )}
      </div>
      
      <span className={`text-xs font-medium text-center truncate w-20 ${status === 'viewed' ? 'text-gray-400' : 'text-gray-700 font-semibold'}`}>
        {label}
      </span>
    </div>
  );
};
