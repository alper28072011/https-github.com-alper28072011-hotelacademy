
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Home, Globe, Building2, User, ChevronDown, 
    Search, LogOut, MapPin, Star, TrendingUp,
    ShieldCheck
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
    <div className="min-h-screen bg-[#eff0f2] font-sans text-[#333] overflow-y-scroll">
      
      {/* SWITCHING OVERLAY */}
      <AnimatePresence>
          {isSwitching && (
              <div className="fixed inset-0 z-[100] bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm">
                  <div className="text-primary font-bold animate-pulse">Hesap Değiştiriliyor...</div>
              </div>
          )}
      </AnimatePresence>

      {/* 1. BLUE HEADER BAR (Fixed) */}
      <div className="bg-[#3b5998] border-b border-[#29487d] h-[42px] fixed top-0 w-full z-50 shadow-sm flex justify-center">
          <div className="w-[980px] flex justify-between items-center px-0">
              
              {/* Left: Logo & Search */}
              <div className="flex items-center gap-2">
                  <div onClick={() => navigate('/')} className="cursor-pointer bg-[#3b5998] p-1">
                      <span className="text-white font-bold text-2xl tracking-tighter hover:opacity-80">facebook<span className="font-normal opacity-70 text-sm ml-0.5">pro</span></span>
                  </div>
                  
                  {/* Global Search */}
                  <div className="relative ml-2">
                      <input 
                          placeholder="Ara..." 
                          className="h-[26px] w-[300px] pl-2 pr-6 text-[11px] border border-[#20365F] rounded-sm focus:outline-none focus:bg-white"
                      />
                      <Search className="w-3 h-3 absolute right-2 top-2 text-gray-400" />
                  </div>
              </div>

              {/* Right: User Nav */}
              <div className="flex items-center gap-4 text-white text-[11px] font-bold">
                  <button onClick={() => navigate('/')} className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1">
                      <Home className="w-3 h-3" /> Ana Sayfa
                  </button>
                  <button onClick={() => navigate('/profile')} className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1">
                      <User className="w-3 h-3" /> Profil
                  </button>
                  <div className="h-4 w-px bg-[#29487d] mx-1" />
                  
                  {/* Context Menu */}
                  <div className="relative">
                      <button 
                        onClick={() => setIsContextOpen(!isContextOpen)}
                        className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1"
                      >
                          Hesap <ChevronDown className="w-3 h-3" />
                      </button>

                      {isContextOpen && (
                          <>
                            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsContextOpen(false)} />
                            <div className="absolute top-8 right-0 w-48 bg-white border border-[#899bc1] shadow-xl z-50 rounded-sm">
                                <div className="py-1">
                                    <div className="text-[10px] text-[#999] uppercase px-2 py-1 font-bold border-b border-[#eee]">Hesap Değiştir</div>
                                    {managedOrgs.map(org => (
                                        <button 
                                            key={org.id}
                                            onClick={() => handleContextSwitch(org)}
                                            className="w-full text-left px-2 py-1.5 hover:bg-[#3b5998] hover:text-white flex items-center gap-2 text-[11px] font-bold text-[#333]"
                                        >
                                            <div className="w-4 h-4 bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden">
                                                {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3 text-gray-400" />}
                                            </div>
                                            {org.name}
                                        </button>
                                    ))}
                                    <div className="border-t border-[#ccc] my-1"></div>
                                    <button onClick={() => { setIsContextOpen(false); logout(); }} className="w-full text-left px-2 py-1.5 hover:bg-[#3b5998] hover:text-white text-[11px] text-[#333] flex items-center gap-2">
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
      
      {/* 2. MAIN GRID CONTAINER (Fixed 980px, 3 Columns) */}
      <div className="w-[980px] mx-auto mt-[54px] grid grid-cols-[180px_530px_240px] gap-3 pb-20">
            
            {/* COL 1: LEFT SIDEBAR (Navigation) */}
            <div className="flex flex-col gap-4">
                {/* Profile Tiny Card */}
                <div className="flex items-center gap-2 mb-2 cursor-pointer group" onClick={() => navigate('/profile')}>
                    <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="md" className="rounded-sm border border-[#ccc]" />
                    <div className="leading-tight">
                        <div className="font-bold text-[#3b5998] text-[11px] group-hover:underline">{currentUser?.name}</div>
                        <div className="text-[10px] text-gray-500">Profili Düzenle</div>
                    </div>
                </div>

                {/* Main Menu */}
                <div className="space-y-0.5">
                    {menuItems.map(item => {
                        const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                        return (
                            <button 
                                key={item.label} 
                                onClick={() => navigate(item.path)} 
                                className={`w-full flex items-center gap-2 px-2 py-1.5 text-[11px] transition-colors rounded-sm ${
                                    isActive 
                                    ? 'bg-[#d8dfea] text-[#333] font-bold' 
                                    : 'text-[#333] hover:bg-[#eff0f5] hover:text-[#3b5998]'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-[#3b5998]' : 'text-gray-500'}`} /> 
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* Shortcuts / Groups (Static for now) */}
                <div className="mt-4">
                    <h4 className="text-[#999] text-[10px] font-bold uppercase mb-1 px-2">Kısayollar</h4>
                    <button className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[#eff0f5] text-[11px] text-[#333]">
                        <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                        Housekeeping 101
                    </button>
                    <button className="w-full flex items-center gap-2 px-2 py-1 hover:bg-[#eff0f5] text-[11px] text-[#333]">
                        <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                        Personel Duyuruları
                    </button>
                </div>
            </div>

            {/* COL 2: MAIN CONTENT (Feed / Page Content) */}
            <div className="min-w-0">
                {/* Every page content is wrapped here */}
                {children}
            </div>

            {/* COL 3: RIGHT SIDEBAR (Journey & Ads) */}
            <div className="flex flex-col gap-4">
                
                {/* CAREER JOURNEY WIDGET */}
                <div className="bg-white border border-[#bdc7d8]">
                    <div className="bg-[#f7f7f7] border-b border-[#e9e9e9] p-2">
                        <h3 className="text-[#3b5998] font-bold text-[11px] flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Kariyer Yolculuğum
                        </h3>
                    </div>
                    <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-[#333]">{currentUser?.creatorLevel}</span>
                            <span className="text-[10px] text-gray-500">{currentXp} / {nextLevelXp} XP</span>
                        </div>
                        {/* XP Bar */}
                        <div className="w-full h-3 bg-[#e9e9e9] border border-[#ccc] rounded-sm overflow-hidden mb-2">
                            <div className="h-full bg-[#6d84b4]" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        
                        <div className="flex items-start gap-2 mt-3 pt-3 border-t border-[#eee]">
                            <div className="w-8 h-8 bg-[#fff9d7] border border-[#e2c822] flex items-center justify-center text-yellow-600">
                                <Star className="w-4 h-4 fill-current" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Sıradaki Hedef</div>
                                <div className="text-[11px] font-bold text-[#3b5998] leading-tight">
                                    {currentUser?.roleTitle || 'Personel'} &rarr; {currentUser?.targetCareerPathId ? 'Uzman' : 'Belirlenmedi'}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => navigate('/journey')}
                            className="w-full mt-3 bg-[#f5f6f7] border border-[#d8dfea] text-[#333] text-[11px] font-bold py-1 hover:bg-[#ebedef]"
                        >
                            Haritayı Görüntüle
                        </button>
                    </div>
                </div>

                {/* SUGGESTIONS / ADS */}
                <div className="bg-white border border-[#bdc7d8] p-3">
                    <h4 className="text-[#999] text-[10px] font-bold uppercase mb-2">Sponsorlu</h4>
                    <div className="flex gap-2 mb-2 group cursor-pointer">
                        <div className="w-16 h-10 bg-gray-100 border border-gray-300 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-[#3b5998] text-[11px] group-hover:underline">Otel Ekipmanları</div>
                            <div className="text-[10px] text-gray-500 leading-tight">Profesyonel mutfak gereçlerinde %20 indirim.</div>
                        </div>
                    </div>
                </div>

                <div className="text-[10px] text-gray-400 px-1">
                    Hotel Academy © 2008 <span className="mx-1">·</span> Türkçe <span className="mx-1">·</span> Gizlilik
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
