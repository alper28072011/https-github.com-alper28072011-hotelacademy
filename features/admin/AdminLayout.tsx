
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
    Users, ArrowLeft, Map, BarChart2, Inbox, 
    Settings, Loader2, Network, Lock, Menu, BookOpen
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useContextStore } from '../../stores/useContextStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { usePermission } from '../../hooks/usePermission';
import { getJoinRequests } from '../../services/db';
import { getUserManagedPages } from '../../services/organizationService';

export const AdminLayout: React.FC = () => {
  const { logout, currentUser } = useAuthStore();
  const { contextType, switchToOrganization, activeEntityId } = useContextStore();
  const { currentOrganization, isLoading, switchOrganization } = useOrganizationStore();
  
  const navigate = useNavigate();
  const { can } = usePermission();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isCheckingContext, setIsCheckingContext] = useState(true);

  // --- SECURITY WALL: ENFORCE ORGANIZATION CONTEXT ---
  useEffect(() => {
      let isMounted = true;

      const enforceContext = async () => {
          if (!currentUser) return;

          // 1. If already in Organization Mode -> Ensure Store is Synced
          if (contextType === 'ORGANIZATION' && activeEntityId) {
              if (currentOrganization?.id !== activeEntityId) {
                  console.log("AdminLayout: Syncing Organization Store...");
                  await switchOrganization(activeEntityId);
              }
              if (isMounted) setIsCheckingContext(false);
              return;
          }

          // 2. If in Personal Mode -> Try Auto-Switch to first managed page
          if (contextType === 'PERSONAL') {
              console.log("[AdminLayout] User is in Personal Mode. Attempting Auto-Switch...");
              const managedPages = await getUserManagedPages(currentUser.id);
              
              if (managedPages.length > 0) {
                  // Auto Switch to First Page
                  const target = managedPages[0];
                  switchToOrganization(target.id, target.name, target.logoUrl);
                  await switchOrganization(target.id);
                  if (isMounted) setIsCheckingContext(false);
              } else {
                  // No Pages to Manage -> Kick out
                  alert("Yönetim paneline erişmek için bir işletme hesabınız olmalıdır.");
                  navigate('/');
              }
          }
      };

      enforceContext();
      
      return () => { isMounted = false; };
  }, [contextType, currentUser, activeEntityId]);

  // Fetch Badge Counts
  useEffect(() => {
      const fetchCount = async () => {
          if (currentOrganization && can('canApproveRequests')) {
              const reqs = await getJoinRequests(currentOrganization.id);
              setPendingCount(reqs.length);
          }
      };
      if (!isCheckingContext) fetchCount();
  }, [currentOrganization, isCheckingContext]);

  if (isLoading || isCheckingContext) return <div className="h-screen flex items-center justify-center bg-[#eff0f5]"><Loader2 className="w-6 h-6 animate-spin text-[#3b5998]" /></div>;
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
      
      {/* 1. ADMIN HEADER - Only Menu Toggle (Main Header handled by DashboardLayout now) */}
      <div className="md:hidden bg-[#3b5998] p-2 flex justify-between items-center sticky top-0 z-40 shadow-md">
          <span className="text-white font-bold text-xs ml-2">Yönetim Paneli</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
              <Menu className="w-5 h-5" />
          </button>
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="flex flex-col md:flex-row max-w-[980px] mx-auto w-full mt-4 md:mt-[20px] px-2 gap-3">
        
        {/* LEFT SIDEBAR (Context Specific Menu) */}
        <aside className={`w-full md:w-[180px] shrink-0 flex-col gap-4 ${isMobileMenuOpen ? 'flex' : 'hidden md:flex'}`}>
            
            {/* Navigation Links */}
            <nav className="flex flex-col gap-1 bg-white border border-[#d8dfea] py-2 rounded-sm shadow-sm">
                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Yönetim Araçları</div>
                {navItems.filter(i => i.show).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => 
                            `flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors group border-l-2 ${
                                isActive 
                                ? 'bg-[#eff0f5] text-[#3b5998] border-[#3b5998]' 
                                : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-[#3b5998]'
                            }`
                        }
                    >
                        <item.icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                        
                        {item.badge && item.badge > 0 ? (
                            <span className="ml-auto bg-[#dd3c10] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm leading-none border border-[#b0300d]">
                                {item.badge}
                            </span>
                        ) : null}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-[#d8dfea] pt-2 mt-2 px-2">
                <div className="text-[10px] text-gray-400">
                    Hotel Academy © 2006<br/>
                    Business Manager
                </div>
            </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 pb-10">
            <Outlet />
        </main>

      </div>
    </div>
  );
};
