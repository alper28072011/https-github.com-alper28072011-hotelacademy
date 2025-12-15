
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, Film, PieChart, LogOut, ArrowLeft, Map, BarChart2, Inbox, Settings } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

export const AdminLayout: React.FC = () => {
  const { logout, currentUser } = useAuthStore();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin/requests', icon: Inbox, label: 'İstekler' }, 
    { path: '/admin/staff', icon: Users, label: 'Personel' },
    { path: '/admin/career', icon: Map, label: 'Kariyer Yolları' },
    { path: '/admin/content', icon: Film, label: 'İçerik Stüdyosu' },
    { path: '/admin/reports', icon: BarChart2, label: 'Yetenek Analitiği' },
    { path: '/admin/settings', icon: Settings, label: 'Otel Ayarları' }, // New
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-primary text-white flex flex-col sticky top-0 h-screen">
        <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shadow-lg shrink-0">
               <span className="text-primary font-bold text-xl">H</span>
            </div>
            <span className="hidden md:block font-bold text-lg tracking-wide uppercase">Manager</span>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-2 px-2">
            {navItems.map((item) => (
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
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
             <Outlet />
        </div>
      </main>
    </div>
  );
};
