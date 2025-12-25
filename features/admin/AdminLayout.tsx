
import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useContextStore } from '../../stores/useContextStore';
import { Sidebar } from '../../components/layout/Sidebar';
import { Loader2 } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { contextType, activeEntityId, activeEntityName, isHydrated } = useContextStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isHydrated && contextType === 'PERSONAL') {
      navigate('/');
    }
  }, [contextType, isHydrated, navigate]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 text-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-[#3b5998]" />
      </div>
    );
  }

  const resetKey = `ADMIN-ROOT-${contextType}-${activeEntityId}`;

  return (
    <div 
      key={resetKey}
      className="flex h-screen w-full overflow-hidden bg-[#eff0f2]"
    >
      {/* Sidebar - Legacy Style */}
      <aside className="w-48 flex-shrink-0 h-full bg-[#f1f1f1] border-r border-[#d8dfea] z-50">
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Header - White Box */}
        <header className="bg-[#3b5998] border-b border-[#29487d] h-[42px] flex items-center px-4 shrink-0 justify-between">
           <div className="flex items-center gap-2">
             <div className="bg-white/20 text-white text-[10px] font-bold px-1 rounded-sm">
                YÖNETİM
             </div>
             <h1 className="text-sm font-bold text-white truncate max-w-md">
               {activeEntityName || 'Yönetim Paneli'}
             </h1>
           </div>
           <button onClick={() => navigate('/')} className="text-[11px] text-white font-bold hover:underline">
               Siteye Dön
           </button>
        </header>

        {/* Dynamic Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-4 relative z-0 scroll-smooth">
          <div className="max-w-5xl mx-auto min-h-[500px]">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
