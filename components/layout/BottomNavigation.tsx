import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, GraduationCap, User } from 'lucide-react';
import { motion } from 'framer-motion';

export const BottomNavigation: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState('home');

  const tabs = [
    { id: 'home', icon: Home, label: t('nav_home') },
    { id: 'learning', icon: GraduationCap, label: t('nav_learning') },
    { id: 'profile', icon: User, label: t('nav_profile') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-6 py-2 pb-6 md:pb-4 z-50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
      <div className="flex justify-around items-end">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center justify-center w-20 h-16"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -top-2 w-12 h-1 bg-accent rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              <div className={`transition-all duration-300 ${isActive ? 'text-primary -translate-y-1' : 'text-gray-400'}`}>
                <tab.icon className={`w-7 h-7 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              
              <span className={`text-[10px] font-medium mt-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};