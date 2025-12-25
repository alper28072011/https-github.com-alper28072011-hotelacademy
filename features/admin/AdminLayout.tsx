
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
    Users, Map, BarChart2, Inbox, 
    Settings, Loader2, Network, Lock, Menu, BookOpen, LogOut, CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContextStore } from '../../stores/useContextStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { usePermission } from '../../hooks/usePermission';
import { getJoinRequests } from '../../services/db';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { contextType, activeEntityId } = useContextStore();
  const { currentOrganization, switchOrganization, switchToPersonal } = useOrganizationStore();
  const { can } = usePermission();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // --- INTELLIGENT INITIALIZATION ---
  // If we already have the correct organization data in the store (client-side transition),
  // start with isLoading = false. Otherwise (F5 refresh), start with true.
  const [isLoading, setIsLoading] = useState(() => {
      if (contextType === 'ORGANIZATION' && currentOrganization?.id === activeEntityId) {
          return false; // Data matches, render immediately!
      }
      return true; // Data missing or mismatch, need to fetch.
  });

  // --- DATA SYNC & PROTECTION ---
  useEffect(() => {
      const syncAdminSession = async () => {
          // 1. Guard: Check if we should even be here
          if (contextType !== 'ORGANIZATION' || !activeEntityId) {
              console.warn("[AdminLayout] Invalid context. Redirecting...");
              navigate('/');
              return;
          }

          // 2. Data Check: Do we have the right data?
          if (currentOrganization && currentOrganization.id === activeEntityId) {
              // We are good. Just ensure loading is off.
              if (isLoading) setIsLoading(false);
              return;
          }

          // 3. Recovery: We are in Admin mode but data is missing (Refresh case)
          console.log("[AdminLayout] Data mismatch or missing. Recovering session...");
          setIsLoading(true);
          const success = await switchOrganization(activeEntityId);
          
          if (!success) {
              // Recovery failed (Lost permissions, deleted org, etc.)
              console.error("[AdminLayout] Recovery failed. Falling back to personal.");
              await switchToPersonal();
              navigate('/');
          } else {
              setIsLoading(false);
          }
      };

      syncAdminSession();
  }, [contextType, activeEntityId, currentOrganization, navigate, switchOrganization, switchToPersonal]);

  // --- BADGE COUNTER ---
  useEffect(() => {
      const fetchCount = async () => {
          if (!isLoading && currentOrganization && can('canApproveRequests')) {
              try {
                  const reqs = await getJoinRequests(currentOrganization.id);
                  setPendingCount(reqs.length);
              } catch (e) {
                  // Silent fail for badges
              }
          }
      };
      fetchCount();
  }, [isLoading, currentOrganization, can]);

  const handleSwitchToPersonal = async () => {
      await switchToPersonal();
      navigate('/');
  };

  // --- RENDER STATES ---

  // 1. Loading Spinner (Full Screen)
  if (isLoading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#eff0f2] text-slate-900 absolute inset-0 z-[9999]">
              <Loader2 className="w-10 h-10 text-[#3b5998] animate-spin mb-4" />
              <div className="flex flex-col items-center animate-pulse">
                  <span className="text-sm font-bold text-[#3b5998]">Yönetim Paneli Hazırlanıyor</span>
                  <span className="text-xs text-slate-500">Veriler senkronize ediliyor...</span>
              </div>
          </div>
      );
  }

  // 2. Safety Fallback (Should rarely happen due to useEffect guard)
  if (!currentOrganization) {
      return null; 
  }

  // 3. Permission Gate
  if (!can('adminAccess') && currentUser?.role !== 'super_admin') {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#eff0f2] absolute inset-0 z-[9999]">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-100 flex flex-col items-center max-w-sm text-center">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                      <Lock className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Erişim Yetkisi Yok</h2>
                  <p className="text-sm text-slate-500 mb-6">
                      <span className="font-bold">{currentOrganization.name}</span> yönetim paneline erişim izniniz bulunmuyor.
                  </p>
                  <button 
                    onClick={handleSwitchToPersonal} 
                    className="bg-[#3b5998] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#2d4373] transition-colors text-sm w-full flex items-center justify-center gap-2"
                  >
                      <LogOut className="w-4 h-4" /> Ana Sayfaya Dön
                  </button>
              </div>
          </div>
      );
  }

  const navItems = [
    { 
        path: '/admin/requests', 
        icon: Inbox, 
        label: 'İstekler', 
        show: can('canApproveRequests'),
        badge: pendingCount 
    }, 
    { path: '/admin/organization', icon: Network, label: 'Organizasyon', show: can('manageStructure') || can('manageStaff') }, 
    { path: '/admin/career', icon: Map, label: 'Kariyer Yolu', show: can('manageStructure') },
    { path: '/admin/courses', icon: BookOpen, label: 'Kurslar', show: can('canCreateContent') },
    { path: '/admin/reports', icon: BarChart2, label: 'İstatistikler', show: can('viewAnalytics') },
    { path: '/admin/settings', icon: Settings, label: 'Ayarlar', show: can('adminAccess') },
  ];

  return (
    <div className="flex h-screen w-full bg-[#eff0f5] text-slate-900 admin-panel overflow-hidden absolute inset-0 z-50 isolation-isolate">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-[#3b5998] p-3 flex justify-between items-center fixed top-0 left-0 right-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-white text-xs font-bold">
                  {currentOrganization.name[0]}
              </div>
              <span className="text-white font-bold text-sm truncate max-w-[200px]">{currentOrganization.name}</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-1 rounded hover:bg-white/10">
              <Menu className="w-6 h-6" />
          </button>
      </div>

      {/* LEFT SIDEBAR */}
      <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#d8dfea] transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 overflow-y-auto flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
          <div className="p-4 flex flex-col gap-6 flex-1 mt-12 md:mt-0">
              {/* Identity Card */}
              <div className="bg-[#f7f7f7] border border-[#e9e9e9] p-4 rounded-xl shadow-sm flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white rounded-lg mb-3 overflow-hidden border border-[#d8dfea] shadow-sm">
                      {currentOrganization.logoUrl ? (
                          <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-2xl bg-slate-50">{currentOrganization.name[0]}</div>
                      )}
                  </div>
                  <h2 className="font-bold text-sm text-slate-900 leading-tight line-clamp-2">{currentOrganization.name}</h2>
                  <span className="text-[10px] text-[#3b5998] bg-[#3b5998]/5 px-2 py-0.5 rounded mt-1 font-bold uppercase tracking-wide border border-[#3b5998]/10">
                      Yönetim Paneli
                  </span>
              </div>

              {/* Navigation */}
              <nav className="flex flex-col gap-1">
                  <div className="px-4 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Araçlar</div>
                  {navItems.filter(i => i.show).map((item) => (
                      <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={({ isActive }) => 
                              `flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold transition-all rounded-lg relative ${
                                  isActive 
                                  ? 'bg-[#eff0f5] text-[#3b5998] border border-[#d8dfea] shadow-sm' 
                                  : 'text-slate-600 hover:bg-gray-50 hover:text-[#3b5998]'
                              }`
                          }
                      >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          
                          {item.badge && item.badge > 0 ? (
                              <span className="ml-auto bg-[#dd3c10] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm leading-none min-w-[18px] text-center">
                                  {item.badge}
                              </span>
                          ) : null}
                      </NavLink>
                  ))}
              </nav>
          </div>

          {/* EXIT */}
          <div className="p-4 border-t border-[#d8dfea] bg-[#f7f7f7]">
              <button 
                  onClick={handleSwitchToPersonal}
                  className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-[#3b5998] hover:bg-white text-[11px] font-bold py-2.5 rounded-lg border border-transparent hover:border-[#d8dfea] hover:shadow-sm transition-all group"
              >
                  <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  Bireysel Hesaba Dön
              </button>
              <div className="mt-3 text-center text-[9px] text-slate-300 leading-relaxed font-mono">
                  v2.4.0 &bull; Secure
              </div>
          </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative w-full h-full bg-[#eff0f5] pt-14 md:pt-6 px-2 md:px-6 pb-20 scroll-smooth">
          <Outlet />
      </main>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
          <div 
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
          />
      )}
    </div>
  );
};
