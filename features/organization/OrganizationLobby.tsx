
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Building2, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { createOrganization, findOrganizationByCode, sendJoinRequest, updateUserProfile } from '../../services/db';
import { DepartmentType } from '../../types';

export const OrganizationLobby: React.FC = () => {
  const { currentUser, logout } = useAuthStore();
  const { switchOrganization, fetchMemberships, myMemberships } = useOrganizationStore();
  const [activeTab, setActiveTab] = useState<'JOIN' | 'CREATE'>('JOIN');
  
  // Join State
  const [orgCode, setOrgCode] = useState('');
  const [foundOrg, setFoundOrg] = useState<any>(null);
  const [targetDept, setTargetDept] = useState<DepartmentType>('housekeeping');
  const [isJoining, setIsJoining] = useState(false);

  // Create State
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgLogo, setNewOrgLogo] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
      if (currentUser) {
          fetchMemberships(currentUser.id);
      }
  }, [currentUser]);

  const handleSearch = async () => {
      if (!orgCode) return;
      setIsJoining(true);
      const org = await findOrganizationByCode(orgCode.toUpperCase());
      setFoundOrg(org);
      setIsJoining(false);
  };

  const handleJoinRequest = async () => {
      if (!currentUser || !foundOrg) return;
      setIsJoining(true);
      const success = await sendJoinRequest(currentUser.id, foundOrg.id, targetDept);
      if (success) {
          alert("Katılma isteği gönderildi! Yönetici onayı bekleniyor.");
          setOrgCode('');
          setFoundOrg(null);
      }
      setIsJoining(false);
  };

  const handleCreate = async () => {
      if (!newOrgName || !currentUser) return;
      setIsCreating(true);
      const org = await createOrganization(newOrgName, currentUser, newOrgLogo || 'https://via.placeholder.com/150');
      if (org) {
          await switchOrganization(org.id);
      }
      setIsCreating(false);
  };

  const handleSelectMembership = async (orgId: string) => {
      await switchOrganization(orgId);
      if(currentUser) {
          await updateUserProfile(currentUser.id, { currentOrganizationId: orgId });
      }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-0 w-full h-96 bg-primary rounded-b-[3rem] shadow-2xl" />
        </div>

        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden min-h-[600px] flex flex-col md:flex-row"
        >
            {/* Left: Sidebar / Existing Memberships */}
            <div className="md:w-1/3 bg-gray-50 border-r border-gray-100 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">H</div>
                    <div>
                        <h2 className="font-bold text-gray-800 leading-tight">Hotel Academy</h2>
                        <p className="text-xs text-gray-400">Hub Access</p>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Otellerim</h3>
                
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {myMemberships.map(mem => (
                        <button 
                            key={mem.id}
                            onClick={() => handleSelectMembership(mem.organizationId)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-accent hover:shadow-md transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-colors">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate text-sm">Organization {mem.organizationId.substring(0,4)}</div>
                                <div className="text-xs text-gray-500 capitalize">{mem.role}</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-accent" />
                        </button>
                    ))}
                    
                    {myMemberships.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            Henüz bir otele üye değilsiniz.
                        </div>
                    )}
                </div>

                <button onClick={logout} className="mt-4 flex items-center gap-2 text-red-500 text-sm font-bold hover:bg-red-50 p-3 rounded-xl transition-colors">
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                </button>
            </div>

            {/* Right: Actions */}
            <div className="flex-1 p-8 md:p-12 flex flex-col">
                <div className="flex gap-4 mb-8">
                    <button 
                        onClick={() => setActiveTab('JOIN')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'JOIN' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        Otele Katıl
                    </button>
                    <button 
                        onClick={() => setActiveTab('CREATE')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'CREATE' ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        Otel Kur
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'JOIN' ? (
                        <motion.div 
                            key="join" 
                            initial={{ opacity: 0, x: 20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col"
                        >
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Mevcut Bir Otele Katıl</h2>
                            <p className="text-gray-500 text-sm mb-6">Yöneticinizin paylaştığı Otel Kodunu giriniz.</p>

                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <input 
                                    value={orgCode}
                                    onChange={(e) => setOrgCode(e.target.value)}
                                    placeholder="Otel Kodu (Örn: RUB1234)" 
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-mono font-bold text-gray-800 focus:border-accent focus:outline-none transition-all uppercase"
                                />
                                <button 
                                    onClick={handleSearch}
                                    disabled={!orgCode}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-colors"
                                >
                                    Ara
                                </button>
                            </div>

                            {foundOrg && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-100 p-6 rounded-3xl mb-4 text-center">
                                    <div className="w-16 h-16 mx-auto bg-white rounded-full shadow-md flex items-center justify-center mb-3">
                                        <Building2 className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="font-bold text-xl text-green-900">{foundOrg.name}</h3>
                                    <p className="text-green-700 text-xs mb-4">Kodu: {foundOrg.code}</p>
                                    
                                    <div className="text-left mb-4">
                                        <label className="text-xs font-bold text-green-800 uppercase block mb-2">Departman Seç</label>
                                        <select 
                                            value={targetDept}
                                            onChange={(e) => setTargetDept(e.target.value as any)}
                                            className="w-full p-3 rounded-xl border border-green-200 bg-white text-sm font-bold"
                                        >
                                            <option value="housekeeping">Housekeeping</option>
                                            <option value="kitchen">Kitchen</option>
                                            <option value="front_office">Front Office</option>
                                        </select>
                                    </div>

                                    <button 
                                        onClick={handleJoinRequest}
                                        disabled={isJoining}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-600/20"
                                    >
                                        {isJoining ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'İstek Gönder'}
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="create" 
                            initial={{ opacity: 0, x: 20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col"
                        >
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Yeni Otel Kur</h2>
                            <p className="text-gray-500 text-sm mb-6">Kendi ekibini ve eğitimlerini yönetmeye başla.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">İşletme Adı</label>
                                    <input 
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        placeholder="Örn: Grand Hotel"
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-4 font-bold text-gray-800 focus:border-accent focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Logo URL (Opsiyonel)</label>
                                    <input 
                                        value={newOrgLogo}
                                        onChange={(e) => setNewOrgLogo(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-4 text-sm text-gray-800 focus:border-accent focus:outline-none transition-all"
                                    />
                                </div>

                                <button 
                                    onClick={handleCreate}
                                    disabled={!newOrgName || isCreating}
                                    className="w-full bg-primary hover:bg-primary-light text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2 mt-4"
                                >
                                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Oteli Oluştur</>}
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
