
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Menu, ChevronDown, Check, Building2, User, LayoutDashboard, LogOut, Plus, Loader2 } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { SettingsDrawer } from '../../features/profile/components/SettingsDrawer';
import { useAuthStore } from '../../stores/useAuthStore';
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
  const { startOrganizationSession, isSwitching } = useOrganizationStore();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [managedOrgs, setManagedOrgs] = useState<Organization[]>([]);
  
  // Local switching state for UI feedback
  const [targetName, setTargetName] = useState('');

  // Initial Load
  useEffect(() => {
      const initLayout = async () => {
          if (currentUser) {
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

  // --- NEW ATOMIC SWITCH HANDLER ---
  const handleContextSwitch = async (target: Organization) => {
      if (isSwitching) return;
      setIsContextOpen(false);
      setTargetName(target.name);

      // 1. Start the Session (This updates Store + Context + Auth)
      const result = await startOrganizationSession(target.id);
      
      if (result.success) {
          // 2. Only Navigate AFTER success
          navigate('/admin'); 
      } else {
          alert(`Geçiş başarısız: ${result.error || 'Bilinmeyen hata'}`);
      }
  };

  // Static Visuals for Personal Mode
  const headerBg = 'bg-white/80 backdrop-blur-md';

  // --- HEADER CONFIG ---
  const getHeaderConfig = () => {
    const path = location.pathname;

    // Home / Explore
    if (path === '/' || path.startsWith('/journey') || path.startsWith('/explore')) {
      return {
        showBack: false,
        titleComponent: (
          <div className="relative">
              <button 
                onClick={() => setIsContextOpen(!isContextOpen)}
                className="flex items-center gap-2 p-1 pr-2 rounded-full transition-colors hover:bg-gray-100"
              >
                <div className="w-9 h-9 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                   <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="sm" />
                </div>
                
                <div className="flex flex-col items-start min-w-[100px] max-w-[160px]">
                    <span className="text-[9px] font-bold uppercase leading-none mb-0.5 text-gray-400">
                        Bireysel Hesap
                    </span>
                    <div className="flex items-center gap-1 w-full">
                        <span className="text-sm font-bold leading-none truncate text-gray-800">
                            {currentUser?.name}
                        </span>
                        <ChevronDown className="w-3 h-3 shrink-0 text-gray-400" />
                    </div>
                </div>
              </button>

              {/* DROPDOWN */}
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
                            {/* Personal Section */}
                            <div className="p-2">
                                <div className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2 flex items-center gap-2">
                                    <User className="w-3 h-3" /> Kişisel Profil
                                </div>
                                <button 
                                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors bg-blue-50 border border-blue-100 cursor-default"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative border border-gray-200 shrink-0">
                                        <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="md" />
                                        <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 shadow-sm">
                                            <Check className="w-3 h-3 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="text-sm font-bold truncate text-blue-900">{currentUser?.name}</div>
                                        <div className="text-[10px] text-gray-500">Aktif Oturum</div>
                                    </div>
                                </button>
                            </div>

                            <div className="h-px bg-gray-100 mx-2" />

                            {/* Organizations Section */}
                            <div className="p-2 bg-gray-50/50">
                                <div className="text-[10px] font-bold text-gray-400 uppercase px-3 py-2 flex items-center gap-2 justify-between">
                                    <span className="flex items-center gap-2"><LayoutDashboard className="w-3 h-3" /> Yönetim Panelleri</span>
                                </div>
                                
                                <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                                    {managedOrgs.map(org => (
                                        <button 
                                            key={org.id}
                                            onClick={() => handleContextSwitch(org)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors border bg-white border-gray-100 hover:border-blue-300 hover:shadow-sm group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0">
                                                {org.logoUrl ? (
                                                    <img src={org.logoUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 bg-gray-50">{org.name[0]}</div>
                                                )}
                                                <div className="absolute bottom-0 right-0 bg-white rounded-tl-md p-0.5 shadow-sm border-t border-l border-gray-100 group-hover:bg-blue-50">
                                                    <Building2 className="w-3 h-3 text-gray-600 group-hover:text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-sm font-bold truncate text-gray-900 group-hover:text-blue-900">{org.name}</div>
                                                <div className="text-[10px] text-gray-500">İşletme Hesabına Geç</div>
                                            </div>
                                        </button>
                                    ))}

                                    {managedOrgs.length === 0 && (
                                        <div className="text-center p-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                                            Yönettiğiniz bir sayfa bulunmuyor.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
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
          <button className="p-2 rounded-full transition-colors relative text-gray-600 hover:bg-gray-100">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        )
      };
    }

    // Profile
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

    // Generic
    return {
      showBack: true,
      titleComponent: null,
      rightAction: null
    };
  };

  const config = getHeaderConfig();

  return (
    <div className="flex flex-col h-screen w-full bg-surface overflow-hidden supports-[height:100dvh]:h-[100dvh] relative">
      
      {/* SWITCHING OVERLAY (BLOCKING) */}
      <AnimatePresence>
          {isSwitching && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6 border border-gray-100">
                      <Loader2 className="w-10 h-10 animate-spin text-[#3b5998]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Hesap Değiştiriliyor</h3>
                  <p className="text-sm text-slate-500 font-medium">"{targetName}" paneli hazırlanıyor...</p>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Header Area */}
      <div className={`shrink-0 z-50 border-b transition-all duration-300 ${headerBg} border-gray-100`}>
          <header className="px-4 py-3 min-h-[60px] flex items-center justify-between">
              
              <div className="flex items-center gap-3">
                  {config.showBack ? (
                      <button 
                        onClick={() => navigate(-1)} 
                        className="p-2 -ml-2 rounded-full transition-colors text-gray-800 hover:bg-black/5"
                      >
                          <ArrowLeft className="w-6 h-6" />
                      </button>
                  ) : null}
                  {config.titleComponent}
              </div>

              <div className="flex items-center gap-2">
                  {config.rightAction}
              </div>
          </header>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth no-scrollbar relative w-full pb-24">
        {children}
      </main>

      {/* Drawers */}
      <AnimatePresence>
        {isSettingsOpen && (
            <SettingsDrawer onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <BottomNavigation />
    </div>
  );
};
