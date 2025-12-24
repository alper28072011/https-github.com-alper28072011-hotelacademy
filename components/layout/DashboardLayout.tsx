
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Menu, ChevronDown, Check, Building2, User, RefreshCw } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { SettingsDrawer } from '../../features/profile/components/SettingsDrawer';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContextStore } from '../../stores/useContextStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { getUserManagedPages } from '../../services/organizationService';
import { Organization } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { contextType, activeEntityId, activeEntityName, activeEntityAvatar, switchToPersonal, switchToOrganization, ensureContext } = useContextStore();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [managedOrgs, setManagedOrgs] = useState<Organization[]>([]);

  // 1. Ensure Context on Load
  useEffect(() => {
      if (currentUser) {
          ensureContext(currentUser);
          if (currentUser.managedPageIds?.length > 0) {
              getUserManagedPages(currentUser.id).then(setManagedOrgs);
          }
      }
  }, [currentUser]);

  // 2. Context Switch Handler
  const handleContextSwitch = (target: 'PERSONAL' | Organization) => {
      if (!currentUser) return;

      if (target === 'PERSONAL') {
          switchToPersonal(currentUser);
          navigate('/'); // Go to Personal Feed
      } else {
          switchToOrganization(target.id, target.name, target.logoUrl);
          navigate('/admin'); // Go to Manager Dashboard
      }
      setIsContextOpen(false);
  };

  // --- VISUAL THEME BASED ON CONTEXT ---
  const isOrgMode = contextType === 'ORGANIZATION';
  const headerBg = isOrgMode ? 'bg-[#336699]' : 'bg-white/80 backdrop-blur-md';
  const headerText = isOrgMode ? 'text-white' : 'text-gray-800';
  const subText = isOrgMode ? 'text-blue-100' : 'text-gray-400';

  // --- DYNAMIC HEADER CONFIGURATION ---
  const getHeaderConfig = () => {
    const path = location.pathname;

    // CASE A: HOME / DASHBOARD (Context Aware)
    if (path === '/' || path.startsWith('/admin')) {
      return {
        showBack: false,
        titleComponent: (
          <div className="relative">
              <button 
                onClick={() => setIsContextOpen(!isContextOpen)}
                className={`flex items-center gap-2 p-1 pr-2 rounded-full transition-colors ${isOrgMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden ${isOrgMode ? 'border-white/20 bg-white' : 'border-gray-200 bg-gray-100'}`}>
                   {isOrgMode ? <img src={activeEntityAvatar} className="w-full h-full object-cover" /> : <Avatar src={activeEntityAvatar} alt={activeEntityName} size="sm" />}
                </div>
                <div className="flex flex-col items-start">
                    <span className={`text-[9px] font-bold uppercase leading-none ${subText}`}>
                        {isOrgMode ? 'Yönetim Modu' : 'Bireysel Mod'}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className={`text-sm font-bold leading-none truncate max-w-[150px] ${headerText}`}>
                            {activeEntityName}
                        </span>
                        <ChevronDown className={`w-3 h-3 ${isOrgMode ? 'text-white/70' : 'text-gray-400'}`} />
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
                            className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                        >
                            <div className="p-2">
                                <div className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2 flex items-center gap-2">
                                    <RefreshCw className="w-3 h-3" /> Hesap Değiştir
                                </div>
                                
                                {/* Personal Profile */}
                                <button 
                                    onClick={() => handleContextSwitch('PERSONAL')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${contextType === 'PERSONAL' ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden relative border border-gray-200">
                                        <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="md" />
                                        <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5"><User className="w-3 h-3 text-gray-600" /></div>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-sm font-bold">{currentUser?.name}</div>
                                        <div className="text-[10px] text-gray-500">Kişisel Profil</div>
                                    </div>
                                    {contextType === 'PERSONAL' && <Check className="w-4 h-4 text-blue-600" />}
                                </button>

                                {managedOrgs.length > 0 && (
                                    <>
                                        <div className="h-px bg-gray-100 my-2" />
                                        <div className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2">Yönetilen Sayfalar</div>
                                        {managedOrgs.map(org => (
                                            <button 
                                                key={org.id}
                                                onClick={() => handleContextSwitch(org)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeEntityId === org.id && isOrgMode ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative">
                                                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{org.name[0]}</div>}
                                                    <div className="absolute bottom-0 right-0 bg-white rounded-tl-md p-0.5"><Building2 className="w-3 h-3 text-gray-600" /></div>
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <div className="text-sm font-bold truncate">{org.name}</div>
                                                    <div className="text-[10px] text-gray-500">İşletme Hesabı</div>
                                                </div>
                                                {activeEntityId === org.id && isOrgMode && <Check className="w-4 h-4 text-blue-600" />}
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
          <button className={`p-2 rounded-full transition-colors relative ${isOrgMode ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>
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

    // CASE D: GENERIC PAGES
    return {
      showBack: true,
      titleComponent: null,
      rightAction: null
    };
  };

  const config = getHeaderConfig();

  return (
    <div className="flex flex-col h-screen w-full bg-surface overflow-hidden supports-[height:100dvh]:h-[100dvh]">
      
      {/* 1. Header Area */}
      <div className={`shrink-0 z-50 border-b transition-all duration-300 ${headerBg} ${isOrgMode ? 'border-[#29487d]' : 'border-gray-100'}`}>
          <header className="px-4 py-3 min-h-[60px] flex items-center justify-between">
              
              {/* LEFT AREA */}
              <div className="flex items-center gap-3">
                  {config.showBack ? (
                      <button 
                        onClick={() => navigate(-1)} 
                        className={`p-2 -ml-2 rounded-full transition-colors ${isOrgMode ? 'text-white hover:bg-white/10' : 'text-gray-800 hover:bg-black/5'}`}
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

      {/* 4. Bottom Navigation - Only show in PERSONAL mode */}
      {!isOrgMode && <BottomNavigation />}
    </div>
  );
};
