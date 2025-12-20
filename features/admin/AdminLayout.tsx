
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
    Users, Film, LogOut, ArrowLeft, Map, BarChart2, Inbox, 
    Settings, Loader2, Network, Lock, Menu 
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { usePermission } from '../../hooks/usePermission';

export const AdminLayout: React.FC = () => {
  const { logout } = useAuthStore();
  const { currentOrganization, isLoading } = useOrganizationStore();
  const navigate = useNavigate();
  const { can } = usePermission();

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!currentOrganization) return <div className="h-screen flex items-center justify-center">Veri yok.</div>;

  if (!can('adminAccess')) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="bg-red-50 p-6 rounded-full mb-4"><Lock className="w-10 h-10 text-red-500" /></div>
              <h2 className="text-xl font-bold text-gray-800">Erişim Reddedildi</h2>
              <button onClick={() => navigate('/')} className="mt-4 text-primary font-bold hover:underline">Geri Dön</button>
          </div>
      );
  }

  const navItems = [
    { path: '/admin/requests', icon: Inbox, label: 'İstekler', show: can('canApproveRequests') }, 
    { path: '/admin/organization', icon: Network, label: 'Organizasyon', show: can('manageStructure') || can('manageStaff') }, 
    { path: '/admin/career', icon: Map, label: 'Kariyer', show: can('manageStructure') },
    { path: '/admin/content', icon: Film, label: 'Stüdyo', show: can('canCreateContent') },
    { path: '/admin/courses', icon: Menu, label: 'İçerikler', show: can('canCreateContent') },
    { path: '/admin/reports', icon: BarChart2, label: 'Analiz', show: can('viewAnalytics') },
    { path: '/admin/settings', icon: Settings, label: 'Ayarlar', show: can('adminAccess') },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Light Sidebar */}
      <aside className="w-20 md:w-64 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        
        {/* Brand Area */}
        <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold shadow-md shrink-0">
               {currentOrganization.logoUrl ? (
                   <img src={currentOrganization.logoUrl} className="w-full h-full object-cover rounded-lg" />
               ) : (
                   currentOrganization.name[0]
               )}
            </div>
            <div className="hidden md:block overflow-hidden">
                <div className="font-bold text-sm text-gray-800 truncate">{currentOrganization.name}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Yönetim</div>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 flex flex-col gap-1 px-3">
            {navItems.filter(i => i.show).map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => 
                        `flex items-center gap-3 p-3 rounded-lg transition-all text-sm font-medium ${
                            isActive 
                            ? 'bg-primary/5 text-primary border-l-4 border-primary pl-2' // Clean Active State
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                        }`
                    }
                >
                    <item.icon className={`w-5 h-5 ${item.label === 'Stüdyo' ? '' : ''}`} />
                    <span className="hidden md:block">{item.label}</span>
                </NavLink>
            ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-50 flex flex-col gap-1">
            <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-3 p-3 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-primary transition-all w-full text-sm font-medium"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden md:block">Uygulamaya Dön</span>
            </button>
            <button 
                onClick={logout}
                className="flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all w-full text-sm font-medium"
            >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:block">Çıkış</span>
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto h-full">
             <Outlet />
        </div>
      </main>
    </div>
  );
};
