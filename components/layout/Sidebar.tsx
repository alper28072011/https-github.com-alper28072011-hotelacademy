
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, BarChart2, Settings, Map, FileText } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const menuItems = [
    { path: '/admin/organization', label: 'Genel Bakış', icon: LayoutDashboard },
    { path: '/admin/requests', label: 'Ekip & İstekler', icon: Users },
    { path: '/admin/courses', label: 'Eğitim Kataloğu', icon: BookOpen },
    { path: '/admin/career', label: 'Kariyer Yolları', icon: Map },
    { path: '/admin/reports', label: 'Raporlar', icon: BarChart2 },
    { path: '/admin/settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <nav className="space-y-0.5">
        <h4 className="text-[#999] text-[10px] font-bold uppercase mb-1 px-2">Yönetim Araçları</h4>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'} // Exact match for root admin path
            className={({ isActive }) =>
              `w-full flex items-center gap-2 px-2 py-1.5 text-[11px] transition-colors rounded-sm ${
                isActive
                  ? 'bg-[#d8dfea] text-[#333] font-bold'
                  : 'text-[#333] hover:bg-[#eff0f5] hover:text-[#3b5998]'
              }`
            }
          >
            {({ isActive }) => (
                <>
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-[#333]' : 'text-gray-500'}`} />
                    {item.label}
                </>
            )}
          </NavLink>
        ))}

        <div className="mt-4 pt-4 border-t border-[#d8dfea]">
            <h4 className="text-[#999] text-[10px] font-bold uppercase mb-1 px-2">Yardım</h4>
            <a href="#" className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-[#333] hover:bg-[#eff0f5] hover:text-[#3b5998] rounded-sm">
                <FileText className="w-4 h-4 text-gray-500" />
                Yönetici Kılavuzu
            </a>
        </div>
    </nav>
  );
};
