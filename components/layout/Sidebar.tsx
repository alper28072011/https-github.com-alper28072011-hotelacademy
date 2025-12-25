
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, BarChart2, LogOut, Settings } from 'lucide-react';
import { useContextStore } from '../../stores/useContextStore';
import { useAuthStore } from '../../stores/useAuthStore';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { switchToPersonal } = useContextStore();
  const { currentUser } = useAuthStore();

  const menuItems = [
    { path: '/admin/organization', label: 'Genel Bakış', icon: LayoutDashboard },
    { path: '/admin/requests', label: 'Ekip & İstekler', icon: Users },
    { path: '/admin/courses', label: 'Eğitimler', icon: BookOpen },
    { path: '/admin/reports', label: 'Raporlar', icon: BarChart2 },
    { path: '/admin/settings', label: 'Ayarlar', icon: Settings },
  ];

  const handleExit = () => {
    if (currentUser) {
        switchToPersonal(currentUser.id, currentUser.name, currentUser.avatar);
        navigate('/');
    }
  };

  return (
    <div className="h-full w-64 bg-[#1a237e] text-white flex flex-col shadow-xl border-r border-white/5">
      {/* 1. Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
        <span className="text-lg font-bold tracking-wider text-white">HOTEL ADMIN</span>
      </div>

      {/* 2. Menu Links */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-[#4fc3f7] bg-white/10'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* 3. Footer / Back Button */}
      <div className="p-4 border-t border-white/10 shrink-0 bg-[#1a237e]">
        <button
          onClick={handleExit}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-200 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Bireysel Hesaba Dön
        </button>
      </div>
    </div>
  );
};
