
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, Shield, Zap, Award } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { TopPerformers } from './components/TopPerformers';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { userProfile, leaderboard, initializeListeners } = useProfileStore();

  // Use the real-time profile if available, otherwise fallback to auth session
  const activeUser = userProfile || currentUser;

  useEffect(() => {
    if (currentUser) {
      const cleanup = initializeListeners(currentUser.id, currentUser.department);
      return cleanup;
    }
  }, [currentUser, initializeListeners]);

  if (!activeUser) return null;

  // Level Logic
  const xp = activeUser.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const nextLevelXp = level * 1000;
  const currentLevelBaseXp = (level - 1) * 1000;
  const progressPercent = Math.min(100, Math.max(0, ((xp - currentLevelBaseXp) / 1000) * 100));
  
  // Safe Translation Key for Title
  const levelTitleKey = `level_title_${Math.min(level, 5)}`;
  const levelTitle = t(levelTitleKey as any);

  // Determine Rank
  const myRankIndex = leaderboard.findIndex(u => u.id === activeUser.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '-';

  // Animation for XP Counter
  const Counter = ({ value }: { value: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) return;
        const duration = 1000;
        const incrementTime = duration / (end / 10); // Simple ease
        
        const timer = setInterval(() => {
            start += 10;
            if (start > end) start = end;
            setCount(start);
            if (start === end) clearInterval(timer);
        }, 10);
        return () => clearInterval(timer);
    }, [value]);
    return <span>{count}</span>;
  };

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-8">
      
      {/* 1. LOYALTY CARD SECTION */}
      <div className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-primary via-[#153059] to-primary-dark rounded-3xl shadow-2xl p-6 flex flex-col justify-between overflow-hidden border border-white/10">
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[50px] rounded-full"></div>
        
        {/* Top Row */}
        <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-accent border-2 border-primary shadow-lg flex items-center justify-center text-primary font-bold text-xl overflow-hidden">
                    {activeUser.avatar.length > 4 ? (
                        <img src={activeUser.avatar} alt={activeUser.name} className="w-full h-full object-cover" />
                    ) : (
                        activeUser.avatar
                    )}
                </div>
                <div>
                    <h2 className="text-white font-bold text-lg leading-tight">{activeUser.name}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Award className="w-3 h-3 text-accent" />
                        <span className="text-accent text-xs font-bold uppercase tracking-wider">{levelTitle}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-white/60 text-[10px] uppercase tracking-widest">{t('profile_career_id')}</div>
                <div className="text-white font-mono text-xs opacity-80">#{activeUser.id.substring(0,6).toUpperCase()}</div>
            </div>
        </div>

        {/* Bottom Row (Progress) */}
        <div className="relative z-10">
            <div className="flex justify-between text-xs text-white/80 mb-2 font-medium">
                <span>{t('profile_level')} {level}</span>
                <span>{xp} / {nextLevelXp} XP</span>
            </div>
            <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-accent-dark via-accent to-white"
                />
            </div>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-3 gap-3">
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-primary"><Counter value={xp} /></span>
            <span className="text--[10px] text-gray-400 font-bold uppercase mt-1 text-center">{t('profile_total_xp')}</span>
         </div>
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-primary">{activeUser.completedCourses?.length || 0}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 text-center">{t('profile_courses_done')}</span>
         </div>
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-accent">#{myRank}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 text-center">{t('profile_rank')}</span>
         </div>
      </div>

      {/* 3. BADGES SECTION */}
      <div>
         <h3 className="font-bold text-primary text-lg mb-4 pl-2">{t('profile_badges')}</h3>
         <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 pl-2">
            
            {/* Badge 1: First Step (XP > 0) */}
            <div className={`flex flex-col items-center gap-2 min-w-[80px] ${xp > 0 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                    <Star className="w-8 h-8 text-blue-500 fill-blue-500" />
                </div>
                <span className="text-[10px] font-bold text-center text-primary leading-tight max-w-[80px]">{t('badge_first_step')}</span>
            </div>

             {/* Badge 2: Fast Learner (Completed > 0) */}
             <div className={`flex flex-col items-center gap-2 min-w-[80px] ${(activeUser.completedCourses?.length || 0) > 0 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 border-2 border-purple-200 flex items-center justify-center shadow-sm">
                    <Zap className="w-8 h-8 text-purple-500 fill-purple-500" />
                </div>
                <span className="text-[10px] font-bold text-center text-primary leading-tight max-w-[80px]">{t('badge_fast_learner')}</span>
            </div>

            {/* Badge 3: Expert (Level >= 3) */}
            <div className={`flex flex-col items-center gap-2 min-w-[80px] ${level >= 3 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-sm">
                    <Shield className="w-8 h-8 text-amber-500 fill-amber-500" />
                </div>
                <span className="text-[10px] font-bold text-center text-primary leading-tight max-w-[80px]">{t('badge_expert')}</span>
            </div>

         </div>
      </div>

      {/* 4. LEADERBOARD SECTION */}
      <TopPerformers users={leaderboard} currentUserId={activeUser.id} />
      
      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
};
