
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, ArrowRight, Loader2, Globe, Users } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { createOrganization, searchOrganizations, getUserPendingRequests, cancelJoinRequest } from '../../services/db';
import { Organization, OrganizationSector, User, JoinRequest } from '../../types';

export const OrganizationLobby: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, loginSuccess } = useAuthStore();
  const { startOrganizationSession, loadUserMemberships, myMemberships } = useOrganizationStore();
  const [activeTab, setActiveTab] = useState<'MY_GROUPS' | 'FIND'>('MY_GROUPS');
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Create State
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  useEffect(() => {
      if (currentUser) {
          loadUserMemberships(currentUser.id);
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

  const handleSelectMembership = async (orgId: string) => {
      const result = await startOrganizationSession(orgId);
      if (result.success) navigate('/admin'); 
  };

  const handleCreate = async () => {
      if (!newOrgName || !currentUser) return;
      setIsCreating(true);
      const org = await createOrganization(newOrgName, 'tourism', currentUser);
      if (org) {
          await startOrganizationSession(org.id);
          const updatedUser: User = { ...currentUser, currentOrganizationId: org.id, role: 'manager' };
          loginSuccess(updatedUser);
          navigate('/admin/settings');
      }
      setIsCreating(false);
  };

  return (
    <div className="flex flex-col gap-4">
        
        {/* TABS HEADER */}
        <div className="flex items-end border-b border-[#899bc1] h-[29px] pl-2">
            <button 
                onClick={() => setActiveTab('MY_GROUPS')}
                className={`px-3 py-1.5 text-[11px] font-bold border-t border-l border-r mr-1 focus:outline-none ${activeTab === 'MY_GROUPS' ? 'bg-white border-[#899bc1] text-[#333] mb-[-1px] pb-2' : 'bg-[#d8dfea] border-[#d8dfea] text-[#3b5998] hover:bg-[#eff0f5]'}`}
            >
                Gruplarım
            </button>
            <button 
                onClick={() => setActiveTab('FIND')}
                className={`px-3 py-1.5 text-[11px] font-bold border-t border-l border-r mr-1 focus:outline-none ${activeTab === 'FIND' ? 'bg-white border-[#899bc1] text-[#333] mb-[-1px] pb-2' : 'bg-[#d8dfea] border-[#d8dfea] text-[#3b5998] hover:bg-[#eff0f5]'}`}
            >
                Grup Bul / Oluştur
            </button>
        </div>

        {/* CONTENT BOX */}
        <div className="bg-white border border-[#bdc7d8] min-h-[400px] p-3">
            
            {activeTab === 'MY_GROUPS' && (
                <div className="space-y-2">
                    {myMemberships.map(mem => (
                        <div key={mem.id} className="flex items-center gap-3 p-2 border border-[#e9e9e9] hover:bg-[#fff9d7] transition-colors group">
                            <div className="w-12 h-12 bg-[#eee] border border-[#ccc] flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[13px] font-bold text-[#3b5998] cursor-pointer hover:underline" onClick={() => handleSelectMembership(mem.organizationId)}>
                                    Organizasyon {mem.organizationId.substring(0,4)}...
                                </div>
                                <div className="text-[10px] text-gray-500">Rol: {mem.role}</div>
                            </div>
                            <button onClick={() => handleSelectMembership(mem.organizationId)} className="bg-[#f5f6f7] border border-[#ccc] text-[#333] text-[10px] font-bold px-2 py-1 hover:bg-[#e9e9e9]">
                                Yönet
                            </button>
                        </div>
                    ))}
                    {myMemberships.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-xs">Henüz üyelik yok.</div>
                    )}
                </div>
            )}

            {activeTab === 'FIND' && (
                <div className="space-y-6">
                    {/* Search Section */}
                    <div>
                        <h4 className="text-[11px] font-bold text-[#3b5998] mb-2 border-b border-[#eee] pb-1">Grup Ara</h4>
                        <div className="flex gap-2 mb-2">
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="flex-1 border border-[#bdc7d8] p-1 text-[13px] outline-none focus:border-[#3b5998]"
                                placeholder="İsim veya kod..."
                            />
                            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-gray-400 mt-1" />}
                        </div>
                        <div className="space-y-1">
                            {searchResults.map(org => (
                                <div key={org.id} className="flex gap-2 p-2 bg-[#f7f7f7] border border-[#e9e9e9]">
                                    <div className="w-8 h-8 bg-white border border-[#ccc] shrink-0 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-gray-300" />
                                    </div>
                                    <div className="flex-1">
                                        <a href={`#/org/${org.id}`} className="text-[11px] font-bold text-[#3b5998] hover:underline block">{org.name}</a>
                                        <div className="text-[9px] text-gray-500">{org.memberCount} Üye</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Create Section */}
                    <div className="bg-[#eff0f5] border border-[#d8dfea] p-3">
                        <h4 className="text-[11px] font-bold text-[#333] mb-2">Yeni Grup Oluştur</h4>
                        <div className="flex gap-2">
                            <input 
                                value={newOrgName}
                                onChange={e => setNewOrgName(e.target.value)}
                                className="flex-1 border border-[#bdc7d8] p-1 text-[13px] outline-none"
                                placeholder="Grup Adı..."
                            />
                            <button 
                                onClick={handleCreate}
                                disabled={!newOrgName || isCreating}
                                className="bg-[#69a74e] border border-[#3b6e22] text-white px-3 py-1 text-[11px] font-bold hover:bg-[#5b9342]"
                            >
                                {isCreating ? '...' : 'Oluştur'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
