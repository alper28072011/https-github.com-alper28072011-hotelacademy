
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, ArrowRight, Loader2, LogOut, MapPin, Briefcase } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { createOrganization, searchOrganizations } from '../../services/db';
import { Organization, OrganizationSector } from '../../types';

export const OrganizationLobby: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { switchOrganization, fetchMemberships, myMemberships } = useOrganizationStore();
  const [activeTab, setActiveTab] = useState<'FIND' | 'CREATE'>('FIND');
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Loading States
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  
  // Creation State
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSector, setNewOrgSector] = useState<OrganizationSector>('tourism');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
      if (currentUser) {
          fetchMemberships(currentUser.id);
      }
  }, [currentUser]);

  // Debounced Search
  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (searchTerm.length > 1) {
              setIsSearching(true);
              const results = await searchOrganizations(searchTerm);
              setSearchResults(results);
              setIsSearching(false);
          } else {
              setSearchResults([]);
          }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleCreate = async () => {
      if (!newOrgName || !currentUser) return;
      setIsCreating(true);
      const org = await createOrganization(newOrgName, newOrgSector, currentUser);
      if (org) {
          // Explicit await to ensure state is synced before navigation
          await switchOrganization(org.id);
          
          // SMART REDIRECT: Go to Admin Panel
          navigate('/admin', { replace: true });
      }
      setIsCreating(false);
  };

  const handleSelectMembership = async (orgId: string) => {
      if (switchingOrgId) return; // Prevent double click
      setSwitchingOrgId(orgId);
      
      try {
          // Critical: Wait for this to complete. It updates DB and Local User State.
          const success = await switchOrganization(orgId);
          if (success) {
              // Only navigate if successful
              navigate('/');
          } else {
              setSwitchingOrgId(null);
              alert("Giriş yapılamadı. Lütfen tekrar deneyin.");
          }
      } catch (error) {
          console.error("Lobby Selection Error:", error);
          setSwitchingOrgId(null);
          alert("Bir hata oluştu.");
      }
  };

  const goToPublicPage = (orgId: string) => {
      navigate(`/hotel/${orgId}`);
  };

  const sectors: { id: OrganizationSector, label: string }[] = [
      { id: 'tourism', label: 'Turizm & Otelcilik' },
      { id: 'technology', label: 'Teknoloji & Yazılım' },
      { id: 'health', label: 'Sağlık Hizmetleri' },
      { id: 'education', label: 'Eğitim & Akademi' },
      { id: 'retail', label: 'Perakende & Mağazacılık' },
      { id: 'finance', label: 'Finans & Danışmanlık' },
      { id: 'other', label: 'Diğer' },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-0 w-full h-96 bg-primary rounded-b-[3rem] shadow-2xl" />
        </div>

        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative z-10 w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden min-h-[600px] flex flex-col md:flex-row transition-all duration-300 ${switchingOrgId ? 'scale-95 opacity-80 blur-[1px]' : ''}`}
        >
            {/* Sidebar */}
            <div className="md:w-1/3 bg-gray-50 border-r border-gray-100 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">H</div>
                    <div>
                        <h2 className="font-bold text-gray-800 leading-tight">Hotel Academy</h2>
                        <p className="text-xs text-gray-400">Network Hub</p>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Üyeliklerim</h3>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {myMemberships.map(mem => (
                        <button 
                            key={mem.id}
                            onClick={() => handleSelectMembership(mem.organizationId)}
                            disabled={!!switchingOrgId}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl border shadow-sm transition-all group relative overflow-hidden ${
                                switchingOrgId === mem.organizationId 
                                ? 'bg-green-50 border-green-500 shadow-green-200 ring-2 ring-green-200' 
                                : 'bg-white border-gray-100 hover:border-accent hover:shadow-md'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                {switchingOrgId === mem.organizationId ? <Loader2 className="w-5 h-5 animate-spin text-green-600" /> : <Building2 className="w-5 h-5 text-gray-500" />}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate text-sm">Org {mem.organizationId.substring(0,4)}...</div>
                                <div className="text-xs text-gray-500 capitalize">{mem.role}</div>
                            </div>
                            {switchingOrgId !== mem.organizationId && <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-accent" />}
                        </button>
                    ))}
                    {myMemberships.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">Henüz bir kuruma üye değilsiniz.</div>}
                </div>

                <button onClick={logout} className="mt-4 flex items-center gap-2 text-red-500 text-sm font-bold hover:bg-red-50 p-3 rounded-xl transition-colors">
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-8 md:p-12 flex flex-col">
                <div className="flex gap-4 mb-8">
                    <button onClick={() => setActiveTab('FIND')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'FIND' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Kurum Bul</button>
                    <button onClick={() => setActiveTab('CREATE')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'CREATE' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Kurum Oluştur</button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'FIND' ? (
                        <motion.div key="find" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Çalışacağın Yeri Bul</h2>
                            <p className="text-gray-500 text-sm mb-6">İsme veya koda göre arama yap.</p>

                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Kurum Adı Ara..." 
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-800 focus:border-accent focus:outline-none transition-all"
                                />
                                {isSearching && <Loader2 className="absolute right-4 top-4 w-5 h-5 animate-spin text-accent" />}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {searchResults.map(org => (
                                    <div key={org.id} onClick={() => goToPublicPage(org.id)} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-primary cursor-pointer transition-all hover:shadow-lg group bg-white">
                                        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                            {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-full h-full p-4 text-gray-300" />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-lg group-hover:text-primary transition-colors">{org.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <MapPin className="w-3 h-3" /> {org.location || 'Konum belirtilmedi'}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary" />
                                    </div>
                                ))}
                                {searchTerm && searchResults.length === 0 && !isSearching && (
                                    <div className="text-center text-gray-400 py-10">Sonuç bulunamadı.</div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Kendi Yapını Kur</h2>
                            <p className="text-gray-500 text-sm mb-6">Yönetici paneline erişim sağla.</p>
                            <div className="space-y-4">
                                <input 
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                    placeholder="İşletme/Kurum Adı"
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-4 font-bold text-gray-800 focus:border-accent focus:outline-none"
                                />
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Faaliyet Sektörü</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                        <select 
                                            value={newOrgSector}
                                            onChange={(e) => setNewOrgSector(e.target.value as OrganizationSector)}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-800 focus:border-accent focus:outline-none appearance-none"
                                        >
                                            {sectors.map(s => (
                                                <option key={s.id} value={s.id}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleCreate}
                                    disabled={!newOrgName || isCreating}
                                    className="w-full bg-primary hover:bg-primary-light text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2"
                                >
                                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Oluştur</>}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    </div>
  );
};
