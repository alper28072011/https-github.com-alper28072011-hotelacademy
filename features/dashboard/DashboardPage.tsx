import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { StoryCircle } from './components/StoryCircle';
import { PriorityTaskCard } from './components/PriorityTaskCard';
import { Wrench, Calendar, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();

  const stories = [
    { id: 1, label: t('stories_gm'), image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100', unread: true },
    { id: 2, label: t('stories_menu'), image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=100', unread: true },
    { id: 3, label: t('stories_tips'), unread: false },
  ];

  const quickActions = [
    { id: 'report', icon: Wrench, label: t('quick_report'), color: 'bg-orange-100 text-orange-600', path: '/operations' },
    { id: 'schedule', icon: Calendar, label: t('quick_schedule'), color: 'bg-blue-100 text-blue-600', path: '/operations' }, // Linked to operations
    { id: 'leave', icon: LogOut, label: t('quick_leave'), color: 'bg-purple-100 text-purple-600', path: '/profile' },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Area */}
      <div className="px-6 pt-8 pb-4 flex justify-between items-center text-white">
        <div>
           <p className="text-accent text-sm font-medium tracking-wider uppercase mb-0.5">Hotel Academy</p>
           <h1 className="text-2xl font-bold">{t('welcome_back')} {currentUser?.name.split(' ')[0]}</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-bold cursor-pointer" onClick={logout}>
            {currentUser?.avatar}
        </div>
      </div>

      {/* Stories Section (Horizontal Scroll) */}
      <div className="w-full overflow-x-auto no-scrollbar pl-6 pb-2">
         <div className="flex gap-4">
            {stories.map(story => (
                <StoryCircle key={story.id} label={story.label} image={story.image} isUnread={story.unread} />
            ))}
         </div>
      </div>

      {/* Hero / Priority Task Section */}
      <div className="px-4">
         <PriorityTaskCard />
      </div>

      {/* Quick Actions Section */}
      <div className="px-6 mt-2">
         <h3 className="text-primary font-bold text-lg mb-4">{t('section_quick_actions')}</h3>
         <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
            {quickActions.map(action => (
                <motion.button 
                    key={action.id}
                    onClick={() => navigate(action.path)}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center justify-center min-w-[100px] h-[100px] bg-white rounded-2xl shadow-sm border border-gray-100"
                >
                    <div className={`p-3 rounded-full mb-2 ${action.color}`}>
                        <action.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{action.label}</span>
                </motion.button>
            ))}
         </div>
      </div>

      {/* Bottom Spacer for Navigation */}
      <div className="h-8" />
    </div>
  );
};