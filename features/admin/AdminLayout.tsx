
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
  const { contextType, activeEntityId, isHydrated, switchToPersonal } = useContextStore();
  const { currentUser, logout } = useAuthStore();
  const { startOrganizationSession, isSwitching, currentOrganization } = useOrganizationStore();

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
      if (target.id === activeEntityId) {
          setIsContextOpen(false);
          return;
      }
      setIsContextOpen(false);
      const result = await startOrganizationSession(target.id);
      if (result.success) {
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
    <div key={resetKey} className="min-h-screen bg-[#eff0f2] font-sans text-[#333] overflow-y-scroll">
      
      {/* 1. GLOBAL BLUE HEADER (Fixed) */}
      <div className="bg-[#3b5998] border-b border-[#29487d] h-[42px] fixed top-0 w-full z-50 shadow-sm flex justify-center">
          <div className="w-[980px] flex justify-between items-center px-0">
              
              {/* Left: Logo & Search */}
              <div className="flex items-center gap-2">
                  <div onClick={handleGoHome} className="cursor-pointer bg-[#3b5998] p-1">
                      <span className="text-white font-bold text-2xl tracking-tighter hover:opacity-80">facebook<span className="font-normal opacity-70 text-sm ml-0.5">pro</span></span>
                  </div>
                  
                  {/* Minimal Search Bar */}
                  <div className="relative ml-2">
                      <input 
                          placeholder="Yönetim panelinde ara..." 
                          className="h-[26px] w-[300px] pl-2 pr-6 text-[11px] border border-[#20365F] rounded-sm focus:outline-none focus:bg-white"
                      />
                      <Search className="w-3 h-3 absolute right-2 top-2 text-gray-400" />
                  </div>
              </div>

              {/* Right: Nav Links */}
              <div className="flex items-center gap-4 text-white text-[11px] font-bold">
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

                      {isContextOpen && (
                          <>
                            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsContextOpen(false)} />
                            <div className="absolute top-8 right-0 w-64 bg-white border border-[#899bc1] shadow-xl z-50 rounded-sm">
                                <div className="py-1">
                                    <div className="text-[10px] text-[#999] uppercase px-2 py-1 font-bold border-b border-[#eee]">Hesap Değiştir</div>
                                    
                                    <button 
                                        onClick={handleGoHome}
                                        className="w-full text-left px-2 py-1.5 hover:bg-[#3b5998] hover:text-white flex items-center gap-2 text-[11px] font-bold text-[#333]"
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
                                            className={`w-full text-left px-2 py-1.5 flex items-center gap-2 text-[11px] font-bold ${
                                                activeEntityId === org.id 
                                                ? 'bg-[#d8dfea] text-[#333] cursor-default' 
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
                                    <button onClick={() => { setIsContextOpen(false); logout(); }} className="w-full text-left px-2 py-1.5 hover:bg-[#3b5998] hover:text-white text-[11px] text-[#333] flex items-center gap-2">
                                        <LogOut className="w-3 h-3" /> Çıkış Yap
                                    </button>
                                </div>
                            </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* 2. ADMIN GRID CONTAINER (Fixed 980px, 2 Columns) */}
      <div className="w-[980px] mx-auto mt-[54px] grid grid-cols-[180px_1fr] gap-3 pb-20">
          
          {/* COL 1: LEFT SIDEBAR (Contextual Navigation) */}
          <div className="flex flex-col gap-4">
              
              {/* Org Identity Card (Tiny) */}
              {currentOrganization && (
                  <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-white border border-[#ccc] p-0.5 shrink-0">
                          {currentOrganization.logoUrl ? (
                              <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full bg-[#eee] flex items-center justify-center text-gray-400 font-bold">{currentOrganization.name[0]}</div>
                          )}
                      </div>
                      <div className="leading-tight overflow-hidden">
                          <div className="font-bold text-[#333] text-[11px] truncate">{currentOrganization.name}</div>
                          <div className="text-[9px] text-gray-500">Yönetim Paneli</div>
                      </div>
                  </div>
              )}

              {/* Navigation Links */}
              <Sidebar />

          </div>

          {/* COL 2: MAIN ADMIN CONTENT */}
          <div className="min-w-0">
             <Outlet />
          </div>

      </div>

    </div>
  );
};
