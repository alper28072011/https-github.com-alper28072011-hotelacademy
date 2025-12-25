
import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
    Inbox, Settings, Loader2, Network, Lock, Menu, BookOpen, LogOut, Search, Bell, ChevronDown, LayoutDashboard
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContextStore } from '../../stores/useContextStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { usePermission } from '../../hooks/usePermission';
import { getJoinRequests } from '../../services/db';
import { Avatar } from '../../components/ui/Avatar';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthStore();
  
  // Stores
  const { contextType, activeEntityId } = useContextStore();
  const { currentOrganization, startOrganizationSession, endOrganizationSession } = useOrganizationStore();
  const { can } = usePermission();
  
  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // --- CORE LOGIC: READY CHECK ---
  // We check if the data currently in the store matches the URL/Context expectation.
  const isDataReady = useMemo(() => {
      return currentOrganization && currentOrganization.id === activeEntityId;
  }, [currentOrganization, activeEntityId]);

  // --- SELF-HEALING EFFECT ---
  // If we are on the admin page, but data is missing (White Screen Cause), fetch it immediately.
  useEffect(() => {
      const stabilizeSession = async () => {
          // 1. Safety: If context is wrong, leave.
          if (contextType !== 'ORGANIZATION' || !activeEntityId) {
              console.warn("AdminLayout: Invalid Context. Redirecting...");
              navigate('/');
              return;
          }

          // 2. Optimization: If data is already there, do nothing.
          if (isDataReady) return;

          // 3. Action: Data is missing (F5 refresh or fast switch). Fetch it.
          console.log(`AdminLayout: Hydrating session for ${activeEntityId}...`);
          const result = await startOrganizationSession(activeEntityId);
          
          if (!result.success) {
              console.error("AdminLayout: Hydration failed. Kicking user out.");
              await endOrganizationSession();
              navigate('/');
          }
      };

      stabilizeSession();
  }, [activeEntityId, contextType, isDataReady]);

  // --- BADGE FETCHING ---
  useEffect(() => {
      if (isDataReady && currentOrganization && can('canApproveRequests')) {
          getJoinRequests(currentOrganization.id).then(reqs => setPendingCount(reqs.length)).catch(() => {});
      }
  }, [isDataReady, currentOrganization]);

  const handleExit = async () => {
      await endOrganizationSession();
      navigate('/');
  };

  // --- RENDER 1: LOADING STATE (PREVENT WHITE SCREEN) ---
  // If data is not ready, we render a FULL SCREEN LOADER instead of null.
  // This ensures React has something to paint while waiting for Zustand.
  if (!isDataReady || !currentOrganization) {
      return (
          <div className="flex h-screen w-full bg-[#eff0f5] items-center justify-center fixed inset-0 z-[9999]">
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4">
                      <Loader2 className="w-8 h-8 text-[#3b5998] animate-spin" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-700">Yönetim Paneli</h2>
                  <p className="text-xs text-slate-400 font-medium mt-1">Veriler hazırlanıyor...</p>
              </div>
          </div>
      );
  }

  // --- RENDER 2: MAIN LAYOUT ---
  // At this point, "currentOrganization" is guaranteed to exist.
  
  const navItems = [
    { path: '/admin/organization', icon: LayoutDashboard, label: 'Genel Bakış', show: true }, 
    { path: '/admin/requests', icon: Inbox, label: 'İstekler', show: can('canApproveRequests'), badge: pendingCount }, 
    { path: '/admin/organization/structure', icon: Network, label: 'Organizasyon', show: can('manageStructure') }, 
    { path: '/admin/career', icon: Map, label: 'Kariyer Yolu', show: can('manageStructure') },
    { path: '/admin/courses', icon: BookOpen, label: 'Eğitimler', show: can('canCreateContent') },
    { path: '/admin/reports', icon: Settings, label: 'Raporlar', show: can('viewAnalytics') },
    { path: '/admin/settings', icon: Settings, label: 'Ayarlar', show: can('adminAccess') },
  ];

  return (
    <div className="flex h-screen w-full bg-[#eff0f5] text-slate-900 overflow-hidden font-sans">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-[#3b5998] p-3 flex justify-between items-center fixed top-0 left-0 right-0 z-50 shadow-md h-14">
          <span className="text-white font-bold text-sm ml-2 truncate">{currentOrganization.name}</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-1">
              <Menu className="w-6 h-6" />
          </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#d8dfea] transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 overflow-y-auto flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          mt-14 md:mt-0 shadow-xl md:shadow-none
      `}>
          <div className="p-4 flex flex-col gap-6 flex-1">
              {/* Identity Card */}
              <div className="bg-[#f7f7f7] border border-[#e9e9e9] p-4 rounded-xl shadow-sm flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white rounded-lg mb-3 overflow-hidden border border-[#d8dfea] shadow-sm relative group">
                      {currentOrganization.logoUrl ? (
                          <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-gray-300 text-2xl">
                              {currentOrganization.name[0]}
                          </div>
                      )}
                  </div>
                  <h2 className="font-bold text-sm text-slate-900 leading-tight line-clamp-2">{currentOrganization.name}</h2>
                  <span className="text-[10px] text-[#3b5998] font-bold mt-1 uppercase bg-[#3b5998]/5 px-2 py-0.5 rounded border border-[#3b5998]/10">
                      Yönetim Paneli
                  </span>
              </div>

              {/* Navigation */}
              <nav className="flex flex-col gap-1">
                  <div className="px-4 py-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Araçlar</div>
                  {navItems.filter(i => i.show).map((item) => {
                      // Fix active state logic for sub-routes
                      const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                      
                      return (
                          <NavLink
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`
                                  flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold transition-all rounded-lg relative group
                                  ${isActive 
                                      ? 'bg-[#eff0f5] text-[#3b5998] border border-[#d8dfea] shadow-sm' 
                                      : 'text-slate-500 hover:bg-gray-50 hover:text-[#3b5998]'
                                  }
                              `}
                          >
                              <item.icon className={`w-4 h-4 ${isActive ? 'text-[#3b5998]' : 'text-gray-400 group-hover:text-[#3b5998]'}`} />
                              <span>{item.label}</span>
                              {item.badge && item.badge > 0 ? (
                                  <span className="ml-auto bg-[#dd3c10] text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm min-w-[20px] text-center leading-none">
                                      {item.badge}
                                  </span>
                              ) : null}
                          </NavLink>
                      );
                  })}
              </nav>
          </div>

          {/* Exit Button */}
          <div className="p-4 border-t border-[#d8dfea] bg-[#f7f7f7]">
              <button 
                  onClick={handleExit}
                  className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-[#3b5998] hover:bg-white text-[11px] font-bold py-2.5 rounded-lg border border-transparent hover:border-[#d8dfea] hover:shadow-sm transition-all"
              >
                  <LogOut className="w-3.5 h-3.5" /> Bireysel Hesaba Dön
              </button>
          </div>
      </aside>

      {/* RIGHT COLUMN */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
          
          {/* DESKTOP HEADER */}
          <header className="hidden md:flex h-16 bg-white border-b border-[#d8dfea] px-6 justify-between items-center z-20 shadow-sm shrink-0">
              {/* Search Bar */}
              <div className="flex items-center bg-[#f0f2f5] rounded-full px-4 py-2 w-96 border border-transparent focus-within:border-[#3b5998] focus-within:bg-white transition-all">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input 
                    placeholder="Panel içinde ara..." 
                    className="bg-transparent border-none outline-none text-xs font-medium ml-2 w-full placeholder-gray-400"
                  />
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-4">
                  <button className="relative p-2 text-gray-400 hover:text-[#3b5998] hover:bg-gray-50 rounded-full transition-colors">
                      <Bell className="w-5 h-5" />
                  </button>
                  <div className="h-8 w-px bg-gray-200 mx-2" />
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-gray-200">
                      <div className="w-8 h-8 rounded-full bg-gray-200">
                          <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="sm" />
                      </div>
                      <div className="flex flex-col items-start">
                          <span className="text-xs font-bold text-gray-700 leading-none">{currentUser?.name}</span>
                          <span className="text-[10px] text-gray-400 leading-none mt-1">Yönetici</span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                  </div>
              </div>
          </header>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 overflow-y-auto relative bg-[#eff0f5] p-2 md:p-6 pb-20 scroll-smooth pt-16 md:pt-6">
              <Outlet />
          </main>
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
};
