
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Menu, Search } from 'lucide-react';
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
    <div className="flex flex-col h-screen w-full bg-surface overflow-hidden supports-[height:100dvh]:h-[100dvh]">
      
      {/* 1. Header Area - Fixed at top via Flex Flow */}
      {/* shrink-0 ensures header doesn't collapse if content is huge */}
      <div className="shrink-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
          <header className="px-4 py-3 min-h-[60px] flex items-center justify-between">
              
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
      </div>
      
      {/* 2. Main Content Area - Scrollable */}
      {/* flex-1 takes remaining space. overflow-y-auto enables scrolling inside this box. */}
      {/* pb-24 adds padding at bottom so content isn't hidden behind fixed BottomNav */}
      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth no-scrollbar relative w-full">
        {children}
      </main>

      {/* 3. Global Drawers */}
      <AnimatePresence>
        {isSettingsOpen && (
            <SettingsDrawer onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>

      {/* 4. Bottom Navigation - Fixed */}
      <BottomNavigation />
    </div>
  );
};
