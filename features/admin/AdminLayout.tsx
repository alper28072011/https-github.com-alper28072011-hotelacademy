
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useContextStore } from '../../stores/useContextStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { Sidebar } from '../../components/layout/Sidebar';
import { Loader2, Home, User, ChevronDown, Search, LogOut, Building2, LayoutDashboard, Menu } from 'lucide-react';
import { getUserManagedPages } from '../../services/organizationService';
import { Organization } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { contextType, activeEntityId, isHydrated, switchToPersonal } = useContextStore();
  const { currentUser, logout } = useAuthStore();
  const { startOrganizationSession, currentOrganization, activeRole } = useOrganizationStore();

  const [isContextOpen, setIsContextOpen] = useState(false);
  const [managedOrgs, setManagedOrgs] = useState<Organization[]>([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. Security Check & Hydration
  useEffect(() => {
    if (isHydrated && contextType === 'PERSONAL') {
      navigate('/');
      return;
    }
    if (isHydrated && contextType === 'ORGANIZATION' && activeRole === 'MEMBER') {
        navigate('/');
    }
  }, [contextType, isHydrated, activeRole, navigate]);

  useEffect(() => {
      const loadOrgs = async () => {
          if (currentUser) {
              const orgs = await getUserManagedPages(currentUser.id);
              setManagedOrgs(orgs);
          }
      };
      loadOrgs();
  }, [currentUser]);

  const handleGoHome = () => {
      if (currentUser) {
          switchToPersonal(currentUser.id, currentUser.name, currentUser.avatar);
          navigate('/');
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
      
      {/* 1. GLOBAL HEADER */}
      <div className="bg-[#1c1e21] border-b border-[#333] h-[48px] sticky top-0 w-full z-50 shadow-sm flex justify-center px-2">
          <div className="w-full max-w-[980px] grid grid-cols-[auto_1fr_auto] md:grid-cols-[180px_1fr_200px] gap-3 h-full items-center">
              
              {/* Left: Logo & Mobile Menu */}
              <div className="flex items-center gap-3">
                  <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-gray-400">
                      <Menu className="w-5 h-5" />
                  </button>
                  <div onClick={handleGoHome} className="cursor-pointer flex items-center gap-2 group">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                      <span className="text-white font-bold text-lg tracking-tight hidden md:inline">
                          Corbit<span className="font-normal opacity-70 text-sm ml-1">Admin</span>
                      </span>
                  </div>
              </div>
              
              {/* Center: Search */}
              <div className="flex items-center justify-center w-full px-2">
                  <div className="w-full max-w-[400px] relative">
                      <input 
                          value={adminSearchTerm}
                          onChange={(e) => setAdminSearchTerm(e.target.value)}
                          placeholder="Yönetim..." 
                          className="w-full h-[28px] pl-8 pr-4 text-[12px] border border-[#333] rounded-[2px] bg-[#333] text-white placeholder-gray-500 focus:bg-white focus:text-[#1c1e21] focus:placeholder-gray-400 transition-all outline-none shadow-inner block leading-normal"
                      />
                      <Search 
                        className="w-3.5 h-3.5 absolute left-2.5 text-gray-500 pointer-events-none" 
                        style={{ top: '50%', transform: 'translateY(-50%)' }} 
                      />
                  </div>
              </div>

              {/* Right: Nav */}
              <div className="flex items-center justify-end gap-3">
                  <button onClick={handleGoHome} className="text-white text-[11px] font-bold hover:opacity-80 hidden md:flex items-center gap-1">
                      <Home className="w-3.5 h-3.5" /> Ana Sayfa
                  </button>
                  
                  <div className="relative">
                      <button 
                        onClick={() => setIsContextOpen(!isContextOpen)}
                        className="text-white text-[11px] font-bold hover:opacity-80 flex items-center gap-1"
                      >
                          <span className="hidden md:inline">Hesap</span> <ChevronDown className="w-4 h-4" />
                      </button>

                      {isContextOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsContextOpen(false)} />
                            <div className="absolute top-8 right-0 w-64 bg-white border border-[#899bc1] shadow-xl z-50 rounded-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                                <div className="py-1">
                                    <div className="text-[9px] text-[#999] uppercase px-2 py-1 font-bold border-b border-[#eee]">Yönetilen Sayfalar</div>
                                    {managedOrgs.map(org => (
                                        <button 
                                            key={org.id}
                                            onClick={() => handleContextSwitch(org)}
                                            className={`w-full text-left px-2 py-2 flex items-center gap-2 text-[11px] font-bold ${
                                                activeEntityId === org.id 
                                                ? 'bg-[#eff0f5] text-[#3b5998]' 
                                                : 'hover:bg-[#3b5998] hover:text-white text-[#333]'
                                            }`}
                                        >
                                            <div className="w-4 h-4 bg-gray-200 flex items-center justify-center overflow-hidden">
                                                {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3 text-gray-400" />}
                                            </div>
                                            {org.name}
                                        </button>
                                    ))}
                                    <div className="border-t border-[#eee] my-1"></div>
                                    <button onClick={() => { setIsContextOpen(false); logout(); }} className="w-full text-left px-2 py-2 hover:bg-[#3b5998] hover:text-white text-[11px] text-[#333] flex items-center gap-2">
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

      {/* 2. ADMIN GRID CONTAINER */}
      <div className="w-full max-w-[980px] mx-auto mt-3 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 pb-20 px-2 md:px-0">
          
          {/* MOBILE MENU DRAWER */}
          <AnimatePresence>
              {isMobileMenuOpen && (
                  <motion.div 
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="md:hidden overflow-hidden bg-white border border-[#ccc] rounded-md mb-2"
                  >
                      <div className="p-2">
                          <Sidebar />
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>

          {/* COL 1: LEFT SIDEBAR (Desktop) */}
          <div className="hidden md:flex flex-col gap-4 sticky top-[60px] h-fit">
              {currentOrganization && (
                  <div className="flex items-center gap-2 mb-1 p-2 bg-white rounded-md border border-[#ddd] shadow-sm">
                      <div className="w-8 h-8 bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center overflow-hidden">
                          {currentOrganization.logoUrl ? (
                              <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" />
                          ) : (
                              <div className="text-gray-400 font-bold text-xs">{currentOrganization.name[0]}</div>
                          )}
                      </div>
                      <div className="leading-tight overflow-hidden">
                          <div className="font-bold text-[#1c1e21] text-[11px] truncate">{currentOrganization.name}</div>
                          <div className="text-[9px] text-gray-500">Yönetim Paneli</div>
                      </div>
                  </div>
              )}
              <Sidebar />
          </div>

          {/* COL 2: MAIN ADMIN CONTENT */}
          <div className="min-w-0">
             <motion.div
                key={window.location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
             >
                <Outlet />
             </motion.div>
          </div>

      </div>
    </div>
  );
};
