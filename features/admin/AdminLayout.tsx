
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useContextStore } from '../../stores/useContextStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { Sidebar } from '../../components/layout/Sidebar';
import { Loader2, AlertCircle } from 'lucide-react';
import { getOrganizationDetails } from '../../services/db';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { contextType, activeEntityId, activeEntityName, isHydrated } = useContextStore();
  const { currentOrganization, startOrganizationSession } = useOrganizationStore();
  const [isRecovering, setIsRecovering] = useState(false);

  // 1. DATA INTEGRITY CHECK
  // We determine if the app is in a safe state to render the Admin UI.
  // Safe State = Context is ORGANIZATION + ActiveID exists + Store has Data + Store Data ID matches Context ID.
  const isDataReady = 
      isHydrated && 
      contextType === 'ORGANIZATION' && 
      activeEntityId && 
      currentOrganization && 
      currentOrganization.id === activeEntityId;

  // 2. SELF-HEALING EFFECT
  // If we are on this route, but data is missing (F5 reload or fast switch), try to fetch it.
  useEffect(() => {
      const ensureData = async () => {
          if (!isHydrated) return; // Wait for storage first

          // If Context is wrong, kick out
          if (contextType !== 'ORGANIZATION' || !activeEntityId) {
              navigate('/');
              return;
          }

          // If data is already perfect, do nothing
          if (isDataReady) return;

          // If data is missing or stale (partial data from localStorage), force a refresh
          console.log(`[AdminLayout] Data mismatch or missing for ${activeEntityId}. Attempting recovery...`);
          setIsRecovering(true);
          
          try {
              // Re-run the session starter to fetch fresh data
              const result = await startOrganizationSession(activeEntityId);
              if (!result.success) {
                  throw new Error(result.error);
              }
          } catch (error) {
              console.error("[AdminLayout] Recovery failed:", error);
              navigate('/'); // Panic button: Go home
          } finally {
              setIsRecovering(false);
          }
      };

      ensureData();
  }, [isHydrated, contextType, activeEntityId, isDataReady, navigate, startOrganizationSession]);

  // 3. LOADING STATE (The "White Screen" Killer)
  // Instead of rendering broken UI (Outlet), we render a loader until isDataReady is true.
  if (!isDataReady || isRecovering) {
    return (
      <div className="flex h-screen w-full bg-[#eff0f5] items-center justify-center flex-col gap-4">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center animate-in zoom-in duration-300">
          <Loader2 className="w-8 h-8 text-[#3b5998] animate-spin" />
        </div>
        <div className="text-center">
            <h2 className="text-lg font-bold text-slate-700">Yönetim Paneli</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
                {activeEntityName ? `${activeEntityName} verileri hazırlanıyor...` : 'Yükleniyor...'}
            </p>
        </div>
      </div>
    );
  }

  // 4. SAFE RENDER
  // At this point, currentOrganization is guaranteed to exist and match the URL context.
  return (
    <div className="flex h-screen w-full bg-[#f3f4f6] overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0 w-64 h-full hidden md:block z-20">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#eff0f5]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 flex-shrink-0 shadow-sm justify-between z-10">
           <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold text-gray-800 truncate">
               {currentOrganization.name}
             </h1>
           </div>
           <div className="flex items-center gap-2">
               <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold uppercase tracking-wider">
                   Kurumsal Mod
               </span>
           </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth relative">
          <div className="max-w-7xl mx-auto h-full">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
