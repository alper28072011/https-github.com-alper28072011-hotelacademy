
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Home, Globe, Building2, User, ChevronDown, 
    Search, LogOut, MapPin, Star, TrendingUp,
    ShieldCheck, Bell
} from 'lucide-react';
import { SettingsDrawer } from '../../features/profile/components/SettingsDrawer';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { getUserManagedPages } from '../../services/organizationService';
import { Organization } from '../../types';
import { getLocalizedContent } from '../../i18n/config';

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
          // Navigate to explore with query, passing state to force refresh/filter
          navigate('/explore', { state: { query: globalSearchTerm } });
      }
  };

  const menuItems = [
      { label: 'Haber Kaynağı', icon: Home, path: '/' },
      { label: 'Keşfet', icon: Globe, path: '/explore' },
      { label: 'Gruplar', icon: Building2, path: '/lobby' },
  ];

  // Calculate XP Progress
  const nextLevelXp = 1000; // Mock threshold
  const currentXp = currentUser?.xp || 0;
  const progressPercent = Math.min((currentXp / nextLevelXp) * 100, 100);

  return (
    <div className="min-h-screen bg-[#eff0f2] font-sans text-[#1c1e21] overflow-y-scroll">
      
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

      {/* 1. GLOBAL HEADER BAR (Fixed & Centered Search) */}
      <div className="bg-[#3b5998] border-b border-[#29487d] h-[50px] fixed top-0 w-full z-50 shadow-md flex justify-center">
          <div className="w-[980px] flex justify-between items-center px-2 md:px-0 h-full">
              
              {/* Left: Logo */}
              <div className="flex items-center gap-4 shrink-0 w-[200px]">
                  <div onClick={() => navigate('/')} className="cursor-pointer flex items-center gap-1 group">
                      <span className="text-white font-bold text-2xl tracking-tighter group-hover:opacity-90 transition-opacity">Corbit</span>
                  </div>
              </div>
              
              {/* Center: Global Search */}
              <div className="flex-1 max-w-xl mx-4 relative h-full flex items-center">
                  <form onSubmit={handleSearchSubmit} className="w-full relative">
                      <input 
                          value={globalSearchTerm}
                          onChange={(e) => setGlobalSearchTerm(e.target.value)}
                          placeholder="Eğitim, kişi veya grup ara..." 
                          className="w-full h-[30px] pl-8 pr-4 text-[13px] border-none rounded-full bg-[#2a4478] text-white placeholder-blue-200 focus:bg-white focus:text-[#1c1e21] focus:placeholder-gray-400 transition-all outline-none shadow-inner"
                      />
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-blue-200 pointer-events-none" />
                  </form>
              </div>

              {/* Right: User Nav */}
              <div className="flex items-center justify-end gap-2 w-[200px] text-white text-[12px] font-bold shrink-0">
                  <div 
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 cursor-pointer hover:bg-black/10 px-2 py-1 rounded-full transition-colors"
                  >
                      <div className="w-6 h-6 rounded-full bg-gray-300 overflow-hidden border border-white/20">
                          <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="sm" className="w-full h-full" />
                      </div>
                      <span className="hidden md:inline">{currentUser?.name?.split(' ')[0]}</span>
                  </div>
                  
                  <div className="h-4 w-px bg-[#29487d] mx-1" />
                  
                  {/* Context Menu */}
                  <div className="relative">
                      <button 
                        onClick={() => setIsContextOpen(!isContextOpen)}
                        className="p-1 hover:bg-black/10 rounded-full transition-colors"
                      >
                          <ChevronDown className="w-4 h-4" />
                      </button>

                      {isContextOpen && (
                          <>
                            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsContextOpen(false)} />
                            <div className="absolute top-10 right-0 w-60 bg-white border border-[#ddd] shadow-xl z-50 rounded-lg overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                                <div className="py-2">
                                    <div className="px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase">Hesaplar</div>
                                    {managedOrgs.map(org => (
                                        <button 
                                            key={org.id}
                                            onClick={() => handleContextSwitch(org)}
                                            className="w-full text-left px-3 py-2 hover:bg-[#3b5998] hover:text-white flex items-center gap-3 text-[13px] font-medium text-[#1c1e21] transition-colors"
                                        >
                                            <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-gray-300">
                                                {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3 text-gray-500" />}
                                            </div>
                                            <span className="truncate">{org.name}</span>
                                        </button>
                                    ))}
                                    <div className="border-t border-[#eee] my-1"></div>
                                    <button onClick={() => { setIsContextOpen(false); navigate('/profile'); }} className="w-full text-left px-3 py-2 hover:bg-[#eff0f5] text-[13px] text-[#1c1e21] flex items-center gap-2">
                                        Ayarlar
                                    </button>
                                    <button onClick={() => { setIsContextOpen(false); logout(); }} className="w-full text-left px-3 py-2 hover:bg-[#eff0f5] text-[13px] text-[#1c1e21] flex items-center gap-2">
                                        <LogOut className="w-4 h-4" /> Çıkış Yap
                                    </button>
                                </div>
                            </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      </div>
      
      {/* 2. MAIN GRID CONTAINER (Fixed 980px, 3 Columns) */}
      <div className="w-[980px] mx-auto mt-[65px] grid grid-cols-[180px_530px_240px] gap-3 pb-20">
            
            {/* COL 1: LEFT SIDEBAR (Navigation) */}
            <div className="flex flex-col gap-2 sticky top-[65px] h-fit">
                {/* Main Menu */}
                <div className="space-y-1">
                    {menuItems.map(item => {
                        const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                        return (
                            <button 
                                key={item.label} 
                                onClick={() => navigate(item.path)} 
                                className={`w-full flex items-center gap-3 px-2 py-2 text-[13px] transition-all rounded-md ${
                                    isActive 
                                    ? 'bg-[#e4e6eb] font-bold text-[#1c1e21]' 
                                    : 'text-[#606770] hover:bg-[#e4e6eb] hover:text-[#1c1e21] font-medium'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-[#3b5998]' : 'text-gray-500'}`} /> 
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                <div className="border-t border-[#ddd] my-2 mx-2"></div>

                {/* Shortcuts */}
                <div>
                    <h4 className="text-[#65676b] text-[11px] font-bold uppercase mb-2 px-2 tracking-wider">Kısayollar</h4>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#e4e6eb] rounded-md text-[13px] text-[#333] transition-colors">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-md flex items-center justify-center text-white text-[10px] font-bold">HK</div>
                        <span className="truncate">Housekeeping 101</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#e4e6eb] rounded-md text-[13px] text-[#333] transition-colors">
                        <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-red-500 rounded-md flex items-center justify-center text-white text-[10px] font-bold">PD</div>
                        <span className="truncate">Personel Duyuruları</span>
                    </button>
                </div>
            </div>

            {/* COL 2: MAIN CONTENT (Feed / Page Content) */}
            <div className="min-w-0">
                {/* Smooth Transition Wrapper */}
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {children}
                </motion.div>
            </div>

            {/* COL 3: RIGHT SIDEBAR (Journey & Ads) */}
            <div className="flex flex-col gap-4 sticky top-[65px] h-fit">
                
                {/* CAREER JOURNEY WIDGET */}
                <div className="bg-white border border-[#ddd] rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-[#3b5998] to-[#4e69a2] p-3">
                        <h3 className="text-white font-bold text-[12px] flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" /> Kariyer Yolculuğum
                        </h3>
                    </div>
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-[#333]">{currentUser?.creatorLevel}</span>
                            <span className="text-[11px] text-gray-500 font-mono">{currentXp} / {nextLevelXp} XP</span>
                        </div>
                        {/* XP Bar */}
                        <div className="w-full h-2 bg-[#f0f2f5] rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-gradient-to-r from-green-400 to-green-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-yellow-50 border border-yellow-200 rounded-full flex items-center justify-center text-yellow-600 shadow-sm">
                                <Star className="w-4 h-4 fill-current" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Sıradaki Hedef</div>
                                <div className="text-[12px] font-bold text-[#1c1e21] leading-tight">
                                    {currentUser?.roleTitle || 'Personel'} &rarr; {currentUser?.targetCareerPathId ? 'Uzman' : 'Belirlenmedi'}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => navigate('/journey')}
                            className="w-full mt-4 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#1c1e21] text-[12px] font-bold py-2 rounded-md transition-colors"
                        >
                            Haritayı Görüntüle
                        </button>
                    </div>
                </div>

                {/* SUGGESTIONS / ADS */}
                <div className="bg-white border border-[#ddd] rounded-lg shadow-sm p-3">
                    <h4 className="text-[#65676b] text-[11px] font-bold uppercase mb-3">Sponsorlu</h4>
                    <div className="flex gap-3 mb-2 group cursor-pointer">
                        <div className="w-20 h-14 bg-gray-100 rounded-md overflow-hidden shrink-0">
                            <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-[#1c1e21] text-[12px] leading-tight mb-1 group-hover:text-[#3b5998]">Otel Ekipmanları</div>
                            <div className="text-[11px] text-gray-500 leading-snug">Profesyonel mutfak gereçlerinde %20 indirim.</div>
                        </div>
                    </div>
                </div>

                <div className="text-[11px] text-gray-400 px-1 text-center">
                    Corbit © 2025 <span className="mx-1">·</span> Gizlilik <span className="mx-1">·</span> Şartlar
                </div>

            </div>

      </div>

      {/* Drawers */}
      <AnimatePresence>
        {isSettingsOpen && (
            <SettingsDrawer onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
