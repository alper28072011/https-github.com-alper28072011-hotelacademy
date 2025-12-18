
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    Users, Network, Loader2, Plus, CornerDownRight
} from 'lucide-react';
import { User, Position } from '../../types';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { getUsersByDepartment, createOrganization, updateOrganization } from '../../services/db';
import { getOrgPositions, createPosition, assignUserToPosition, removeUserFromPosition } from '../../services/organizationService';
import { OrgStructureEditor } from '../organization/OrgStructureEditor';
import { StaffList } from '../organization/StaffList';
import confetti from 'canvas-confetti';

export const OrganizationManager: React.FC = () => {
  const { currentOrganization } = useOrganizationStore();
  
  // -- GLOBAL STATE --
  const [viewMode, setViewMode] = useState<'CHART' | 'LIST'>('CHART');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // -- DATA --
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  
  // -- MODAL STATES --
  const [isAddPosModalOpen, setIsAddPosModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // -- SELECTED ITEMS --
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [targetPosId, setTargetPosId] = useState<string | null>(null);
  
  // -- FORM DATA --
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosDept, setNewPosDept] = useState<string>('');

  // --- INITIAL LOAD ---
  useEffect(() => {
      loadAllData();
  }, [currentOrganization]);

  const loadAllData = async () => {
      if (!currentOrganization) return;
      setLoading(true);
      
      const posData = await getOrgPositions(currentOrganization.id);
      
      const depts = currentOrganization.settings.customDepartments || ['housekeeping', 'kitchen', 'front_office', 'management'];
      let allUsers: User[] = [];
      for (const d of depts) {
          const u = await getUsersByDepartment(d, currentOrganization.id);
          allUsers = [...allUsers, ...u];
      }
      const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());
      
      setPositions(posData);
      setUsers(uniqueUsers);
      setLoading(false);
  };

  // --- ACTIONS ---

  const handleAddChild = (parentId: string) => {
      setTargetParentId(parentId || null);
      if (currentOrganization?.settings.customDepartments?.length) {
          setNewPosDept(currentOrganization.settings.customDepartments[0]);
      }
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

  const handleOpenAssign = (posId: string) => {
      setTargetPosId(posId);
      setIsAssignModalOpen(true);
  };

  // Assign user from List view or Chart view
  const handleAssignUser = async (userId: string) => {
      if (!currentOrganization || !targetPosId) return;
      setIsProcessing(true);
      const result = await assignUserToPosition(currentOrganization.id, targetPosId, userId);
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
      if (window.confirm("Koltuk boşaltılsın mı?")) {
          setIsProcessing(true);
          const success = await removeUserFromPosition(posId, currentOrganization.id);
          setIsProcessing(false);
          if (success) {
              setPositions(prev => prev.map(p => p.id === posId ? { ...p, occupantId: null } : p));
              loadAllData();
          }
      }
  };

  const unassignedUsers = users.filter(u => !u.positionId);

  return (
    <div className="flex flex-col h-full bg-white rounded-t-3xl shadow-sm border border-gray-200 overflow-hidden relative">
        
        {isProcessing && (
            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-2" />
                    <span className="font-bold text-gray-800">İşleniyor...</span>
                </div>
            </div>
        )}

        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Organizasyon Şeması</h1>
                <p className="text-sm text-gray-500">Yapıyı görselleştir ve yönet.</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setViewMode('CHART')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'CHART' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                >
                    <Network className="w-4 h-4" /> Şema
                </button>
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'LIST' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                >
                    <Users className="w-4 h-4" /> Liste
                </button>
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative p-4">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {viewMode === 'CHART' ? (
                        <OrgStructureEditor 
                            positions={positions}
                            users={users}
                            onAddChild={handleAddChild}
                            onAssign={handleOpenAssign}
                            onRemoveUser={handleRemoveUser}
                        />
                    ) : (
                        <StaffList 
                            users={users} 
                            positions={positions}
                            onAssignClick={(user) => { 
                                // For list view, assign flow might be reverse (User -> Position), 
                                // but for simplicity here we just show placeholder or navigate to profile
                                alert("Listeden atama özelliği yakında eklenecek. Lütfen Şema görünümünü kullanın.");
                            }}
                        />
                    )}
                </>
            )}
        </div>

        {/* MODALS */}
        <AnimatePresence>
            {isAddPosModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-4">Pozisyon Ekle</h2>
                        <div className="space-y-4">
                            <input value={newPosTitle} onChange={e => setNewPosTitle(e.target.value)} placeholder="Ünvan (Örn: Şef Garson)" className="w-full p-3 border rounded-xl outline-none focus:border-primary" />
                            <select value={newPosDept} onChange={e => setNewPosDept(e.target.value)} className="w-full p-3 border rounded-xl outline-none">
                                {currentOrganization?.settings.customDepartments?.map(d => <option key={d} value={d}>{d}</option>)}
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
                            <h3 className="text-xs font-bold text-gray-400 uppercase mt-4 sticky top-0 bg-white py-2">Transfer</h3>
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
    </div>
  );
};
