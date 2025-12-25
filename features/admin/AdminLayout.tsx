
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
  
  // Store Access
  const contextStore = useContextStore();
  const orgStore = useOrganizationStore();
  const { can } = usePermission();
  
  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // --- HYDRATION CHECK ---
  // If we are in "Organization Context" but the data store is empty, 
  // it means the user refreshed the page (F5). We need to fetch data.
  // If data exists, we render immediately.
  const [isHydrating, setIsHydrating] = useState(() => {
      const isContextReady = contextStore.contextType === 'ORGANIZATION';
      const isDataReady = orgStore.currentOrganization?.id === contextStore.activeEntityId;
      
      // If Context says Org, but Data is missing or mismatch -> Hydrate
      return isContextReady && !isDataReady;
  });

  // --- RECOVERY EFFECT ---
  useEffect(() => {
      const ensureData = async () => {
          // 1. Guard: Check Context
          if (contextStore.contextType !== 'ORGANIZATION' || !contextStore.activeEntityId) {
              navigate('/');
              return;
          }

          // 2. Guard: Check Data Availability
          // If we already have the right data, stop hydration (if active) and return.
          if (orgStore.currentOrganization?.id === contextStore.activeEntityId) {
              if (isHydrating) setIsHydrating(false);
              return;
          }

          // 3. Data Missing (F5 Case): Fetch it.
          console.log("[AdminLayout] Data mismatch/missing. Hydrating...");
          setIsHydrating(true);
          const success = await orgStore.switchOrganization(contextStore.activeEntityId);
          
          if (!success) {
              console.error("[AdminLayout] Hydration failed. Falling back.");
              await orgStore.switchToPersonal();
              navigate('/');
          } else {
              setIsHydrating(false);
          }
      };

      ensureData();
  }, [contextStore.activeEntityId, contextStore.contextType]); // Only run if ID or Context changes

  // --- BADGES ---
  useEffect(() => {
      if (!isHydrating && orgStore.currentOrganization && can('canApproveRequests')) {
          getJoinRequests(orgStore.currentOrganization.id).then(reqs => {
              setPendingCount(reqs.length);
          }).catch(() => {});
      }
  }, [isHydrating, orgStore.currentOrganization, can]);

  const handleSwitchToPersonal = async () => {
      await orgStore.switchToPersonal();
      navigate('/');
  };

  // --- RENDER STATES ---

  // 1. Hydrating (F5 Refresh)
  if (isHydrating) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#eff0f5] text-slate-900 absolute inset-0 z-[9999]">
              <Loader2 className="w-10 h-10 text-[#3b5998] animate-spin mb-4" />
              <div className="flex flex-col items-center animate-pulse">
                  <span className="text-sm font-bold text-[#3b5998]">Yönetim Paneli</span>
                  <span className="text-xs text-slate-500">Veriler yükleniyor...</span>
              </div>
          </div>
      );
  }

  // 2. Safety Fallback (Should rarely show if logic is correct)
  if (!orgStore.currentOrganization) {
      // If we are here, hydration finished but data is null. 
      // Context might be wrong. Render nothing or a generic loader until redirect happens.
      return <div className="h-screen w-screen bg-[#eff0f5]" />; 
  }

  // 3. Permission Gate
  const hasAccess = can('adminAccess') || currentUser?.role === 'super_admin';
  if (!hasAccess) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#eff0f5] absolute inset-0 z-[9999]">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-100 flex flex-col items-center max-w-sm text-center">
                  <Lock className="w-12 h-12 text-red-600 mb-4" />
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Erişim Reddedildi</h2>
                  <p className="text-sm text-slate-500 mb-6">
                      <span className="font-bold">{orgStore.currentOrganization.name}</span> paneline erişim yetkiniz yok.
                  </p>
                  <button onClick={handleSwitchToPersonal} className="bg-[#3b5998] text-white px-6 py-2 rounded-lg font-bold text-sm">
                      Çıkış Yap
                  </button>
              </div>
          </div>
      );
  }

  // 4. MAIN LAYOUT
  const org = orgStore.currentOrganization;
  const navItems = [
    { path: '/admin/requests', icon: Inbox, label: 'İstekler', show: can('canApproveRequests'), badge: pendingCount }, 
    { path: '/admin/organization', icon: Network, label: 'Organizasyon', show: can('manageStructure') || can('manageStaff') }, 
    { path: '/admin/career', icon: Map, label: 'Kariyer Yolu', show: can('manageStructure') },
    { path: '/admin/courses', icon: BookOpen, label: 'Kurslar', show: can('canCreateContent') },
    { path: '/admin/reports', icon: BarChart2, label: 'İstatistikler', show: can('viewAnalytics') },
    { path: '/admin/settings', icon: Settings, label: 'Ayarlar', show: can('adminAccess') },
  ];

  return (
    // CRITICAL FIX: The 'key' prop forces React to destroy and recreate the DOM 
    // when the organization changes, preventing ghost UI and style bleeding.
    // 'isolation-isolate' creates a new stacking context.
    <div 
        key={contextStore.activeEntityId || 'admin-layout'}
        className="flex h-screen w-full bg-[#eff0f5] text-slate-900 overflow-hidden absolute inset-0 z-50 isolation-isolate"
        style={{ isolation: 'isolate' }}
    >
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-[#3b5998] p-3 flex justify-between items-center fixed top-0 left-0 right-0 z-50 shadow-md">
          <span className="text-white font-bold text-sm ml-2 truncate">{org.name}</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-1">
              <Menu className="w-6 h-6" />
          </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#d8dfea] transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 overflow-y-auto flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
          <div className="p-4 flex flex-col gap-6 flex-1 mt-12 md:mt-0">
              {/* Identity */}
              <div className="bg-[#f7f7f7] border border-[#e9e9e9] p-4 rounded-xl shadow-sm flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white rounded-lg mb-3 overflow-hidden border border-[#d8dfea]">
                      {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-300">{org.name[0]}</div>}
                  </div>
                  <h2 className="font-bold text-sm text-slate-900 leading-tight">{org.name}</h2>
                  <span className="text-[10px] text-[#3b5998] font-bold mt-1 uppercase">Yönetim Paneli</span>
              </div>

              {/* Nav */}
              <nav className="flex flex-col gap-1">
                  <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Araçlar</div>
                  {navItems.filter(i => i.show).map((item) => (
                      <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={({ isActive }) => 
                              `flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold transition-colors rounded-lg ${
                                  isActive ? 'bg-[#eff0f5] text-[#3b5998] border border-[#d8dfea]' : 'text-gray-600 hover:bg-gray-50'
                              }`
                          }
                      >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          {item.badge && item.badge > 0 ? (
                              <span className="ml-auto bg-[#dd3c10] text-white text-[10px] px-1.5 rounded">{item.badge}</span>
                          ) : null}
                      </NavLink>
                  ))}
              </nav>
          </div>

          {/* Exit */}
          <div className="p-4 border-t border-[#d8dfea] bg-[#f7f7f7]">
              <button 
                  onClick={handleSwitchToPersonal}
                  className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-[#3b5998] text-[11px] font-bold py-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all"
              >
                  <LogOut className="w-3 h-3" /> Bireysel Hesaba Dön
              </button>
          </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto relative w-full h-full bg-[#eff0f5] pt-14 md:pt-6 px-2 md:px-6 pb-20">
          <Outlet />
      </main>

      {/* BACKDROP */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
    </div>
  );
};
