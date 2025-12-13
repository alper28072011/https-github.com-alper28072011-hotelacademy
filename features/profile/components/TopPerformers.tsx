import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types';
import { Medal, Trophy } from 'lucide-react';

interface TopPerformersProps {
  users: User[];
  currentUserId: string;
}

export const TopPerformers: React.FC<TopPerformersProps> = ({ users, currentUserId }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-accent-dark" />
        <h3 className="font-bold text-primary text-lg">{t('profile_leaderboard')}</h3>
      </div>

      <div className="flex flex-col gap-3">
        {users.map((user, index) => {
          const rank = index + 1;
          const isCurrentUser = user.id === currentUserId;
          
          let rankIcon = <span className="font-bold text-gray-400 w-6 text-center">{rank}</span>;
          if (rank === 1) rankIcon = <Medal className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />;
          if (rank === 2) rankIcon = <Medal className="w-6 h-6 text-gray-400 fill-gray-400/20" />;
          if (rank === 3) rankIcon = <Medal className="w-6 h-6 text-orange-400 fill-orange-400/20" />;

          return (
            <div 
              key={user.id} 
              className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${
                isCurrentUser 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                  : 'bg-surface hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex-shrink-0 flex items-center justify-center w-8">
                {rankIcon}
              </div>

              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                isCurrentUser ? 'bg-accent text-primary' : 'bg-white border border-gray-200 text-primary'
              }`}>
                {user.avatar}
              </div>

              <div className="flex-1">
                <div className="font-bold text-sm truncate">{user.name}</div>
                <div className={`text-xs ${isCurrentUser ? 'text-white/60' : 'text-gray-400'}`}>
                    {t('level_title_' + Math.min(Math.floor(user.xp / 1000) + 1, 5) as any)}
                </div>
              </div>

              <div className="font-bold text-sm">
                {user.xp} <span className="text-[10px] opacity-70">XP</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};