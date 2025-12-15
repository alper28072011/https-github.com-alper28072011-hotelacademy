
import React from 'react';
import { motion } from 'framer-motion';
import { Play, AlertCircle, Sparkles } from 'lucide-react';

export type StoryStatus = 'urgent' | 'mandatory' | 'progress' | 'viewed' | 'optional' | 'fiery';

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
      case 'fiery': // NEW: Onboarding/Hype - Animated Fire Effect
        return "bg-gradient-to-t from-orange-500 via-red-500 to-yellow-400 animate-pulse ring-4 ring-orange-500/30";
      case 'urgent': // HIGH PRIORITY (Red/Pulse)
        return "bg-gradient-to-tr from-red-600 via-red-500 to-orange-500 animate-pulse ring-4 ring-red-500/20";
      case 'mandatory': // NORMAL MANDATORY (Gold/Orange)
        return "bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600";
      case 'progress': // STARTED (Green)
        return "bg-gradient-to-tr from-green-400 to-emerald-600";
      case 'optional': // Optional (Blue/Gray)
        return "bg-gradient-to-tr from-blue-300 to-gray-400";
      default: // Viewed (Gray)
        return "bg-gray-300";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group relative" onClick={onClick}>
      
      {/* Special Particle Effect for Fiery status */}
      {status === 'fiery' && (
          <div className="absolute -top-1 -right-1 z-10">
              <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-bounce" />
          </div>
      )}

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
                
                {/* Play Overlay for Unread */}
                {(status === 'urgent' || status === 'mandatory' || status === 'progress' || status === 'fiery') && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                )}
            </div>
        </div>

        {/* Priority Badge */}
        {status === 'urgent' && (
            <div className="absolute bottom-0 right-0 bg-red-600 text-white text-[10px] p-1 rounded-full border-2 border-white animate-bounce">
                <AlertCircle className="w-3 h-3" />
            </div>
        )}
      </div>
      
      <span className={`text-xs font-medium text-center truncate w-20 ${status === 'viewed' ? 'text-gray-400' : 'text-gray-700 font-semibold'}`}>
        {label}
      </span>
    </div>
  );
};
