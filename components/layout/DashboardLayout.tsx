
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Menu, ChevronDown, Check, Building2, User } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { SettingsDrawer } from '../../features/profile/components/SettingsDrawer';
import { useAuthStore } from '../../stores/useAuthStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { getUserManagedPages } from '../../services/organizationService'; // Need this helper
import { Organization } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, activeContext, switchContext } = useAuthStore();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [managedOrgs, setManagedOrgs] = useState<Organization[]>([]);

  // Load Managed Orgs for Switcher
  useEffect(() => {
      if (currentUser && currentUser.managedPageIds?.length > 0) {
          getUserManagedPages(currentUser.id).then(setManagedOrgs);
      }
  }, [currentUser]);

  const handleContextSwitch = (id: string, type: 'USER' | 'ORGANIZATION', name: string, avatar: string, role: string) => {
      switchContext({ id, type, name, avatar, role: role as any });
      setIsContextOpen(false);
      // Optional: Navigate to home to refresh feed context
      if (location.pathname !== '/') navigate('/');
  };

  // --- DYNAMIC HEADER CONFIGURATION ---
  const getHeaderConfig = () => {
    const path = location.pathname;

    // CASE A: HOME (Context Aware)
    if (path === '/') {
      return {
        showBack: false,
        titleComponent: (
          <div className="relative">
              <button 
                onClick={() => setIsContextOpen(!isContextOpen)}
                className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden ${activeContext?.type === 'ORGANIZATION' ? 'bg-white p-0.5' : 'bg-gray-100'}`}>
                   <Avatar src={activeContext?.avatar} alt={activeContext?.name || ''} size="sm" />
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-400 font-bold uppercase leading-none">
                        {activeContext?.type === 'ORGANIZATION' ? 'Yönetici Modu' : 'Kişisel Mod'}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-gray-800 leading-none truncate max-w-[150px]">
                            {activeContext?.name}
                        </span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                    </div>
                </div>
              </button>

              {/* CONTEXT DROPDOWN */}
              <AnimatePresence>
                  {isContextOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsContextOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                        >
                            <div className="p-2">
                                <div className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2">Şu anki Kimlik</div>
                                {/* Personal Profile */}
                                <button 
                                    onClick={() => currentUser && handleContextSwitch(currentUser.id, 'USER', currentUser.name, currentUser.avatar, currentUser.role)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${activeContext?.type === 'USER' ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden relative">
                                        <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="sm" />
                                        <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5"><User className="w-3 h-3 text-gray-600" /></div>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-sm font-bold">{currentUser?.name}</div>
                                        <div className="text-[10px] opacity-70">Kişisel Profil</div>
                                    </div>
                                    {activeContext?.type === 'USER' && <Check className="w-4 h-4 text-blue-600" />}
                                </button>

                                {managedOrgs.length > 0 && (
                                    <>
                                        <div className="h-px bg-gray-100 my-2" />
                                        <div className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2">Yönetilen Sayfalar</div>
                                        {managedOrgs.map(org => (
                                            <button 
                                                key={org.id}
                                                onClick={() => handleContextSwitch(org.id, 'ORGANIZATION', org.name, org.logoUrl, 'ADMIN')}
                                                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${activeContext?.id === org.id ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative">
                                                    <img src={org.logoUrl} className="w-full h-full object-cover" />
                                                    <div className="absolute bottom-0 right-0 bg-white rounded-tl-md p-0.5"><Building2 className="w-3 h-3 text-gray-600" /></div>
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <div className="text-sm font-bold truncate">{org.name}</div>
                                                    <div className="text-[10px] opacity-70">Sayfa Yöneticisi</div>
                                                </div>
                                                {activeContext?.id === org.id && <Check className="w-4 h-4 text-blue-600" />}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </motion.div>
                      </>
                  )}
              </AnimatePresence>
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

    // CASE B: PROFILE (Simplified for Context)
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
      <div className="shrink-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
          <header className="px-4 py-3 min-h-[60px] flex items-center justify-between">
              
              {/* LEFT AREA (Dynamic Title / Back) */}
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
      
      {/* 2. Main Content Area */}
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
