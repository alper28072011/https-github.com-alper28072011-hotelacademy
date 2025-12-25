
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, ArrowRight, Loader2, MapPin, Briefcase, Clock, X, Globe, Users } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { createOrganization, searchOrganizations, getUserPendingRequests, cancelJoinRequest } from '../../services/db';
import { Organization, OrganizationSector, User, JoinRequest } from '../../types';

export const OrganizationLobby: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loginSuccess } = useAuthStore();
  const { startOrganizationSession, loadUserMemberships, myMemberships } = useOrganizationStore();
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

  // Pending Requests State
  const [pendingRequests, setPendingRequests] = useState<(JoinRequest & { orgName?: string })[]>([]);

  useEffect(() => {
      if (currentUser) {
          loadUserMemberships(currentUser.id);
          fetchPendingRequests();
      }
  }, [currentUser]);

  const fetchPendingRequests = async () => {
      if (!currentUser) return;
      const reqs = await getUserPendingRequests(currentUser.id);
      setPendingRequests(reqs);
  };

  const handleCancelRequest = async (id: string) => {
      if (window.confirm("Bu başvuruyu geri çekmek istediğinize emin misiniz?")) {
          const success = await cancelJoinRequest(id);
          if (success) {
              setPendingRequests(prev => prev.filter(r => r.id !== id));
          } else {
              alert("İptal işlemi başarısız.");
          }
      }
  };

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
          await startOrganizationSession(org.id);
          const updatedUser: User = {
              ...currentUser,
              currentOrganizationId: org.id,
              role: 'manager', 
              department: 'management'
          };
          loginSuccess(updatedUser);
          setTimeout(() => {
              navigate('/admin/settings', { state: { isNewOrg: true } });
          }, 100);
      } else {
          setIsCreating(false);
      }
  };

  const handleSelectMembership = async (orgId: string) => {
      if (switchingOrgId) return; 
      setSwitchingOrgId(orgId);
      try {
          const result = await startOrganizationSession(orgId);
          if (result.success) {
              navigate('/admin'); 
          } else {
              setSwitchingOrgId(null);
              alert("Giriş yapılamadı.");
          }
      } catch (error) {
          setSwitchingOrgId(null);
      }
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
    <div className="p-4 w-full max-w-[980px] mx-auto">
        <div className="flex flex-col md:flex-row gap-4">
            
            {/* LEFT SIDEBAR: MY MEMBERSHIPS */}
            <div className="w-full md:w-[240px] shrink-0 space-y-4">
                
                {/* My Groups Box */}
                <div className="bg-white border border-[#d8dfea]">
                    <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-2 font-bold text-[#3b5998] text-xs">
                        Üyeliklerim
                    </div>
                    <div className="p-2 space-y-1">
                        {myMemberships.map(mem => (
                            <button 
                                key={mem.id}
                                onClick={() => handleSelectMembership(mem.organizationId)}
                                disabled={!!switchingOrgId}
                                className={`w-full flex items-center gap-2 p-2 border border-transparent hover:bg-[#eff0f5] text-left transition-colors ${switchingOrgId === mem.organizationId ? 'bg-[#fff9d7]' : ''}`}
                            >
                                <div className="w-6 h-6 bg-[#d8dfea] flex items-center justify-center border border-[#ccc]">
                                    {switchingOrgId === mem.organizationId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Building2 className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-[#3b5998] text-[11px] truncate">
                                        Org {mem.organizationId.substring(0,4)}...
                                    </div>
                                    <div className="text-[9px] text-gray-500 capitalize">{mem.role}</div>
                                </div>
                            </button>
                        ))}
                        {myMemberships.length === 0 && (
                            <div className="p-4 text-center text-gray-400 text-[11px]">Henüz üyelik yok.</div>
                        )}
                    </div>
                </div>

                {/* Pending Requests Box */}
                {pendingRequests.length > 0 && (
                    <div className="bg-white border border-[#dd3c10]">
                        <div className="bg-[#ffebe8] border-b border-[#dd3c10] p-2 font-bold text-[#dd3c10] text-xs flex justify-between">
                            <span>Bekleyenler</span>
                            <span className="bg-white px-1.5 rounded text-[10px]">{pendingRequests.length}</span>
                        </div>
                        <div className="p-2 space-y-2">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="text-[11px] border-b border-[#eee] last:border-0 pb-1">
                                    <div className="font-bold text-[#333] truncate">{req.orgName || 'Yükleniyor...'}</div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-gray-500">{req.requestedRoleTitle}</span>
                                        <button onClick={() => handleCancelRequest(req.id)} className="text-red-600 hover:underline text-[9px]">İptal</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT MAIN: FIND / CREATE */}
            <div className="flex-1 min-w-0">
                
                {/* TABS */}
                <div className="flex items-end border-b border-[#899bc1] h-[29px] mb-4">
                    <button 
                        onClick={() => setActiveTab('FIND')}
                        className={`px-3 py-1.5 text-xs font-bold border-t border-l border-r mr-1 outline-none ${activeTab === 'FIND' ? 'bg-white border-[#899bc1] text-[#333] mb-[-1px] pb-2' : 'bg-[#d8dfea] border-[#d8dfea] text-[#3b5998] hover:bg-[#eff0f5]'}`}
                    >
                        <Search className="w-3 h-3 inline mr-1" /> Kurum Bul
                    </button>
                    <button 
                        onClick={() => setActiveTab('CREATE')}
                        className={`px-3 py-1.5 text-xs font-bold border-t border-l border-r mr-1 outline-none ${activeTab === 'CREATE' ? 'bg-white border-[#899bc1] text-[#333] mb-[-1px] pb-2' : 'bg-[#d8dfea] border-[#d8dfea] text-[#3b5998] hover:bg-[#eff0f5]'}`}
                    >
                        <Plus className="w-3 h-3 inline mr-1" /> Yeni Oluştur
                    </button>
                </div>

                <div className="bg-white border border-[#d8dfea] min-h-[400px]">
                    {activeTab === 'FIND' ? (
                        <div>
                            {/* SEARCH BAR */}
                            <div className="bg-[#f7f7f7] border-b border-[#e9e9e9] p-3 flex gap-2">
                                <label className="text-xs font-bold text-gray-500 pt-1.5">Ara:</label>
                                <div className="flex-1 relative">
                                    <input 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full border border-[#bdc7d8] p-1 text-xs"
                                        placeholder="İsim veya kurum kodu..."
                                    />
                                    {isSearching && <Loader2 className="absolute right-2 top-1.5 w-3 h-3 animate-spin text-gray-400" />}
                                </div>
                            </div>

                            {/* RESULTS */}
                            <div className="p-3">
                                {searchResults.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {searchResults.map(org => (
                                            <div key={org.id} className="flex gap-3 p-2 border border-[#e9e9e9] bg-white hover:bg-[#fff9d7] transition-colors">
                                                <div className="w-16 h-16 bg-[#eee] border border-[#ccc] shrink-0">
                                                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-full h-full p-4 text-gray-300" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between">
                                                        <h3 className="text-sm font-bold text-[#3b5998]">
                                                            <a href={`#/org/${org.id}`} className="hover:underline">{org.name}</a>
                                                        </h3>
                                                        <span className="text-[10px] text-gray-400 font-mono">{org.code}</span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-600 mt-1 flex items-center gap-2">
                                                        <Globe className="w-3 h-3 text-gray-400" /> {org.location || 'Global'}
                                                        <span className="text-gray-300">|</span>
                                                        <Users className="w-3 h-3 text-gray-400" /> {org.memberCount} Üye
                                                    </div>
                                                    <div className="mt-2">
                                                        <button onClick={() => navigate(`/org/${org.id}`)} className="bg-[#f5f6f7] border border-[#d8dfea] text-[#3b5998] px-2 py-0.5 text-[10px] font-bold hover:bg-[#ebedef]">
                                                            Profili Görüntüle
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400 text-xs">
                                        {searchTerm ? 'Sonuç bulunamadı.' : 'Aramak için yazmaya başlayın.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 max-w-lg mx-auto">
                            <h2 className="text-sm font-bold text-[#333] mb-4 border-b border-[#eee] pb-2">Yeni Kurum Kaydı</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Kurum Adı</label>
                                    <input 
                                        value={newOrgName}
                                        onChange={e => setNewOrgName(e.target.value)}
                                        className="w-full border border-[#bdc7d8] p-1.5 text-sm"
                                        placeholder="Örn: Grand Hotel Istanbul"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Sektör</label>
                                    <select 
                                        value={newOrgSector}
                                        onChange={e => setNewOrgSector(e.target.value as any)}
                                        className="w-full border border-[#bdc7d8] p-1.5 text-sm bg-white"
                                    >
                                        {sectors.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                                
                                <div className="bg-[#fff9d7] border border-[#e2c822] p-2 text-[11px] text-[#333]">
                                    <span className="font-bold">Not:</span> Kurum oluşturduğunuzda otomatik olarak Yönetici (Admin) olursunuz.
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={handleCreate}
                                        disabled={!newOrgName || isCreating}
                                        className="bg-[#3b5998] border border-[#29447e] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#2d4373] disabled:opacity-50"
                                    >
                                        {isCreating ? 'Oluşturuluyor...' : 'Kurumu Oluştur'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
