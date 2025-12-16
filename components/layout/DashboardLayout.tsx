
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Settings, Menu, Search } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { SettingsDrawer } from '../../features/profile/components/SettingsDrawer';
import { useAuthStore } from '../../stores/useAuthStore';
import { AnimatePresence } from 'framer-motion';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- DYNAMIC HEADER CONFIGURATION ---
  const getHeaderConfig = () => {
    const path = location.pathname;

    // CASE A: HOME
    if (path === '/') {
      return {
        showBack: false,
        titleComponent: (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-sm">
               <span className="text-primary font-bold text-lg">H</span>
            </div>
            <span className="text-primary font-bold text-lg tracking-tight">Hotelgram</span>
          </div>
        ),
        rightAction: (
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        )
      };
    }

    // CASE B: PROFILE
    if (path === '/profile') {
      return {
        showBack: false,
        titleComponent: (
          <div className="flex flex-col">
             <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Profilim</span>
             <span className="text-primary font-bold text-lg leading-none">{currentUser?.name || 'Kullanıcı'}</span>
          </div>
        ),
        rightAction: (
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        )
      };
    }

    // CASE C: EXPLORE
    if (path === '/explore') {
      return {
        showBack: false,
        titleComponent: <span className="text-primary font-bold text-xl">Keşfet</span>,
        rightAction: null // Search is inside the page content usually
      };
    }

    // CASE D: GENERIC PAGES (Details, Lists, etc.)
    return {
      showBack: true,
      titleComponent: null, // Let page handle title or leave empty
      rightAction: null
    };
  };

  const config = getHeaderConfig();

  return (
    <div className="h-[100dvh] w-full bg-surface flex flex-col relative overflow-hidden">
      
      {/* GLOBAL HEADER (Native Feel) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 min-h-[60px] flex items-center justify-between transition-all duration-300">
          
          {/* LEFT AREA */}
          <div className="flex items-center gap-3">
              {config.showBack ? (
                  <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 -ml-2 text-gray-800 hover:bg-black/5 rounded-full transition-colors"
                  >
                      <ArrowLeft className="w-6 h-6" />
                  </button>
              ) : null}
              
              {config.titleComponent}
          </div>

          {/* RIGHT AREA */}
          <div className="flex items-center gap-2">
              {config.rightAction}
          </div>
      </header>
      
      {/* MAIN CONTENT AREA */}
      {/* pb-24 ensures content isn't hidden behind the bottom nav */}
      <main className="relative z-10 flex-1 flex flex-col pb-24 overflow-y-auto overflow-x-hidden scroll-smooth">
        {children}
      </main>

      {/* GLOBAL DRAWERS/MODALS */}
      <AnimatePresence>
        {isSettingsOpen && (
            <SettingsDrawer onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>

      {/* BOTTOM NAVIGATION */}
      <BottomNavigation />
    </div>
  );
};
