
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Menu, ChevronDown, Check, Building2, User, LayoutDashboard, LogOut, Plus, Loader2, Home, Search, Globe } from 'lucide-react';
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
  const [targetName, setTargetName] = useState('');

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

  const handleContextSwitch = async (target: Organization) => {
      if (isSwitching) return;
      setIsContextOpen(false);
      setTargetName(target.name);
      const result = await startOrganizationSession(target.id);
      if (result.success) {
          navigate('/admin'); 
      } else {
          alert(`Geçiş başarısız: ${result.error}`);
      }
  };

  const menuItems = [
      { label: 'Haber Kaynağı', icon: Home, path: '/' },
      { label: 'Keşfet', icon: Globe, path: '/explore' },
      { label: 'Gruplar', icon: Building2, path: '/lobby' },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-[#eff0f2] overflow-hidden">
      
      {/* SWITCHING OVERLAY */}
      <AnimatePresence>
          {isSwitching && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-white/90 flex flex-col items-center justify-center"
              >
                  <Loader2 className="w-8 h-8 animate-spin text-[#3b5998] mb-2" />
                  <p className="text-sm font-bold text-[#333]">Yükleniyor...</p>
              </motion.div>
          )}
      </AnimatePresence>

      {/* CLASSIC BLUE HEADER */}
      <div className="bg-[#3b5998] border-b border-[#29487d] h-[42px] shrink-0 z-50 flex items-center justify-between px-2 md:px-20 shadow-sm relative">
          
          {/* Left: Logo & Search */}
          <div className="flex items-center gap-2">
              <div onClick={() => navigate('/')} className="cursor-pointer bg-[#3b5998] p-1">
                  <span className="text-white font-bold text-lg tracking-tighter">f</span>
              </div>
              
              {/* Minimal Search Bar */}
              <div className="relative hidden md:block">
                  <input 
                      placeholder="Ara..." 
                      className="h-[24px] w-[250px] pl-2 pr-6 text-xs border border-[#20365F] rounded-sm focus:outline-none focus:bg-white"
                  />
                  <Search className="w-3 h-3 absolute right-2 top-1.5 text-gray-400" />
              </div>
          </div>

          {/* Right: Nav Links */}
          <div className="flex items-center gap-4 text-white text-xs font-bold">
              <button onClick={() => navigate('/')} className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1">
                  <Home className="w-3 h-3" /> Ana Sayfa
              </button>
              <button onClick={() => navigate('/profile')} className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1">
                  <User className="w-3 h-3" /> Profil
              </button>
              <div className="h-4 w-px bg-[#29487d] mx-1" />
              
              {/* Context Switcher (Simple Text) */}
              <button 
                onClick={() => setIsContextOpen(!isContextOpen)}
                className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1"
              >
                  Hesap <ChevronDown className="w-3 h-3" />
              </button>

              {/* Context Dropdown */}
              {isContextOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsContextOpen(false)} />
                    <div className="absolute top-[35px] right-2 w-64 bg-white border border-[#899bc1] shadow-lg z-50 rounded-sm">
                        <div className="p-1">
                            <div className="text-[10px] text-[#999] uppercase px-2 py-1 font-bold">Hesap Değiştir</div>
                            {managedOrgs.map(org => (
                                <button 
                                    key={org.id}
                                    onClick={() => handleContextSwitch(org)}
                                    className="w-full text-left px-2 py-1.5 hover:bg-[#3b5998] hover:text-white flex items-center gap-2 text-xs font-bold text-[#333]"
                                >
                                    <div className="w-4 h-4 bg-gray-200 border border-gray-300">
                                        {org.logoUrl && <img src={org.logoUrl} className="w-full h-full" />}
                                    </div>
                                    {org.name}
                                </button>
                            ))}
                            <div className="border-t border-[#ccc] my-1"></div>
                            <button onClick={() => { setIsContextOpen(false); logout(); }} className="w-full text-left px-2 py-1.5 hover:bg-[#3b5998] hover:text-white text-xs text-[#333]">
                                Çıkış Yap
                            </button>
                        </div>
                    </div>
                  </>
              )}
          </div>
      </div>
      
      {/* Main Content Area - Centered Column */}
      <main className="flex-1 overflow-y-auto relative w-full flex justify-center">
        <div className="w-full max-w-[980px] bg-transparent md:flex md:gap-4 p-0 md:pt-4">
            
            {/* Left Sidebar (Desktop Only) - Navigation */}
            <div className="hidden md:block w-[180px] shrink-0">
                <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => navigate('/profile')}>
                    <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="md" className="rounded-sm" />
                    <div>
                        <div className="font-bold text-[#3b5998] text-xs">{currentUser?.name}</div>
                        <div className="text-[10px] text-gray-500">Profili Düzenle</div>
                    </div>
                </div>
                
                <div className="space-y-1">
                    {menuItems.map(item => {
                        const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                        return (
                            <button 
                                key={item.label} 
                                onClick={() => navigate(item.path)} 
                                className={`w-full flex items-center gap-2 px-2 py-1.5 mb-1 text-xs transition-colors rounded-sm ${
                                    isActive 
                                    ? 'bg-[#d8dfea] text-[#3b5998] font-bold' 
                                    : 'text-[#333] hover:bg-[#eff0f5] font-medium'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-[#3b5998]' : 'text-gray-500'}`} /> 
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Feed Column */}
            <div className="flex-1 min-w-0 pb-20">
                {children}
            </div>

            {/* Right Sidebar (Ads/Suggestions) */}
            <div className="hidden lg:block w-[240px] shrink-0">
                <div className="mb-4">
                    <h4 className="text-[#999] text-[11px] font-bold uppercase mb-2">Sponsorlu</h4>
                    <div className="flex gap-2 mb-2">
                        <div className="w-16 h-10 bg-white border border-gray-300"></div>
                        <div className="flex-1">
                            <div className="font-bold text-[#3b5998] text-xs">Hotel Academy Pro</div>
                            <div className="text-[10px] text-gray-500">Kariyerini hızlandır.</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </main>

      {/* Drawers */}
      <AnimatePresence>
        {isSettingsOpen && (
            <SettingsDrawer onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Nav (Visible only on small screens) */}
      <div className="md:hidden fixed bottom-0 w-full z-50">
          <BottomNavigation />
      </div>
    </div>
  );
};
