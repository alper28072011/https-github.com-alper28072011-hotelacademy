
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Network, Settings, Search, Plus, Loader2, 
    Filter, Download, Trash2, UserPlus, ArrowRight, CornerDownRight 
} from 'lucide-react';
import { User, Position, DepartmentType } from '../../types';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { getUsersByDepartment, searchUserByPhone, inviteUserToOrg } from '../../services/db';
import { getOrgPositions, createPosition, assignUserToPosition, removeUserFromPosition, deletePosition } from '../../services/organizationService';
import { OrgChartBuilder } from '../organization/OrgChartBuilder';
import { useNavigate } from 'react-router-dom';

export const OrganizationManager: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  
  // -- GLOBAL STATE --
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'CHART'>('DIRECTORY');
  const [loading, setLoading] = useState(true);
  
  // -- DATA --
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  
  // -- UI STATE --
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  
  // -- MODAL STATES --
  const [isAddPosModalOpen, setIsAddPosModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // -- SELECTED ITEMS --
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [targetPosId, setTargetPosId] = useState<string | null>(null);
  
  // -- FORM DATA --
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosDept, setNewPosDept] = useState<DepartmentType>('front_office');
  const [invitePhone, setInvitePhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
      loadAllData();
  }, [currentOrganization]);

  const loadAllData = async () => {
      if (!currentOrganization) return;
      setLoading(true);
      
      // 1. Fetch Positions
      const posData = await getOrgPositions(currentOrganization.id);
      
      // 2. Fetch Users (Optimized: Fetch by dept then merge)
      const depts = currentOrganization.settings.customDepartments || ['housekeeping', 'kitchen', 'front_office', 'management'];
      let allUsers: User[] = [];
      for (const d of depts) {
          const u = await getUsersByDepartment(d, currentOrganization.id);
          allUsers = [...allUsers, ...u];
      }
      // Deduplicate
      const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());
      
      setPositions(posData);
      setUsers(uniqueUsers);
      setLoading(false);
  };

  // --- HANDLERS: CHART ---

  const handleAddChild = (parentId: string) => {
      setTargetParentId(parentId || null);
      setIsAddPosModalOpen(true);
  };

  const handleCreatePosition = async () => {
      if (!currentOrganization || !newPosTitle) return;
      const newPos: Omit<Position, 'id'> = {
          organizationId: currentOrganization.id,
          title: newPosTitle,
          departmentId: newPosDept,
          parentId: targetParentId,
          occupantId: null,
          level: 0,
          isOpen: true
      };
      const id = await createPosition(newPos);
      if (id) {
          setPositions([...positions, { ...newPos, id }]);
          setIsAddPosModalOpen(false);
          setNewPosTitle('');
      }
  };

  const handleDeletePosition = async (posId: string) => {
      const hasChildren = positions.some(p => p.parentId === posId);
      if (hasChildren) {
          alert("Alt pozisyonları olan bir kutuyu silemezsiniz. Önce alt dalları silin veya taşıyın.");
          return;
      }
      if (window.confirm("Bu pozisyonu silmek istediğinize emin misiniz?")) {
          await deletePosition(posId);
          setPositions(prev => prev.filter(p => p.id !== posId));
      }
  };

  const handleOpenAssign = (posId: string) => {
      setTargetPosId(posId);
      setIsAssignModalOpen(true);
  };

  const handleAssignUser = async (userId: string) => {
      if (!currentOrganization || !targetPosId) return;
      
      const success = await assignUserToPosition(currentOrganization.id, targetPosId, userId);
      if (success) {
          // Optimistic Update
          setPositions(prev => prev.map(p => p.id === targetPosId ? { ...p, occupantId: userId } : p));
          // If the user was in another position, clear that one visually too
          setPositions(prev => prev.map(p => (p.occupantId === userId && p.id !== targetPosId) ? { ...p, occupantId: null } : p));
          
          setIsAssignModalOpen(false);
          // Reload full data to sync User profile updates
          loadAllData();
      }
  };

  const handleRemoveUser = async (posId: string) => {
      if (!currentOrganization) return;
      if (window.confirm("Koltuk boşaltılsın mı?")) {
          await removeUserFromPosition(posId, currentOrganization.id);
          setPositions(prev => prev.map(p => p.id === posId ? { ...p, occupantId: null } : p));
          loadAllData();
      }
  };

  // --- HANDLERS: DIRECTORY ---
  
  const handleUserSearch = async () => {
      if (!invitePhone) return;
      let clean = invitePhone.replace(/\s/g, '');
      if (!clean.startsWith('+')) clean = '+90' + clean;
      const u = await searchUserByPhone(clean);
      setFoundUser(u);
  };

  const handleInviteUser = async () => {
      if (!foundUser || !currentOrganization) return;
      // Invite as Staff to pool
      await inviteUserToOrg(foundUser, currentOrganization.id, 'housekeeping', 'Aday', []);
      setUsers([...users, foundUser]);
      setIsInviteModalOpen(false);
      setFoundUser(null);
      setInvitePhone('');
      alert("Personel havuza eklendi. Şimdi şemadan atama yapabilirsiniz.");
  };

  // --- RENDER HELPERS ---
  const filteredUsers = users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.phoneNumber.includes(searchTerm);
      const matchDept = deptFilter === 'all' || u.department === deptFilter;
      return matchSearch && matchDept;
  });

  const unassignedUsers = users.filter(u => !u.positionId);

  return (
    <div className="flex flex-col h-full bg-white rounded-t-3xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* 1. HEADER & TABS */}
        <div className="bg-white border-b border-gray-200">
            <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Organizasyon Yönetimi</h1>
                    <p className="text-sm text-gray-500">Personel listesi ve hiyerarşik yapı tek ekranda.</p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('DIRECTORY')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'DIRECTORY' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Users className="w-4 h-4" /> Liste
                    </button>
                    <button 
                        onClick={() => setActiveTab('CHART')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'CHART' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Network className="w-4 h-4" /> Şema
                    </button>
                </div>
            </div>

            {/* Sub-Header Actions */}
            <div className="px-6 pb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                {activeTab === 'DIRECTORY' && (
                    <>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Personel ara..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div className="flex bg-gray-50 rounded-xl border border-gray-200 p-1">
                                <button onClick={() => setDeptFilter('all')} className={`px-3 text-xs font-bold rounded-lg ${deptFilter === 'all' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Tümü</button>
                                {['housekeeping', 'kitchen', 'front_office'].map(d => (
                                    <button key={d} onClick={() => setDeptFilter(d)} className={`px-3 text-xs font-bold rounded-lg ${deptFilter === d ? 'bg-white shadow-sm' : 'text-gray-500'}`}>{d.slice(0,3)}</button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setIsInviteModalOpen(true)} className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary-light transition-colors">
                            <UserPlus className="w-4 h-4" /> Personel Ekle
                        </button>
                    </>
                )}
                {activeTab === 'CHART' && (
                    <div className="flex items-center gap-4 w-full justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <div className="w-2 h-2 rounded-full bg-green-500" /> Dolu
                            <div className="w-2 h-2 rounded-full bg-gray-300 ml-2" /> Boş
                        </div>
                        <button onClick={() => window.print()} className="text-gray-400 hover:text-gray-600">
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* 2. CONTENT AREA */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {activeTab === 'DIRECTORY' && (
                        <div className="h-full overflow-y-auto p-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Personel</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Departman</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Ünvan (Pozisyon)</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs overflow-hidden border border-gray-200">
                                                            {user.avatar.length > 3 ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.avatar}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                                                            <div className="text-xs text-gray-400">{user.phoneNumber}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600 uppercase">{user.department || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.positionId ? (
                                                        <span className="text-sm font-bold text-primary flex items-center gap-1">
                                                            <Network className="w-3 h-3" /> {user.roleTitle}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded">Atanmamış</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2" />
                                                    <span className="text-sm text-gray-600">Aktif</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'CHART' && (
                        <OrgChartBuilder 
                            positions={positions}
                            users={users}
                            onAddChild={handleAddChild}
                            onAssign={handleOpenAssign}
                            onRemoveUser={handleRemoveUser}
                            onDeletePosition={handleDeletePosition}
                        />
                    )}
                </>
            )}
        </div>

        {/* --- MODALS --- */}

        {/* 1. ADD POSITION MODAL */}
        <AnimatePresence>
            {isAddPosModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-4">Pozisyon Ekle</h2>
                        <div className="space-y-4">
                            <input value={newPosTitle} onChange={e => setNewPosTitle(e.target.value)} placeholder="Ünvan (Örn: Şef Garson)" className="w-full p-3 border rounded-xl outline-none focus:border-primary" />
                            <select value={newPosDept} onChange={e => setNewPosDept(e.target.value)} className="w-full p-3 border rounded-xl outline-none">
                                {currentOrganization?.settings.customDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <button onClick={() => setIsAddPosModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">İptal</button>
                                <button onClick={handleCreatePosition} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">Oluştur</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* 2. ASSIGN USER MODAL */}
        <AnimatePresence>
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md flex flex-col h-[500px]">
                        <h2 className="text-lg font-bold mb-4 text-gray-800">Personel Seç</h2>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            <h3 className="text-xs font-bold text-gray-400 uppercase sticky top-0 bg-white py-2">Boştaki Personel</h3>
                            {unassignedUsers.map(user => (
                                <button key={user.id} onClick={() => handleAssignUser(user.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary/5 transition-all text-left group">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{user.avatar}</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800">{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.department}</div>
                                    </div>
                                    <CornerDownRight className="w-4 h-4 text-gray-300 group-hover:text-primary" />
                                </button>
                            ))}
                            {unassignedUsers.length === 0 && <div className="text-center py-4 text-gray-400 text-sm">Boşta personel yok.</div>}
                            
                            <h3 className="text-xs font-bold text-gray-400 uppercase mt-4 sticky top-0 bg-white py-2">Diğer Pozisyonlar (Transfer)</h3>
                            {users.filter(u => u.positionId).map(user => (
                                <button key={user.id} onClick={() => handleAssignUser(user.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-orange-400 hover:bg-orange-50 transition-all text-left group opacity-70 hover:opacity-100">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{user.avatar}</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800">{user.name}</div>
                                        <div className="text-xs text-orange-600 font-medium">Mevcut: {user.roleTitle}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setIsAssignModalOpen(false)} className="mt-4 w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">Kapat</button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* 3. INVITE MODAL */}
        <AnimatePresence>
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-4">Yeni Personel Davet Et</h2>
                        {!foundUser ? (
                            <div className="space-y-4">
                                <input value={invitePhone} onChange={e => setInvitePhone(e.target.value)} placeholder="+90 5XX XXX XX XX" className="w-full p-3 border rounded-xl outline-none focus:border-primary font-mono" />
                                <button onClick={handleUserSearch} className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold">Ara</button>
                            </div>
                        ) : (
                            <div className="space-y-4 text-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full mx-auto flex items-center justify-center text-xl font-bold text-blue-600">{foundUser.avatar}</div>
                                <div>
                                    <h3 className="font-bold text-lg">{foundUser.name}</h3>
                                    <p className="text-gray-500 text-sm">Sistemde kayıtlı.</p>
                                </div>
                                <button onClick={handleInviteUser} className="w-full bg-primary text-white py-3 rounded-xl font-bold">Havuza Ekle</button>
                            </div>
                        )}
                        <button onClick={() => { setIsInviteModalOpen(false); setFoundUser(null); }} className="mt-4 w-full text-gray-400 text-sm hover:underline">Vazgeç</button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

    </div>
  );
};
