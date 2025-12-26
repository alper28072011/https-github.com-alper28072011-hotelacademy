
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Home, Globe, Building2, User, ChevronDown, 
    Search, LogOut, MapPin, Star, TrendingUp,
    ShieldCheck, Bell, Menu
} from 'lucide-react';
import { SettingsDrawer } from '../../features/profile/components/SettingsDrawer';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { getUserManagedPages } from '../../services/organizationService';
import { Organization } from '../../types';
import { getLocalizedContent } from '../../i18n/config';
import { BottomNavigation } from './BottomNavigation';

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
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

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
      const result = await startOrganizationSession(target.id);
      if (result.success) {
          navigate('/admin'); 
      }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (globalSearchTerm.trim()) {
          navigate('/explore', { state: { query: globalSearchTerm } });
      }
  };

  const menuItems = [
      { label: 'Haber Kaynağı', icon: Home, path: '/' },
      { label: 'Keşfet', icon: Globe, path: '/explore' },
      { label: 'Gruplar', icon: Building2, path: '/lobby' },
  ];

  const nextLevelXp = 1000;
  const currentXp = currentUser?.xp || 0;
  const progressPercent = Math.min((currentXp / nextLevelXp) * 100, 100);

  return (
    <div className="min-h-screen bg-[#eff0f2] font-sans text-[#1c1e21] pb-16 md:pb-0">
      
      {/* SWITCHING OVERLAY */}
      <AnimatePresence>
          {isSwitching && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white/90 flex flex-col items-center justify-center backdrop-blur-sm"
              >
                  <div className="text-primary font-bold animate-pulse text-lg">Hesap Değiştiriliyor...</div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* 1. GLOBAL HEADER BAR */}
      <div className="bg-[#3b5998] border-b border-[#29487d] h-[48px] sticky top-0 w-full z-50 shadow-sm flex justify-center px-2 md:px-0">
          <div className="w-full max-w-[980px] grid grid-cols-[auto_1fr_auto] md:grid-cols-[180px_1fr_240px] gap-3 h-full items-center">
              
              {/* Left: Logo */}
              <div className="flex items-center h-full">
                  <div onClick={() => navigate('/')} className="cursor-pointer flex items-center gap-1 group">
                      <span className="text-white font-bold text-2xl md:text-3xl tracking-tighter pb-1">Corbit</span>
                  </div>
              </div>
              
              {/* Center: Global Search */}
              <div className="flex items-center justify-center h-full w-full px-2 md:px-0">
                  <form onSubmit={handleSearchSubmit} className="w-full max-w-[500px] relative flex items-center m-0 p-0">
                      <input 
                          value={globalSearchTerm}
                          onChange={(e) => setGlobalSearchTerm(e.target.value)}
                          placeholder="Ara..." 
                          className="w-full h-[30px] pl-8 pr-4 text-[13px] border border-[#233a66] rounded-[2px] bg-[#223966] text-white placeholder-blue-300 focus:bg-white focus:text-[#1c1e21] focus:placeholder-gray-400 transition-all outline-none shadow-inner font-medium block leading-normal"
                      />
                      <Search 
                        className="w-3.5 h-3.5 absolute left-2.5 text-blue-300 pointer-events-none" 
                        style={{ top: '50%', transform: 'translateY(-50%)' }} 
                      />
                  </form>
              </div>

              {/* Right: User Nav */}
              <div className="flex items-center justify-end gap-2 md:gap-3 h-full">
                  <div 
                    onClick={() => navigate('/profile')}
                    className="hidden md:flex items-center gap-2 cursor-pointer hover:bg-[#00000010] px-2 py-1 rounded-[2px] transition-colors"
                  >
                      <div className="w-6 h-6 rounded-[2px] bg-gray-300 overflow-hidden border border-[#29487d]">
                          <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="sm" className="w-full h-full rounded-none" />
                      </div>
                      <span className="text-white text-[11px] font-bold">{currentUser?.name?.split(' ')[0]}</span>
                  </div>
                  
                  {/* Context Menu Trigger */}
                  <div className="relative">
                      <button 
                        onClick={() => setIsContextOpen(!isContextOpen)}
                        className="text-white p-1 hover:bg-black/10 rounded"
                      >
                          <ChevronDown className="w-5 h-5 md:w-3 md:h-3" />
                      </button>

                      {isContextOpen && (
                          <>
                            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsContextOpen(false)} />
                            <div className="absolute top-8 right-0 w-60 bg-white border border-[#899bc1] shadow-xl z-50 rounded-sm overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                                <div className="py-1">
                                    <div className="px-2 py-1 text-[9px] font-bold text-[#999] uppercase border-b border-[#eee]">Hesaplar</div>
                                    {managedOrgs.map(org => (
                                        <button 
                                            key={org.id}
                                            onClick={() => handleContextSwitch(org)}
                                            className="w-full text-left px-2 py-2 hover:bg-[#3b5998] hover:text-white flex items-center gap-2 text-[11px] font-bold text-[#333] transition-colors"
                                        >
                                            <div className="w-4 h-4 bg-gray-200 flex items-center justify-center overflow-hidden shrink-0 border border-gray-300">
                                                {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3 text-gray-500" />}
                                            </div>
                                            <span className="truncate">{org.name}</span>
                                        </button>
                                    ))}
                                    <div className="border-t border-[#ccc] my-1"></div>
                                    <button onClick={() => { setIsContextOpen(false); navigate('/profile'); }} className="w-full text-left px-2 py-2 hover:bg-[#3b5998] hover:text-white text-[11px] font-bold text-[#333] flex items-center gap-2">
                                        Ayarlar
                                    </button>
                                    <button onClick={() => { setIsContextOpen(false); logout(); }} className="w-full text-left px-2 py-2 hover:bg-[#3b5998] hover:text-white text-[11px] font-bold text-[#333] flex items-center gap-2">
                                        <LogOut className="w-3 h-3" /> Çıkış Yap
                                    </button>
                                </div>
                            </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      </div>
      
      {/* 2. MAIN GRID CONTAINER */}
      <div className="w-full max-w-[980px] mx-auto mt-3 grid grid-cols-1 md:grid-cols-[180px_1fr_240px] gap-3 px-2 md:px-0">
            
            {/* COL 1: LEFT SIDEBAR (Hidden on Mobile) */}
            <div className="hidden md:flex flex-col gap-2 sticky top-[60px] h-fit">
                <div className="space-y-0.5">
                    {menuItems.map(item => {
                        const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                        return (
                            <button 
                                key={item.label} 
                                onClick={() => navigate(item.path)} 
                                className={`w-full flex items-center gap-2 px-2 py-1.5 text-[11px] transition-all rounded-[2px] ${
                                    isActive 
                                    ? 'bg-[#d8dfea] font-bold text-[#1c1e21]' 
                                    : 'text-[#333] hover:bg-[#eff0f5] font-medium'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-[#333]' : 'text-gray-500'}`} /> 
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                <div className="border-t border-[#d8dfea] my-2 mx-2"></div>

                <div>
                    <h4 className="text-[#999] text-[10px] font-bold uppercase mb-1 px-2">Kısayollar</h4>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#eff0f5] rounded-[2px] text-[11px] text-[#333] transition-colors">
                        <div className="w-4 h-4 bg-blue-500 rounded-[2px] flex items-center justify-center text-white text-[8px] font-bold">HK</div>
                        <span className="truncate">Housekeeping 101</span>
                    </button>
                </div>
            </div>

            {/* COL 2: MAIN CONTENT */}
            <div className="min-w-0 pb-20 md:pb-0">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {children}
                </motion.div>
            </div>

            {/* COL 3: RIGHT SIDEBAR (Hidden on Mobile) */}
            <div className="hidden md:flex flex-col gap-3 sticky top-[60px] h-fit">
                
                {/* CAREER JOURNEY */}
                <div className="bg-white border border-[#d8dfea] rounded-md shadow-sm overflow-hidden">
                    <div className="bg-[#f7f7f7] border-b border-[#e9e9e9] p-2">
                        <h3 className="text-[#333] font-bold text-[11px] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-500" /> Kariyer Yolculuğum
                        </h3>
                    </div>
                    <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-[#333]">{currentUser?.creatorLevel}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{currentXp} / {nextLevelXp} XP</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#f0f2f5] rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-[#69a74e]" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-current mt-0.5" />
                            <div className="flex-1">
                                <div className="text-[9px] text-gray-400 font-bold uppercase">Sıradaki Hedef</div>
                                <div className="text-[11px] font-bold text-[#333] leading-tight">
                                    {currentUser?.roleTitle || 'Personel'} &rarr; {currentUser?.targetCareerPathId ? 'Uzman' : 'Belirlenmedi'}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => navigate('/journey')}
                            className="w-full mt-3 bg-[#f5f6f7] border border-[#d8dfea] hover:bg-[#e9e9e9] text-[#333] text-[10px] font-bold py-1.5 rounded-[2px] transition-colors"
                        >
                            Haritayı Görüntüle
                        </button>
                    </div>
                </div>

                <div className="text-[10px] text-gray-400 px-1 text-center">
                    Corbit © 2025 <span className="mx-1">·</span> Gizlilik
                </div>
            </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden">
          <BottomNavigation />
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
            <SettingsDrawer onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
