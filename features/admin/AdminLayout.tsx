
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useContextStore } from '../../stores/useContextStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { Sidebar } from '../../components/layout/Sidebar';
import { Loader2, Home, User, ChevronDown, Search, LogOut, Building2, LayoutDashboard } from 'lucide-react';
import { getUserManagedPages } from '../../services/organizationService';
import { Organization } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { motion } from 'framer-motion';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { contextType, activeEntityId, isHydrated, switchToPersonal } = useContextStore();
  const { currentUser, logout } = useAuthStore();
  const { startOrganizationSession, currentOrganization } = useOrganizationStore();

  const [isContextOpen, setIsContextOpen] = useState(false);
  const [managedOrgs, setManagedOrgs] = useState<Organization[]>([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');

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
    <div key={resetKey} className="min-h-screen bg-[#eff0f2] font-sans text-[#1c1e21] overflow-y-scroll">
      
      {/* 1. GLOBAL HEADER (Fixed & Centered) */}
      <div className="bg-[#1c1e21] border-b border-[#333] h-[50px] fixed top-0 w-full z-50 shadow-md flex justify-center">
          <div className="w-[980px] flex justify-between items-center px-2 md:px-0 h-full">
              
              {/* Left: Logo */}
              <div className="flex items-center gap-2 shrink-0 w-[200px]">
                  <div onClick={handleGoHome} className="cursor-pointer flex items-center gap-2 group">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                      <span className="text-white font-bold text-lg tracking-tight group-hover:opacity-80 transition-opacity">
                          Corbit<span className="font-normal opacity-70 text-sm ml-1">Admin</span>
                      </span>
                  </div>
              </div>
              
              {/* Center: Global Search */}
              <div className="flex-1 max-w-xl mx-4 relative h-full flex items-center">
                  <div className="w-full relative">
                      <input 
                          value={adminSearchTerm}
                          onChange={(e) => setAdminSearchTerm(e.target.value)}
                          placeholder="Yönetim panelinde ara..." 
                          className="w-full h-[30px] pl-8 pr-4 text-[13px] border-none rounded-full bg-[#333] text-white placeholder-gray-500 focus:bg-white focus:text-[#1c1e21] focus:placeholder-gray-400 transition-all outline-none shadow-inner"
                      />
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-gray-500 pointer-events-none" />
                  </div>
              </div>

              {/* Right: Nav Links */}
              <div className="flex items-center justify-end gap-3 w-[200px] text-white text-[12px] font-bold shrink-0">
                  <button onClick={handleGoHome} className="hover:bg-white/10 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors">
                      <Home className="w-3.5 h-3.5" /> Ana Sayfa
                  </button>
                  <div className="h-4 w-px bg-[#333] mx-1" />
                  
                  {/* Context Switcher */}
                  <div className="relative">
                      <button 
                        onClick={() => setIsContextOpen(!isContextOpen)}
                        className="hover:bg-white/10 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                      >
                          Hesap <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {isContextOpen && (
                          <>
                            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsContextOpen(false)} />
                            <div className="absolute top-10 right-0 w-60 bg-white border border-[#ddd] shadow-xl z-50 rounded-lg overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                                <div className="py-2">
                                    <div className="text-[10px] text-gray-500 uppercase px-3 py-1 font-bold">Hesap Değiştir</div>
                                    
                                    <button 
                                        onClick={handleGoHome}
                                        className="w-full text-left px-3 py-2 hover:bg-[#3b5998] hover:text-white flex items-center gap-3 text-[13px] font-bold text-[#1c1e21]"
                                    >
                                        <div className="w-5 h-5 bg-gray-200 rounded-full border border-gray-300 overflow-hidden flex items-center justify-center">
                                            <Avatar src={currentUser?.avatar} alt={currentUser?.name || ''} size="sm" />
                                        </div>
                                        {currentUser?.name} (Kişisel)
                                    </button>

                                    <div className="border-t border-[#eee] my-1"></div>
                                    <div className="text-[10px] text-gray-500 uppercase px-3 py-1 font-bold">Yönetilen Sayfalar</div>

                                    {managedOrgs.map(org => (
                                        <button 
                                            key={org.id}
                                            onClick={() => handleContextSwitch(org)}
                                            className={`w-full text-left px-3 py-2 flex items-center gap-3 text-[13px] font-bold ${
                                                activeEntityId === org.id 
                                                ? 'bg-[#eff0f5] text-[#3b5998] cursor-default' 
                                                : 'hover:bg-[#3b5998] hover:text-white text-[#1c1e21]'
                                            }`}
                                        >
                                            <div className="w-5 h-5 bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden rounded-full">
                                                {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3 text-gray-400" />}
                                            </div>
                                            {org.name}
                                        </button>
                                    ))}
                                    
                                    <div className="border-t border-[#eee] my-1"></div>
                                    <button onClick={() => { setIsContextOpen(false); logout(); }} className="w-full text-left px-3 py-2 hover:bg-[#eff0f5] text-[13px] text-[#1c1e21] flex items-center gap-2">
                                        <LogOut className="w-3.5 h-3.5" /> Çıkış Yap
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
      <div className="w-[980px] mx-auto mt-[65px] grid grid-cols-[180px_1fr] gap-4 pb-20">
          
          {/* COL 1: LEFT SIDEBAR (Contextual Navigation) */}
          <div className="flex flex-col gap-4 sticky top-[65px] h-fit">
              
              {/* Org Identity Card */}
              {currentOrganization && (
                  <div className="flex items-center gap-3 mb-2 p-2 bg-white rounded-lg border border-[#ddd] shadow-sm">
                      <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-md shrink-0 flex items-center justify-center overflow-hidden">
                          {currentOrganization.logoUrl ? (
                              <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" />
                          ) : (
                              <div className="text-gray-400 font-bold">{currentOrganization.name[0]}</div>
                          )}
                      </div>
                      <div className="leading-tight overflow-hidden">
                          <div className="font-bold text-[#1c1e21] text-[12px] truncate">{currentOrganization.name}</div>
                          <div className="text-[10px] text-gray-500">Yönetim Paneli</div>
                      </div>
                  </div>
              )}

              {/* Navigation Links */}
              <Sidebar />

          </div>

          {/* COL 2: MAIN ADMIN CONTENT */}
          <div className="min-w-0">
             {/* Smooth Transition Wrapper */}
             <motion.div
                key={window.location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
             >
                <Outlet />
             </motion.div>
          </div>

      </div>

    </div>
  );
};
