
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
    Users, ArrowLeft, Map, BarChart2, Inbox, 
    Settings, Loader2, Network, Lock, Menu, BookOpen
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { usePermission } from '../../hooks/usePermission';
import { getJoinRequests } from '../../services/db';

export const AdminLayout: React.FC = () => {
  const { logout, currentUser } = useAuthStore();
  const { currentOrganization, isLoading } = useOrganizationStore();
  const navigate = useNavigate();
  const { can } = usePermission();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false); // State for smooth image loading

  // Fetch pending requests count for the badge
  useEffect(() => {
      const fetchCount = async () => {
          if (currentOrganization && can('canApproveRequests')) {
              // We fetch requests without department filter to show total relevant to admin view
              // If user is department-limited, getJoinRequests handles logic if extended, 
              // but here we grab raw pending for the org to show scope.
              const reqs = await getJoinRequests(currentOrganization.id);
              setPendingCount(reqs.length);
          }
      };
      
      fetchCount();
      
      // Optional: Set up a polling interval to keep it "live" without websockets for now
      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
  }, [currentOrganization, currentUser]);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#eff0f5]"><Loader2 className="w-6 h-6 animate-spin text-[#3b5998]" /></div>;
  if (!currentOrganization) return <div className="h-screen flex items-center justify-center bg-[#eff0f5]">Veri yok.</div>;

  if (!can('adminAccess')) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-[#eff0f5]">
              <div className="bg-white p-4 border border-[#d8dfea] mb-4"><Lock className="w-10 h-10 text-red-700" /></div>
              <h2 className="text-lg font-bold text-[#333]">Erişim Reddedildi</h2>
              <button onClick={() => navigate('/')} className="mt-4 text-[#3b5998] font-bold hover:underline text-sm">Geri Dön</button>
          </div>
      );
  }

  const navItems = [
    { 
        path: '/admin/requests', 
        icon: Inbox, 
        label: 'İstekler', 
        show: can('canApproveRequests'),
        badge: pendingCount // Inject the dynamic count
    }, 
    { path: '/admin/organization', icon: Network, label: 'Organizasyon', show: can('manageStructure') || can('manageStaff') }, 
    { path: '/admin/career', icon: Map, label: 'Kariyer Yolu', show: can('manageStructure') },
    { path: '/admin/courses', icon: BookOpen, label: 'Kurslar', show: can('canCreateContent') },
    { path: '/admin/reports', icon: BarChart2, label: 'İstatistikler', show: can('viewAnalytics') },
    { path: '/admin/settings', icon: Settings, label: 'Ayarlar', show: can('adminAccess') },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#eff0f5] font-sans text-[#333]">
      
      {/* 1. THE CLASSIC BLUE HEADER */}
      <header className="bg-[#3b5998] h-[42px] flex items-center justify-between px-4 fixed top-0 w-full z-50 shadow-sm border-b border-[#29487d]">
          <div className="flex items-center gap-4">
              {/* Logo Area */}
              <div className="flex items-center gap-2">
                  <div className="bg-white text-[#3b5998] font-bold px-1.5 py-0.5 text-lg leading-none rounded-sm">H</div>
                  <span className="text-white font-bold text-lg tracking-tight hidden md:block">Admin</span>
              </div>
              
              {/* Mobile Menu Toggle */}
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-white/80 hover:text-white">
                  <Menu className="w-5 h-5" />
              </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-white">
              <button onClick={() => navigate('/')} className="hover:bg-[#4b67a1] px-2 py-1 rounded transition-colors flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Uygulamaya Dön
              </button>
              <div className="w-px h-4 bg-[#5c79b0] mx-1 hidden md:block"></div>
              <button onClick={logout} className="hover:bg-[#4b67a1] px-2 py-1 rounded transition-colors">Çıkış</button>
          </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <div className="flex flex-col md:flex-row max-w-[980px] mx-auto w-full mt-[54px] px-2 gap-3">
        
        {/* LEFT SIDEBAR (Profile / Menu) */}
        <aside className={`w-full md:w-[180px] shrink-0 flex-col gap-4 ${isMobileMenuOpen ? 'flex' : 'hidden md:flex'}`}>
            
            {/* Profile Box - Fixed Aspect Ratio & Smooth Load */}
            <div className="relative group">
                <div className="border border-[#d8dfea] bg-white p-1 relative aspect-square overflow-hidden">
                    
                    {/* Placeholder / Skeleton Layer */}
                    <div className={`absolute inset-1 flex items-center justify-center transition-opacity duration-700 bg-[#f7f7f7] ${isLogoLoaded && currentOrganization.logoUrl ? 'opacity-0' : 'opacity-100'}`}>
                        {currentOrganization.logoUrl ? (
                            // Show pulsing skeleton if there is a URL but not loaded yet
                            <div className="w-full h-full bg-[#f0f2f5] animate-pulse" />
                        ) : (
                            // Show initial if no URL exists
                            <span className="text-[#d8dfea] font-bold text-4xl select-none">
                                {currentOrganization.name[0]}
                            </span>
                        )}
                    </div>

                    {/* Image Layer */}
                    {currentOrganization.logoUrl && (
                        <img 
                            src={currentOrganization.logoUrl} 
                            className={`w-full h-full object-cover transition-opacity duration-700 ease-in-out ${isLogoLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setIsLogoLoaded(true)}
                            alt="Logo"
                        />
                    )}
                </div>
                <div className="mt-2">
                    <h2 className="text-[#3b5998] font-bold text-sm hover:underline cursor-pointer">{currentOrganization.name}</h2>
                    <p className="text-[10px] text-gray-500">Yönetim Paneli</p>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1">
                {navItems.filter(i => i.show).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => 
                            `flex items-center gap-2 px-2 py-1.5 text-[11px] font-bold transition-colors border group ${
                                isActive 
                                ? 'bg-[#d8dfea] text-[#333] border-[#d8dfea]' 
                                : 'text-[#3b5998] border-transparent hover:bg-[#eff0f5]'
                            }`
                        }
                    >
                        <item.icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                        
                        {/* THE CLASSIC NOTIFICATION BADGE */}
                        {item.badge && item.badge > 0 ? (
                            <span className="ml-auto bg-[#dd3c10] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm leading-none border border-[#b0300d]">
                                {item.badge}
                            </span>
                        ) : null}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-[#d8dfea] pt-2 mt-2">
                <div className="text-[10px] text-gray-400">
                    Hotel Academy © 2006<br/>
                    Turkish, English
                </div>
            </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0">
            <Outlet />
        </main>

      </div>
    </div>
  );
};
