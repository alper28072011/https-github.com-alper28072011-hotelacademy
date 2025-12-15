
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, Shield, Zap, Award, Heart, Users } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { TopPerformers } from './components/TopPerformers';
import { KudosType } from '../../types';

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

  // --- BADGE MAP ---
  const badgeConfig: Record<KudosType, { icon: any, color: string, bg: string, label: string }> = {
      'STAR_PERFORMER': { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Yıldız Performans' },
      'TEAM_PLAYER': { icon: Users, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Takım Oyuncusu' },
      'GUEST_HERO': { icon: Heart, color: 'text-red-500', bg: 'bg-red-100', label: 'Misafir Kahramanı' },
      'FAST_LEARNER': { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-100', label: 'Hızlı Öğrenen' },
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

      {/* 3. BADGES SECTION (DYNAMIC) */}
      <div>
         <h3 className="font-bold text-primary text-lg mb-4 pl-2 flex items-center gap-2">
             {t('profile_badges')} 
             <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{activeUser.badges?.length || 0}</span>
         </h3>
         
         <div className="grid grid-cols-2 gap-3 pl-2">
            
            {/* Standard "System" Badges (Legacy) */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${xp > 0 ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                    <Star className="w-5 h-5 fill-current" />
                </div>
                <div>
                    <div className="text-xs font-bold text-gray-800">{t('badge_first_step')}</div>
                    <div className="text-[10px] text-gray-400">Otomatik</div>
                </div>
            </div>

            {/* DYNAMIC KUDOS BADGES */}
            {activeUser.badges?.map((badge, idx) => {
                const config = badgeConfig[badge.type];
                if (!config) return null;
                const BIcon = config.icon;

                return (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border bg-white border-${config.color.split('-')[1]}-200 relative overflow-hidden group`}>
                        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center ${config.color}`}>
                            <BIcon className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-800 truncate">{config.label}</div>
                            <div className="text-[10px] text-gray-400">x{badge.count} Kez</div>
                        </div>
                    </div>
                );
            })}

            {(!activeUser.badges || activeUser.badges.length === 0) && (
                <div className="col-span-2 text-center py-6 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-xl">
                    Henüz özel bir rozet kazanılmadı.
                </div>
            )}

         </div>
      </div>

      {/* 4. LEADERBOARD SECTION */}
      <TopPerformers users={leaderboard} currentUserId={activeUser.id} />
      
      {/* Bottom Spacer */}
      <div className="h-8" />
    </div>
  );
};
