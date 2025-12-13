import React from 'react';
import { motion } from 'framer-motion';

interface StoryCircleProps {
  image?: string;
  label: string;
  isUnread?: boolean;
}

export const StoryCircle: React.FC<StoryCircleProps> = ({ image, label, isUnread = false }) => {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[72px]">
      <div className={`relative p-[3px] rounded-full ${isUnread ? 'bg-gradient-to-tr from-accent via-yellow-200 to-accent-dark' : 'bg-gray-200'}`}>
        <div className="w-16 h-16 rounded-full bg-white border-2 border-white overflow-hidden shadow-sm flex items-center justify-center">
            {image ? (
                <img src={image} alt={label} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs p-2 text-center leading-tight">
                    {label.substring(0, 2).toUpperCase()}
                </div>
            )}
        </div>
      </div>
      <span className="text-xs text-white/90 font-medium text-center truncate w-full shadow-black drop-shadow-md">
        {label}
      </span>
    </div>
  );
};