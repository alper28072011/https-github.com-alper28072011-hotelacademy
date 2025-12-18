
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, Film, LogOut, ArrowLeft, Map, BarChart2, Inbox, Settings, Loader2, Building2, LayoutList, Network, Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { usePermission } from '../../hooks/usePermission';

export const AdminLayout: React.FC = () => {
  const { logout } = useAuthStore();
  const { currentOrganization, isLoading } = useOrganizationStore();
  const navigate = useNavigate();
  const { can } = usePermission();

  // Guard Logic 1: Basic Auth & Org
  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!currentOrganization) return <div className="h-screen flex items-center justify-center">Organizasyon verisi alınamadı.</div>;

  // Guard Logic 2: Permission Check
  if (!can('adminAccess')) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
              <div className="bg-red-100 p-6 rounded-full mb-6"><Lock className="w-12 h-12 text-red-500" /></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Erişim Reddedildi</h2>
              <p className="text-gray-500 mb-8 max-w-md">Bu alana erişmek için gerekli yönetim yetkilerine sahip değilsiniz. Lütfen yöneticinizle görüşün.</p>
              <button onClick={() => navigate('/')} className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg">Ana Sayfaya Dön</button>
          </div>
      );
  }

  // --- Dynamic Navigation ---
  const navItems = [
    { path: '/admin/requests', icon: Inbox, label: 'İstekler', show: can('canApproveRequests') }, 
    { path: '/admin/organization', icon: Network, label: 'Organizasyon', show: can('manageStructure') || can('manageStaff') }, 
    { path: '/admin/career', icon: Map, label: 'Kariyer', show: can('manageStructure') },
    { path: '/admin/content', icon: Film, label: 'Stüdyo', show: can('canCreateContent') },
    { path: '/admin/courses', icon: LayoutList, label: 'İçerikler', show: can('canCreateContent') },
    { path: '/admin/reports', icon: BarChart2, label: 'Analiz', show: can('viewAnalytics') },
    { path: '/admin/settings', icon: Settings, label: 'Kurum Ayarları', show: can('adminAccess') }, // Only full admins usually, but flexible
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-primary text-white flex flex-col sticky top-0 h-screen z-30">
        <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shadow-lg shrink-0">
               {currentOrganization.logoUrl ? (
                   <img src={currentOrganization.logoUrl} className="w-full h-full object-cover rounded-lg" />
               ) : (
                   <span className="text-primary font-bold text-xl">{currentOrganization.name[0]}</span>
               )}
            </div>
            <div className="hidden md:flex flex-col overflow-hidden">
                <span className="font-bold text-sm tracking-wide uppercase truncate">{currentOrganization.name}</span>
                <span className="text-[10px] text-white/50">Yönetim Paneli</span>
            </div>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-2">
            {navItems.filter(i => i.show).map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => 
                        `flex items-center gap-4 p-3 rounded-xl transition-all ${
                            isActive 
                            ? 'bg-accent text-primary font-bold shadow-lg' 
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`
                    }
                >
                    <item.icon className="w-6 h-6 shrink-0" />
                    <span className="hidden md:block">{item.label}</span>
                </NavLink>
            ))}
        </nav>

        <div className="p-4 border-t border-white/10 flex flex-col gap-2">
            <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-4 p-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all w-full"
            >
                <ArrowLeft className="w-6 h-6" />
                <span className="hidden md:block">Uygulamaya Dön</span>
            </button>
            <button 
                onClick={logout}
                className="flex items-center gap-4 p-3 rounded-xl text-red-300 hover:bg-red-500/20 hover:text-red-100 transition-all w-full"
            >
                <LogOut className="w-6 h-6" />
                <span className="hidden md:block">Çıkış Yap</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto h-full">
             <Outlet />
        </div>
      </main>
    </div>
  );
};
