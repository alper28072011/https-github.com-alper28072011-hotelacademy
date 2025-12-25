
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Menu, ChevronDown, Check, Building2, User, RefreshCw, LayoutDashboard, LogOut, Plus, Loader2 } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { SettingsDrawer } from '../../features/profile/components/SettingsDrawer';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContextStore } from '../../stores/useContextStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
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
  const { currentUser, logout } = useAuthStore();
  const { contextType, activeEntityId, activeEntityName, activeEntityAvatar, switchToPersonal, ensureContext } = useContextStore();
  const { switchOrganization } = useOrganizationStore();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [managedOrgs, setManagedOrgs] = useState<Organization[]>([]);
  
  // New: Global Switching State
  const [isSwitching, setIsSwitching] = useState(false);
  const [targetName, setTargetName] = useState('');

  // 1. Ensure Context & Fetch Managed Pages (The Truth Source)
  useEffect(() => {
      const initLayout = async () => {
          if (currentUser) {
              ensureContext(currentUser);
              try {
                  const orgs = await getUserManagedPages(currentUser.id);
                  setManagedOrgs(orgs);
              } catch (error) {
                  console.error("Failed to fetch managed organizations", error);
              }
          }
      };
      
      initLayout();
  }, [currentUser?.id]);

  // 2. ROBUST CONTEXT SWITCH HANDLER
  const handleContextSwitch = async (target: 'PERSONAL' | Organization) => {
      if (!currentUser || isSwitching) return;
      
      // Close dropdown
      setIsContextOpen(false);

      if (target === 'PERSONAL') {
          if (contextType === 'PERSONAL') return; // Already there
          
          setIsSwitching(true);
          setTargetName(currentUser.name);
          
          // Allow UI to render the loader
          setTimeout(() => {
              switchToPersonal(currentUser);
              navigate('/'); 
              setIsSwitching(false);
          }, 800); // Artificial delay for smoothness like Facebook
      
      } else {
          if (activeEntityId === target.id) return; // Already there

          setIsSwitching(true);
          setTargetName(target.name);

          // Atomic Switch via Store
          const success = await switchOrganization(target.id);
          
          if (success) {
              navigate('/admin'); // Force navigation to admin root
          } else {
              alert("Hesaba geçiş yapılamadı. Yetkiniz olmayabilir.");
          }
          
          setIsSwitching(false);
      }
  };

  // --- VISUAL THEME BASED ON CONTEXT ---
  const isOrgMode = contextType === 'ORGANIZATION';
  const headerBg = isOrgMode ? 'bg-[#336699]' : 'bg-white/80 backdrop-blur-md';
  const headerText = isOrgMode ? 'text-white' : 'text-gray-800';
  const subText = isOrgMode ? 'text-blue-100' : 'text-gray-400';

  // --- DYNAMIC HEADER CONFIGURATION ---
  const getHeaderConfig = () => {
    const path = location.pathname;

    // CASE A: HOME / DASHBOARD / ADMIN (Context Aware)
    if (path === '/' || path.startsWith('/admin') || path.startsWith('/journey') || path.startsWith('/explore')) {
      return {
        showBack: false,
        titleComponent: (
          <div className="relative">
              <button 
                onClick={() => setIsContextOpen(!isContextOpen)}
                className={`flex items-center gap-2 p-1 pr-2 rounded-full transition-colors ${isOrgMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                {/* Active Avatar */}
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center overflow-hidden shrink-0 ${isOrgMode ? 'border-white/20 bg-white' : 'border-gray-200 bg-gray-100'}`}>
                   {isOrgMode ? (
                       activeEntityAvatar ? <img src={activeEntityAvatar} className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-gray-400" />
                   ) : (
                       <Avatar src={activeEntityAvatar} alt={activeEntityName} size="sm" />
                   )}
                </div>
                
                {/* Active Name & Role */}
                <div className="flex flex-col items-start min-w-[100px] max-w-[160px]">
                    <span className={`text-[9px] font-bold uppercase leading-none mb-0.5 ${subText}`}>
                        {isOrgMode ? 'Kurumsal Hesap' : 'Bireysel Hesap'}
                    </span>
                    <div className="flex items-center gap-1 w-full">
                        <span className={`text-sm font-bold leading-none truncate ${headerText}`}>
                            {activeEntityName}
                        </span>
                        <ChevronDown className={`w-3 h-3 shrink-0 ${isOrgMode ? 'text-white/70' : 'text-gray-400'}`} />
                    </div>
                </div>
              </button>

              {/* UNIFIED CONTEXT DROPDOWN */}
              <AnimatePresence>
                  {isContextOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsContextOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5"
                        >
                            {/* SECTION 1: PERSONAL ACCOUNT */}
                            <div className="p-2">
                                <div className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2 flex items-center gap-2">
                                    <User className="w-3 h-3" /> Kişisel Profil
                                </div>
                                <button 
                                    onClick={() => handleContextSwitch('PERSONAL')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                                        !isOrgMode ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative border border-gray-200 shrink-0">
                                        <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="md" />
                                        <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 shadow-sm">
                                            <User className="w-3 h-3 text-gray-600" />
                                        </div>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className={`text-sm font-bold truncate ${!isOrgMode ? 'text-blue-900' : 'text-gray-900'}`}>
                                            {currentUser?.name}
                                        </div>
                                        <div className="text-[10px] text-gray-500">Öğrenim & Kariyer</div>
                                    </div>
                                    {!isOrgMode && <div className="bg-blue-500 rounded-full p-1"><Check className="w-3 h-3 text-white" /></div>}
                                </button>
                            </div>

                            <div className="h-px bg-gray-100 mx-2" />

                            {/* SECTION 2: MANAGED ORGANIZATIONS */}
                            <div className="p-2 bg-gray-50/50">
                                <div className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2 flex items-center gap-2 justify-between">
                                    <span className="flex items-center gap-2"><LayoutDashboard className="w-3 h-3" /> Yönetim Panelleri</span>
                                    <span className="bg-gray-200 text-gray-600 px-1.5 rounded text-[9px]">{managedOrgs.length}</span>
                                </div>
                                
                                <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                                    {managedOrgs.map(org => {
                                        const isActive = isOrgMode && activeEntityId === org.id;
                                        return (
                                            <button 
                                                key={org.id}
                                                onClick={() => handleContextSwitch(org)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors border ${
                                                    isActive 
                                                    ? 'bg-white border-blue-500 shadow-md relative z-10' 
                                                    : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0">
                                                    {org.logoUrl ? (
                                                        <img src={org.logoUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 bg-gray-50">{org.name[0]}</div>
                                                    )}
                                                    <div className="absolute bottom-0 right-0 bg-white rounded-tl-md p-0.5 shadow-sm border-t border-l border-gray-100">
                                                        <Building2 className="w-3 h-3 text-gray-600" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className={`text-sm font-bold truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>{org.name}</div>
                                                    <div className="text-[10px] text-gray-500">İşletme Hesabı</div>
                                                </div>
                                                {isActive && <div className="bg-blue-500 rounded-full p-1"><Check className="w-3 h-3 text-white" /></div>}
                                            </button>
                                        );
                                    })}

                                    {managedOrgs.length === 0 && (
                                        <div className="text-center p-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                            Yönettiğiniz bir sayfa bulunmuyor.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 3: FOOTER ACTIONS */}
                            <div className="bg-gray-50 border-t border-gray-100 p-2 flex gap-2">
                                <button 
                                    onClick={() => { setIsContextOpen(false); navigate('/lobby'); }}
                                    className="flex-1 py-2 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-3 h-3" /> Yeni Kurum Ekle
                                </button>
                                <button 
                                    onClick={() => { setIsContextOpen(false); logout(); }}
                                    className="w-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
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

    // CASE C: GENERIC PAGES
    return {
      showBack: true,
      titleComponent: null,
      rightAction: null
    };
  };

  const config = getHeaderConfig();

  return (
    <div className="flex flex-col h-screen w-full bg-surface overflow-hidden supports-[height:100dvh]:h-[100dvh] relative">
      
      {/* 0. SWITCHING OVERLAY (Facebook Style) */}
      <AnimatePresence>
          {isSwitching && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 border border-gray-100">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Geçiş Yapılıyor...</h3>
                  <p className="text-sm text-gray-500">{targetName} olarak oturum açılıyor</p>
              </motion.div>
          )}
      </AnimatePresence>

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
      <main className={`flex-1 overflow-y-auto scroll-smooth no-scrollbar relative w-full ${!isOrgMode ? 'pb-24' : 'pb-4'}`}>
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
