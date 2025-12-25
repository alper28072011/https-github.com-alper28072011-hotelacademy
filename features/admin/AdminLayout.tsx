
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useContextStore } from '../../stores/useContextStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { Sidebar } from '../../components/layout/Sidebar';
import { Loader2, Home, User, ChevronDown, Search, LogOut, Building2 } from 'lucide-react';
import { getUserManagedPages } from '../../services/organizationService';
import { Organization } from '../../types';
import { Avatar } from '../../components/ui/Avatar';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { contextType, activeEntityId, activeEntityName, isHydrated, switchToPersonal } = useContextStore();
  const { currentUser, logout } = useAuthStore();
  const { startOrganizationSession, isSwitching } = useOrganizationStore();

  const [isContextOpen, setIsContextOpen] = useState(false);
  const [managedOrgs, setManagedOrgs] = useState<Organization[]>([]);

  // 1. Security Check & Hydration
  useEffect(() => {
    if (isHydrated && contextType === 'PERSONAL') {
      navigate('/');
    }
  }, [contextType, isHydrated, navigate]);

  // 2. Load Managed Pages for Dropdown
  useEffect(() => {
      const loadOrgs = async () => {
          if (currentUser) {
              const orgs = await getUserManagedPages(currentUser.id);
              setManagedOrgs(orgs);
          }
      };
      loadOrgs();
  }, [currentUser]);

  // --- ACTIONS ---

  const handleGoHome = () => {
      if (currentUser) {
          switchToPersonal(currentUser.id, currentUser.name, currentUser.avatar);
          navigate('/');
      }
  };

  const handleGoProfile = () => {
      if (currentUser) {
          switchToPersonal(currentUser.id, currentUser.name, currentUser.avatar);
          navigate('/profile');
      }
  };

  const handleContextSwitch = async (target: Organization) => {
      // If already in this org, do nothing
      if (target.id === activeEntityId) {
          setIsContextOpen(false);
          return;
      }
      
      setIsContextOpen(false);
      // Switch Admin Session
      const result = await startOrganizationSession(target.id);
      if (result.success) {
          // Force reload/redirect to refresh admin views
          navigate('/admin');
      }
  };

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#eff0f2] text-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-[#3b5998]" />
      </div>
    );
  }

  const resetKey = `ADMIN-ROOT-${contextType}-${activeEntityId}`;

  return (
    <div key={resetKey} className="flex flex-col h-screen w-full overflow-hidden bg-[#eff0f2]">
      
      {/* 1. GLOBAL BLUE HEADER (Matches Dashboard) */}
      <div className="bg-[#3b5998] border-b border-[#29487d] h-[42px] shrink-0 z-[60] flex items-center justify-between px-2 md:px-20 shadow-sm relative">
          
          {/* Left: Logo & Search */}
          <div className="flex items-center gap-2">
              <div onClick={handleGoHome} className="cursor-pointer bg-[#3b5998] p-1">
                  <span className="text-white font-bold text-lg tracking-tighter">facebook<span className="opacity-50 text-[10px] font-normal tracking-normal ml-1">admin</span></span>
              </div>
              
              {/* Minimal Search Bar */}
              <div className="relative hidden md:block ml-2">
                  <input 
                      placeholder="Yönetim panelinde ara..." 
                      className="h-[24px] w-[250px] pl-2 pr-6 text-xs border border-[#20365F] rounded-sm focus:outline-none focus:bg-white"
                  />
                  <Search className="w-3 h-3 absolute right-2 top-1.5 text-gray-400" />
              </div>
          </div>

          {/* Right: Nav Links */}
          <div className="flex items-center gap-4 text-white text-xs font-bold">
              <button onClick={handleGoHome} className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1">
                  <Home className="w-3 h-3" /> Ana Sayfa
              </button>
              <button onClick={handleGoProfile} className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1">
                  <User className="w-3 h-3" /> Profil
              </button>
              <div className="h-4 w-px bg-[#29487d] mx-1" />
              
              {/* Context Switcher */}
              <div className="relative">
                  <button 
                    onClick={() => setIsContextOpen(!isContextOpen)}
                    className="hover:bg-[#4b67a1] px-2 py-1 rounded-sm flex items-center gap-1"
                  >
                      Hesap <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Dropdown */}
                  {isContextOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsContextOpen(false)} />
                        <div className="absolute top-[35px] right-0 w-64 bg-white border border-[#899bc1] shadow-lg z-50 rounded-sm">
                            <div className="p-1">
                                <div className="text-[10px] text-[#999] uppercase px-2 py-1 font-bold border-b border-[#eee]">Hesap Değiştir</div>
                                
                                {/* Personal Account Option */}
                                <button 
                                    onClick={handleGoHome}
                                    className="w-full text-left px-2 py-1.5 hover:bg-[#3b5998] hover:text-white flex items-center gap-2 text-xs font-bold text-[#333]"
                                >
                                    <div className="w-4 h-4 bg-gray-200 border border-gray-300 overflow-hidden">
                                        <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="sm" className="rounded-none" />
                                    </div>
                                    {currentUser?.name} (Kişisel)
                                </button>

                                <div className="border-t border-[#ccc] my-1"></div>
                                <div className="text-[10px] text-[#999] uppercase px-2 py-1 font-bold">Yönetilen Sayfalar</div>

                                {managedOrgs.map(org => (
                                    <button 
                                        key={org.id}
                                        onClick={() => handleContextSwitch(org)}
                                        className={`w-full text-left px-2 py-1.5 flex items-center gap-2 text-xs font-bold ${
                                            activeEntityId === org.id 
                                            ? 'bg-[#d8dfea] text-[#3b5998] cursor-default' 
                                            : 'hover:bg-[#3b5998] hover:text-white text-[#333]'
                                        }`}
                                    >
                                        <div className="w-4 h-4 bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden">
                                            {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3 text-gray-400" />}
                                        </div>
                                        {org.name}
                                    </button>
                                ))}
                                
                                <div className="border-t border-[#ccc] my-1"></div>
                                <button onClick={() => { setIsContextOpen(false); logout(); }} className="w-full text-left px-2 py-1.5 hover:bg-[#3b5998] hover:text-white text-xs text-[#333] flex items-center gap-2">
                                    <LogOut className="w-3 h-3" /> Çıkış Yap
                                </button>
                            </div>
                        </div>
                      </>
                  )}
              </div>
          </div>
      </div>

      {/* 2. ADMIN CONTENT LAYOUT (Sidebar + Main) */}
      <div className="flex flex-1 overflow-hidden">
          {/* Legacy Sidebar */}
          <aside className="w-64 flex-shrink-0 h-full bg-[#f7f7f7] border-r border-[#d8dfea] z-40 overflow-y-auto">
            <Sidebar />
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto relative z-0 scroll-smooth bg-[#eff0f2]">
            <div className="p-4 max-w-5xl mx-auto min-h-[500px]">
               <Outlet />
            </div>
          </main>
      </div>

    </div>
  );
};
