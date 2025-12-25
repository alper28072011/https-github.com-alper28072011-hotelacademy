
import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useContextStore } from '../../stores/useContextStore';
import { Sidebar } from '../../components/layout/Sidebar';
import { Loader2 } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { contextType, activeEntityId, activeEntityName, isHydrated } = useContextStore();
  const navigate = useNavigate();
  const location = useLocation();

  // 1. SECURITY CHECK
  // If storage is loaded but we are in Personal mode, kick out immediately.
  useEffect(() => {
    if (isHydrated && contextType === 'PERSONAL') {
      navigate('/');
    }
  }, [contextType, isHydrated, navigate]);

  // 2. LOADING STATE
  // Show a simple loader while hydration happens.
  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 text-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a237e]" />
      </div>
    );
  }

  // 3. NUCLEAR RESET KEY
  // This key forces React to DESTROY and RE-CREATE the DOM whenever the context or ID changes.
  // It acts like a mini-F5 refresh for the Virtual DOM.
  const resetKey = `ADMIN-ROOT-${contextType}-${activeEntityId}`;

  return (
    <div 
      key={resetKey}
      className="flex h-screen w-full overflow-hidden bg-[#f3f4f6]"
      style={{ 
        backgroundColor: '#f3f4f6', 
        color: '#1f2937',
        isolation: 'isolate' // CSS isolation to prevent bleed
      }} 
    >
      {/* Sidebar - Fixed Width, Dark Theme */}
      <aside className="w-64 flex-shrink-0 h-full bg-[#1a237e] text-white z-50">
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f3f4f6] h-full overflow-hidden">
        
        {/* Top Header - Guaranteed Render */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 shadow-sm z-40 flex-shrink-0">
           <div className="flex items-center gap-2">
             <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-blue-200">
                Kurumsal
             </span>
             <h1 className="text-lg font-bold text-gray-800 truncate max-w-md">
               {activeEntityName || 'Yönetim Paneli'}
             </h1>
           </div>
        </header>

        {/* Dynamic Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scroll-smooth">
          <div className="max-w-7xl mx-auto min-h-[500px] text-gray-900 pb-20">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
