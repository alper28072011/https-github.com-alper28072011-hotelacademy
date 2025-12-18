
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Network, Loader2, Plus, CornerDownRight, Settings
} from 'lucide-react';
import { User, Position } from '../../types';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getUsersByDepartment, getUserById } from '../../services/db';
import { getOrgPositions, createPosition, assignUserToPosition, removeUserFromPosition, deletePosition } from '../../services/organizationService';
import { OrgChartBuilder } from '../organization/OrgChartBuilder';
import { StaffList } from '../organization/StaffList';
import { OrgDefinitions } from './OrgDefinitions';
import confetti from 'canvas-confetti';

export const OrganizationManager: React.FC = () => {
  const { currentOrganization } = useOrganizationStore();
  const { currentUser, refreshProfile } = useAuthStore();
  
  // -- GLOBAL STATE --
  const [activeTab, setActiveTab] = useState<'DEFINITIONS' | 'CHART' | 'LIST'>('CHART');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // -- DATA --
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [owner, setOwner] = useState<User | undefined>(undefined);
  
  // -- MODAL STATES --
  const [isAddPosModalOpen, setIsAddPosModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // -- SELECTED ITEMS --
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [targetPosId, setTargetPosId] = useState<string | null>(null);
  
  // -- FORM DATA --
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosDeptId, setNewPosDeptId] = useState<string>('');

  // --- INITIAL LOAD ---
  useEffect(() => {
      loadAllData();
  }, [currentOrganization]);

  // Check definitions and auto-switch
  useEffect(() => {
      if (currentOrganization && !loading) {
          const hasDepts = currentOrganization.definitions?.departments?.length && currentOrganization.definitions.departments.length > 0;
          if (!hasDepts && activeTab !== 'DEFINITIONS') {
              setActiveTab('DEFINITIONS');
          }
      }
  }, [currentOrganization, loading]);

  const loadAllData = async () => {
      if (!currentOrganization) return;
      setLoading(true);
      
      const posData = await getOrgPositions(currentOrganization.id);
      
      // Fetch Owner
      const ownerData = await getUserById(currentOrganization.ownerId);
      if (ownerData) setOwner(ownerData);

      // Fetch Staff
      // Optimization: Fetch all memberships instead of per dept? For now sticking to dept logic or ALL.
      // Since departments are dynamic now, let's fetch all users in the org safely.
      // TODO: Implement getAllOrgUsers service for scalability. For now, fetch by known definitions or fallback.
      const definedDepts = currentOrganization.definitions?.departments.map(d => d.id) || ['management'];
      let allUsers: User[] = [];
      
      // Fallback: fetch management at least
      const mgmt = await getUsersByDepartment('management', currentOrganization.id);
      allUsers = [...mgmt];

      // Remove dupes
      const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());
      
      setPositions(posData);
      setUsers(uniqueUsers); // In real app, this should be a full staff fetch
      setLoading(false);
  };

  // --- ACTIONS ---

  const handleAddChild = (parentId: string | null, deptId?: string) => {
      setTargetParentId(parentId);
      if (deptId) setNewPosDeptId(deptId);
      setIsAddPosModalOpen(true);
  };

  const handleCreatePosition = async () => {
      if (!currentOrganization || !newPosTitle || !newPosDeptId) return;
      
      const newPos: Omit<Position, 'id'> = {
          organizationId: currentOrganization.id,
          title: newPosTitle,
          departmentId: newPosDeptId,
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
      if (window.confirm("Pozisyonu silmek istediğinize emin misiniz?")) {
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
      setIsProcessing(true);
      const result = await assignUserToPosition(currentOrganization.id, targetPosId, userId);
      
      // Sync Self if changed
      if (userId === currentUser?.id) {
          await refreshProfile();
      }

      setIsProcessing(false);

      if (result.success) {
          setIsAssignModalOpen(false);
          loadAllData();
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } else {
          alert(result.message || "Atama başarısız oldu.");
      }
  };

  const handleRemoveUser = async (posId: string) => {
      if (!currentOrganization) return;
      const position = positions.find(p => p.id === posId);
      
      if (window.confirm("Koltuk boşaltılsın mı?")) {
          setIsProcessing(true);
          const success = await removeUserFromPosition(posId, currentOrganization.id);
          
          // Sync Self if changed
          if (position?.occupantId === currentUser?.id) {
              await refreshProfile();
          }

          setIsProcessing(false);
          if (success) {
              setPositions(prev => prev.map(p => p.id === posId ? { ...p, occupantId: null } : p));
              loadAllData();
          }
      }
  };

  const unassignedUsers = users.filter(u => !u.positionId);
  const definitions = currentOrganization?.definitions || { departments: [], positionTitles: [] };

  return (
    <div className="flex flex-col h-full bg-white rounded-t-3xl shadow-sm border border-gray-200 overflow-hidden relative">
        
        {isProcessing && (
            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        )}

        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Organizasyon Yönetimi</h1>
                <p className="text-sm text-gray-500">Yapıyı tanımla, kurgula ve yönet.</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('DEFINITIONS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'DEFINITIONS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                >
                    <Settings className="w-4 h-4" /> Tanımlar
                </button>
                <button 
                    onClick={() => setActiveTab('CHART')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'CHART' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                >
                    <Network className="w-4 h-4" /> Şema
                </button>
                <button 
                    onClick={() => setActiveTab('LIST')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'LIST' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                >
                    <Users className="w-4 h-4" /> Liste
                </button>
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {activeTab === 'DEFINITIONS' && currentOrganization && (
                        <OrgDefinitions organization={currentOrganization} />
                    )}

                    {activeTab === 'CHART' && (
                        <OrgChartBuilder 
                            positions={positions}
                            users={users}
                            owner={owner}
                            definitions={definitions}
                            onAddChild={handleAddChild}
                            onAssign={handleOpenAssign}
                            onRemoveUser={handleRemoveUser}
                            onDeletePosition={handleDeletePosition}
                        />
                    )}

                    {activeTab === 'LIST' && (
                        <div className="p-4 h-full overflow-y-auto">
                            <StaffList 
                                users={users} 
                                positions={positions}
                                onAssignClick={(user) => { alert("Şema üzerinden atama yapınız."); }}
                            />
                        </div>
                    )}
                </>
            )}
        </div>

        {/* --- ADD POSITION MODAL --- */}
        <AnimatePresence>
            {isAddPosModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-4">Pozisyon Ekle</h2>
                        
                        <div className="space-y-4">
                            {/* Department Readonly (Context) */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Departman</label>
                                <div className="p-3 bg-gray-100 rounded-xl font-bold text-gray-700">
                                    {definitions.departments.find(d => d.id === newPosDeptId)?.name || 'Seçili Departman'}
                                </div>
                            </div>

                            {/* Title Selector from Pool */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Ünvan Seç</label>
                                <select 
                                    value={newPosTitle} 
                                    onChange={e => setNewPosTitle(e.target.value)} 
                                    className="w-full p-3 border rounded-xl outline-none focus:border-primary font-bold"
                                >
                                    <option value="">Seçiniz...</option>
                                    {definitions.positionTitles.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {definitions.positionTitles.length === 0 && <p className="text-xs text-red-500 mt-1">Tanımlarda hiç ünvan yok.</p>}
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setIsAddPosModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">İptal</button>
                                <button onClick={handleCreatePosition} disabled={!newPosTitle} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-50">Oluştur</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* ASSIGN MODAL (Existing logic) */}
        <AnimatePresence>
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md flex flex-col h-[500px]">
                        <h2 className="text-lg font-bold mb-4 text-gray-800">Personel Seç</h2>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {/* Same List Logic */}
                            {unassignedUsers.map(user => (
                                <button key={user.id} onClick={() => handleAssignUser(user.id)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary/5 transition-all text-left group">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{user.avatar}</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800">{user.name}</div>
                                    </div>
                                    <CornerDownRight className="w-4 h-4 text-gray-300 group-hover:text-primary" />
                                </button>
                            ))}
                            {unassignedUsers.length === 0 && <div className="text-center py-10 text-gray-400">Boşta personel yok.</div>}
                        </div>
                        <button onClick={() => setIsAssignModalOpen(false)} className="mt-4 w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">Kapat</button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
