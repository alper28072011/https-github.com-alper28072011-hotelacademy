
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, BarChart2, LogOut, Settings, Map } from 'lucide-react';
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
    { path: '/admin/career', label: 'Kariyer Yolları', icon: Map },
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
    <div className="h-full w-64 bg-[#f7f7f7] text-[#333] flex flex-col shadow-xl border-r border-[#d8dfea]">
      {/* 1. Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-[#29487d] shrink-0 bg-[#3b5998]">
        <span className="text-lg font-bold tracking-wider text-white">HOTEL ADMIN</span>
      </div>

      {/* 2. Menu Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-sm text-xs transition-colors ${
                isActive
                  ? 'bg-[#d8dfea] text-[#3b5998] font-bold border border-[#bdc7d8]'
                  : 'text-[#333] hover:bg-[#e9e9e9] font-medium border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
                <>
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-[#3b5998]' : 'text-gray-500'}`} />
                    {item.label}
                </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 3. Footer / Back Button */}
      <div className="p-4 border-t border-[#d8dfea] shrink-0 bg-[#f7f7f7]">
        <button
          onClick={handleExit}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-sm transition-colors border border-transparent hover:border-red-200"
        >
          <LogOut className="w-4 h-4" />
          Bireysel Hesaba Dön
        </button>
      </div>
    </div>
  );
};
