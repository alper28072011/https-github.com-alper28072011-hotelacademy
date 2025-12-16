
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Compass, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

export const BottomNavigation: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: '/', icon: Home, label: t('nav_home') },
    { id: '/explore', icon: Compass, label: 'Explore' },
    { id: '/profile', icon: User, label: t('nav_profile') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200/50 px-6 pt-2 pb-6 z-50 shadow-lg shadow-black/5">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className="relative flex flex-col items-center justify-center w-16 h-14"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -top-2.5 w-10 h-1 bg-accent rounded-full shadow-sm shadow-accent/50"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              <div className={`transition-all duration-300 ${isActive ? 'text-primary -translate-y-0.5' : 'text-gray-400'}`}>
                <tab.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              
              <span className={`text-[10px] font-bold mt-0.5 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 scale-90 opacity-80'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
