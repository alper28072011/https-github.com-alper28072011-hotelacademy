
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

  // --- THE SESSION RESTORATION GATE ---
  useEffect(() => {
      const verifySession = async () => {
          // Case 1: Wrong Context (User tried to access /admin while in Personal Mode)
          if (contextType === 'PERSONAL') {
              console.warn("[AdminLayout] Access attempt in PERSONAL mode. Redirecting...");
              navigate('/');
              return;
          }

          // Case 2: In Org Context, but data might be stale or missing
          // We trust `activeEntityId` from ContextStore as the source of truth for "Where am I?"
          if (contextType === 'ORGANIZATION' && activeEntityId) {
              
              // If we already have the correct org loaded, we are good.
              if (currentOrganization && currentOrganization.id === activeEntityId) {
                  setIsRestoring(false);
                  return;
              }

              // Otherwise, we must restore the session (Fetch DB, verify role)
              console.log("[AdminLayout] Hydrating Organization Session...");
              const success = await restoreActiveSession(activeEntityId);
              
              if (!success) {
                  console.error("[AdminLayout] Restore failed. Access denied.");
                  navigate('/'); // Kick out
              } else {
                  setIsRestoring(false); // Let them in
              }
          } else {
              // Fallback: No active entity ID? Invalid state.
              navigate('/');
          }
      };

      verifySession();
  }, [contextType, activeEntityId, navigate]); // Removed currentOrganization from dependency to avoid loop

  // Fetch Badge Counts (Only when stable)
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

  // --- LOADING SCREEN (The Gate) ---
  if (isRestoring || (contextType === 'ORGANIZATION' && !currentOrganization)) {
      return (
          <div className="h-screen flex items-center justify-center bg-[#eff0f5]">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-[#3b5998] border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-[#3b5998]">Yönetim Paneli Hazırlanıyor...</span>
                      <span className="text-xs text-gray-400">Veriler senkronize ediliyor</span>
                  </div>
              </div>
          </div>
      );
  }

  // Final Security Guard
  if (!currentOrganization) return null;

  if (!can('adminAccess')) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-[#eff0f5]">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#d8dfea] mb-4 flex flex-col items-center">
                  <Lock className="w-12 h-12 text-red-600 mb-4" />
                  <h2 className="text-xl font-bold text-[#333]">Erişim Reddedildi</h2>
                  <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">
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
    <div className="flex flex-col min-h-screen bg-[#eff0f5] font-sans text-[#333]">
      
      {/* 1. ADMIN HEADER (Mobile) */}
      <div className="md:hidden bg-[#3b5998] p-3 flex justify-between items-center sticky top-0 z-40 shadow-md">
          <span className="text-white font-bold text-sm ml-2">{currentOrganization.name}</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-1 rounded hover:bg-white/10">
              <Menu className="w-6 h-6" />
          </button>
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="flex flex-col md:flex-row max-w-[1000px] mx-auto w-full mt-0 md:mt-[20px] px-2 gap-4">
        
        {/* LEFT SIDEBAR */}
        <aside className={`w-full md:w-[200px] shrink-0 flex-col gap-4 ${isMobileMenuOpen ? 'flex' : 'hidden md:flex'}`}>
            
            {/* Organization Identity Card */}
            <div className="bg-white border border-[#d8dfea] p-4 rounded-sm shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg mb-3 overflow-hidden border border-gray-200">
                    {currentOrganization.logoUrl ? (
                        <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-300 text-xl">{currentOrganization.name[0]}</div>
                    )}
                </div>
                <h2 className="font-bold text-sm text-[#333] leading-tight">{currentOrganization.name}</h2>
                <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Yönetim Paneli</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1 bg-white border border-[#d8dfea] py-2 rounded-sm shadow-sm">
                <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Araçlar</div>
                {navItems.filter(i => i.show).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => 
                            `flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold transition-colors border-l-[3px] ${
                                isActive 
                                ? 'bg-[#eff0f5] text-[#3b5998] border-[#3b5998]' 
                                : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-[#3b5998]'
                            }`
                        }
                    >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                        
                        {item.badge && item.badge > 0 ? (
                            <span className="ml-auto bg-[#dd3c10] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm leading-none border border-[#b0300d]">
                                {item.badge}
                            </span>
                        ) : null}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-[#d8dfea] pt-3 px-2 text-center">
                <div className="text-[9px] text-gray-400 leading-relaxed">
                    Hotel Academy © 2024<br/>
                    Business Manager v2.1
                </div>
            </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 pb-12">
            <Outlet />
        </main>

      </div>
    </div>
  );
};
