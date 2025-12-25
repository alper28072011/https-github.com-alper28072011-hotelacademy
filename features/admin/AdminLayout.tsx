
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
    Users, Map, BarChart2, Inbox, 
    Settings, Loader2, Network, Lock, Menu, BookOpen
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContextStore } from '../../stores/useContextStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { usePermission } from '../../hooks/usePermission';
import { getJoinRequests } from '../../services/db';

export const AdminLayout: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { contextType, activeEntityId } = useContextStore();
  const { currentOrganization, restoreActiveSession } = useOrganizationStore();
  
  const navigate = useNavigate();
  const { can } = usePermission();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);

  // --- GATEKEEPER ---
  useEffect(() => {
      const verifySession = async () => {
          // 1. If explicitly in Personal Mode, kick out immediately.
          if (contextType === 'PERSONAL') {
              console.warn("[AdminLayout] Access attempt in PERSONAL mode. Redirecting...");
              navigate('/');
              return;
          }

          // 2. If in Organization Context but data is stale
          if (contextType === 'ORGANIZATION' && activeEntityId) {
              
              if (currentOrganization && currentOrganization.id === activeEntityId) {
                  // Data matches context, all good
                  setIsRestoring(false);
                  return;
              }

              // Data mismatch or missing -> Restore
              console.log("[AdminLayout] Hydrating Organization Session...");
              const success = await restoreActiveSession(activeEntityId);
              
              if (!success) {
                  console.error("[AdminLayout] Restore failed. Access denied.");
                  navigate('/'); // Kick out
              } else {
                  setIsRestoring(false); // Let them in
              }
          } else {
              // Context is organization but no ID? Invalid state.
              navigate('/');
          }
      };

      verifySession();
  }, [contextType, activeEntityId, navigate]); 

  // Fetch Badge Counts
  useEffect(() => {
      const fetchCount = async () => {
          if (!isRestoring && currentOrganization && can('canApproveRequests')) {
              try {
                  const reqs = await getJoinRequests(currentOrganization.id);
                  setPendingCount(reqs.length);
              } catch (e) {
                  console.error("Failed to fetch requests count", e);
              }
          }
      };
      fetchCount();
  }, [isRestoring, currentOrganization]);

  // --- LOADING SCREEN ---
  if (isRestoring || (contextType === 'ORGANIZATION' && !currentOrganization)) {
      return (
          <div className="h-screen flex items-center justify-center bg-[#eff0f2] text-slate-900">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-[#3b5998] border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-[#3b5998]">Yönetim Paneli Hazırlanıyor...</span>
                      <span className="text-xs text-slate-500">Veriler senkronize ediliyor</span>
                  </div>
              </div>
          </div>
      );
  }

  // Final Safety Check
  if (!currentOrganization) return null;

  if (!can('adminAccess')) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-[#eff0f2]">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#d8dfea] mb-4 flex flex-col items-center">
                  <Lock className="w-12 h-12 text-red-600 mb-4" />
                  <h2 className="text-xl font-bold text-slate-900">Erişim Reddedildi</h2>
                  <p className="text-sm text-slate-500 mt-2 text-center max-w-xs">
                      Bu organizasyonun yönetim paneline erişim yetkiniz bulunmuyor.
                  </p>
                  <button onClick={() => navigate('/')} className="mt-6 bg-[#3b5998] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#2d4373] transition-colors text-sm">
                      Ana Sayfaya Dön
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
    // CRITICAL FIX: The `key` prop here forces React to destroy and recreate the entire layout when switching entities.
    // This prevents CSS bleeding from the previous page (Ghost UI issue).
    <div 
        key={activeEntityId} 
        className="flex h-screen bg-[#eff0f2] text-slate-900 admin-panel overflow-hidden"
        style={{ isolation: 'isolate' }} // Creates a new stacking context for robust Z-indexing
    >
      
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-[#3b5998] p-3 flex justify-between items-center fixed top-0 left-0 right-0 z-50 shadow-md">
          <span className="text-white font-bold text-sm ml-2">{currentOrganization.name}</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-1 rounded hover:bg-white/10">
              <Menu className="w-6 h-6" />
          </button>
      </div>

      {/* LEFT SIDEBAR (Desktop Fixed, Mobile Toggle) */}
      <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#d8dfea] transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 overflow-y-auto
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
          <div className="p-4 flex flex-col gap-6 h-full mt-12 md:mt-0">
              {/* Organization Identity Card */}
              <div className="bg-[#f7f7f7] border border-[#e9e9e9] p-4 rounded-xl shadow-sm flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white rounded-lg mb-3 overflow-hidden border border-[#d8dfea]">
                      {currentOrganization.logoUrl ? (
                          <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-xl">{currentOrganization.name[0]}</div>
                      )}
                  </div>
                  <h2 className="font-bold text-sm text-slate-900 leading-tight">{currentOrganization.name}</h2>
                  <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide font-bold">Yönetim Paneli</span>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Araçlar</div>
                  {navItems.filter(i => i.show).map((item) => (
                      <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={({ isActive }) => 
                              `flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold transition-colors rounded-lg ${
                                  isActive 
                                  ? 'bg-[#eff0f5] text-[#3b5998] border border-[#d8dfea]' 
                                  : 'text-slate-600 hover:bg-gray-50 hover:text-[#3b5998]'
                              }`
                          }
                      >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          
                          {item.badge && item.badge > 0 ? (
                              <span className="ml-auto bg-[#dd3c10] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] shadow-sm leading-none">
                                  {item.badge}
                              </span>
                          ) : null}
                      </NavLink>
                  ))}
              </nav>

              <div className="mt-auto border-t border-[#e9e9e9] pt-4 px-2 text-center">
                  <div className="text-[9px] text-slate-400 leading-relaxed">
                      Hotel Academy © 2024<br/>
                      Business Manager v2.1
                  </div>
              </div>
          </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative w-full h-full bg-[#eff0f2] pt-14 md:pt-6 px-2 md:px-6 pb-20">
          <Outlet />
      </main>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
          <div 
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
          />
      )}
    </div>
  );
};
