
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Play, Clock, Zap, Award, Sparkles, Hash } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { getCourse, startCourse } from '../../services/db';
import { Course } from '../../types';

export const CourseIntroPage: React.FC = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { currentUser } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (courseId) {
        const c = await getCourse(courseId);
        setCourse(c);
      }
    };
    fetch();
  }, [courseId]);

  const handleStart = async () => {
    if (currentUser && course) {
      // Mark as started in DB if not already
      if (!currentUser.startedCourses?.includes(course.id)) {
          await startCourse(currentUser.id, course.id);
      }
      // Navigate to player
      navigate(`/course/${course.id}/play`);
    }
  };

  if (!course) return null;

  return (
    <div className="relative h-screen w-full bg-black text-white overflow-hidden flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={course.thumbnailUrl} 
          alt={course.title} 
          className="w-full h-full object-cover opacity-80"
        />
        {/* Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
      </div>

      {/* Close Button */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 z-50 p-3 bg-white/10 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all active:scale-95"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Content Container (Bottom Aligned) */}
      <div className="relative z-10 mt-auto p-6 md:p-12 pb-24 md:pb-12 max-w-2xl">
        
        {/* Animated Entrance */}
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, ease: "easeOut" }}
        >
            {/* Tags */}
            {course.tags && (
                <div className="flex gap-2 mb-4">
                    {course.tags.map(tag => (
                        <span key={tag} className="bg-accent/20 border border-accent/30 text-accent text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                            <Hash className="w-3 h-3" /> {tag.replace('#', '')}
                        </span>
                    ))}
                </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] mb-4 text-white drop-shadow-lg">
                {course.title}
            </h1>

            {/* Quote */}
            {course.coverQuote && (
                <div className="mb-6 pl-4 border-l-4 border-accent">
                    <p className="text-lg md:text-xl italic text-gray-200 font-light leading-relaxed">
                        {course.coverQuote}
                    </p>
                </div>
            )}

            {/* Meta Info */}
            <div className="flex items-center gap-6 mb-6 text-sm font-medium text-gray-300">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    <span>{course.duration} Dakika</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>+{course.xpReward} XP</span>
                </div>
                <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span>Başlangıç Seviyesi</span>
                </div>
            </div>

            {/* Description */}
            <p className="text-gray-400 leading-relaxed mb-10 max-w-lg line-clamp-3">
                {course.description}
            </p>
        </motion.div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="w-full bg-accent hover:bg-white text-primary text-lg font-bold py-4 rounded-2xl shadow-xl shadow-accent/20 flex items-center justify-center gap-3 transition-colors animate-pulse-slow"
          >
              <Play className="w-6 h-6 fill-current" />
              <span>Eğitime Başla</span>
              <Sparkles className="w-5 h-5 opacity-50" />
          </motion.button>
      </div>
    </div>
  );
};
