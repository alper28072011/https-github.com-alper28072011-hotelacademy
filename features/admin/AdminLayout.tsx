
import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useContextStore } from '../../stores/useContextStore';
import { Sidebar } from '../../components/layout/Sidebar';
import { Loader2 } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { contextType, activeEntityName, isHydrated } = useContextStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Sadece storage yüklendiyse ve context yanlışsa yönlendir
    if (isHydrated && contextType === 'PERSONAL') {
      navigate('/');
    }
  }, [contextType, isHydrated, navigate]);

  // Loading durumunu layout'u bozmadan göster
  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full bg-[#f3f4f6] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#1a237e]" />
          <span className="text-sm font-bold text-gray-500">Panel Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f3f4f6] overflow-hidden">
      {/* 1. Sidebar Alanı - Sabit ve Garantili */}
      <div className="flex-shrink-0 w-64 h-full hidden md:block">
        <Sidebar />
      </div>

      {/* 2. Ana İçerik Alanı - Kaydırılabilir */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 flex-shrink-0 shadow-sm justify-between z-10">
           <div className="flex items-center gap-4">
             {/* Mobile Sidebar Trigger (Future Impl) */}
             <h1 className="text-xl font-bold text-gray-800 truncate">
               {activeEntityName || 'Yönetim Paneli'}
             </h1>
           </div>
           <div className="text-xs font-bold text-gray-400 uppercase tracking-widest border border-gray-200 px-2 py-1 rounded">
             Kurumsal Mod
           </div>
        </header>

        {/* Scroll Edilebilir İçerik */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#f3f4f6]">
          <div className="max-w-7xl mx-auto h-full">
             {/* İçerik buraya gelecek */}
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
