
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User as UserIcon, Trash2, Edit2, AlertCircle, CheckCircle2, MoreVertical, X, CornerDownRight, Briefcase } from 'lucide-react';
import { Position, User, DepartmentType } from '../../types';
import { getOrgPositions, createPosition, deletePosition, assignUserToPosition, removeUserFromPosition } from '../../services/organizationService';
import { getUsersByDepartment } from '../../services/db';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

// --- NODE COMPONENT (Recursive) ---
const OrgNode: React.FC<{
    position: Position;
    allPositions: Position[];
    users: User[];
    onAddChild: (parentId: string) => void;
    onAssign: (posId: string) => void;
    onDelete: (posId: string) => void;
    onRemoveUser: (posId: string) => void;
}> = ({ position, allPositions, users, onAddChild, onAssign, onDelete, onRemoveUser }) => {
    const children = allPositions.filter(p => p.parentId === position.id);
    const occupant = users.find(u => u.id === position.occupantId);

    return (
        <div className="flex flex-col items-center">
            {/* CARD */}
            <div className={`relative w-64 p-4 rounded-2xl border-2 transition-all group ${occupant ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-dashed border-gray-300'}`}>
                
                {/* Connector Line Top */}
                {position.parentId && (
                    <div className="absolute -top-6 left-1/2 w-0.5 h-6 bg-gray-300 -ml-px" />
                )}

                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {position.departmentId}
                    </span>
                    <div className="relative group/menu">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400"><MoreVertical className="w-4 h-4" /></button>
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 hidden group-hover/menu:block z-20">
                            <button onClick={() => onDelete(position.id)} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Sil</button>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">{position.title}</h3>
                </div>

                {occupant ? (
                    <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-xl border border-blue-100">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-blue-600 border border-blue-200 overflow-hidden">
                            {occupant.avatar?.length > 4 ? <img src={occupant.avatar} className="w-full h-full object-cover" /> : occupant.avatar}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <div className="text-xs font-bold text-blue-900 truncate">{occupant.name}</div>
                        </div>
                        <button onClick={() => onRemoveUser(position.id)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                ) : (
                    <button 
                        onClick={() => onAssign(position.id)}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1"
                    >
                        <UserIcon className="w-3 h-3" /> Koltuk Boş
                    </button>
                )}

                {/* Add Child Button (Hover) */}
                <button 
                    onClick={() => onAddChild(position.id)}
                    className="absolute -bottom-3 left-1/2 -ml-3 w-6 h-6 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-gray-500 hover:bg-primary hover:text-white hover:border-primary transition-colors z-10"
                    title="Alt Pozisyon Ekle"
                >
                    <Plus className="w-4 h-4" />
                </button>

                {/* Connector Line Bottom */}
                {children.length > 0 && (
                    <div className="absolute -bottom-6 left-1/2 w-0.5 h-6 bg-gray-300 -ml-px" />
                )}
            </div>

            {/* CHILDREN RENDERER */}
            {children.length > 0 && (
                <div className="flex gap-8 mt-12 relative">
                    {/* Horizontal Connector Line */}
                    {children.length > 1 && (
                        <div className="absolute -top-6 left-0 right-0 h-px bg-gray-300 mx-[calc(50%/var(--child-count))]"></div>
                    )}
                    {children.map(child => (
                        <OrgNode 
                            key={child.id} 
                            position={child} 
                            allPositions={allPositions} 
                            users={users}
                            onAddChild={onAddChild}
                            onAssign={onAssign}
                            onDelete={onDelete}
                            onRemoveUser={onRemoveUser}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN BUILDER COMPONENT ---
export const OrgChartBuilder: React.FC = () => {
    const { currentOrganization } = useOrganizationStore();
    const [positions, setPositions] = useState<Position[]>([]);
    const [users, setUsers] = useState<User[]>([]); // Pool of all users
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    
    // Selection States
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [targetPositionId, setTargetPositionId] = useState<string | null>(null);

    // Form Data
    const [newPosTitle, setNewPosTitle] = useState('');
    const [newPosDept, setNewPosDept] = useState<DepartmentType>('front_office');

    useEffect(() => {
        if(currentOrganization) loadData();
    }, [currentOrganization]);

    const loadData = async () => {
        if (!currentOrganization) return;
        setLoading(true);
        
        // 1. Fetch Positions
        const posData = await getOrgPositions(currentOrganization.id);
        
        // 2. Fetch All Users (Optimization: In real app, search instead of fetching all)
        const depts = currentOrganization.settings.customDepartments || ['housekeeping', 'kitchen', 'front_office', 'management'];
        let allUsers: User[] = [];
        for (const d of depts) {
            const u = await getUsersByDepartment(d, currentOrganization.id);
            allUsers = [...allUsers, ...u];
        }
        
        // De-duplicate
        const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());
        
        setPositions(posData);
        setUsers(uniqueUsers);
        setLoading(false);
    };

    const handleAddPosition = async () => {
        if (!currentOrganization || !newPosTitle) return;
        
        const newPos: Omit<Position, 'id'> = {
            organizationId: currentOrganization.id,
            title: newPosTitle,
            departmentId: newPosDept,
            parentId: selectedParentId,
            occupantId: null,
            level: 0, // Calculate depth if needed
            isOpen: true
        };

        const id = await createPosition(newPos);
        if (id) {
            setPositions([...positions, { ...newPos, id }]);
            setIsAddModalOpen(false);
            setNewPosTitle('');
        }
    };

    const handleAssignUser = async (userId: string) => {
        if (!currentOrganization || !targetPositionId) return;
        
        const success = await assignUserToPosition(currentOrganization.id, targetPositionId, userId);
        if (success) {
            setPositions(prev => prev.map(p => p.id === targetPositionId ? { ...p, occupantId: userId } : p));
            setIsAssignModalOpen(false);
        }
    };

    const handleRemoveUser = async (posId: string) => {
        if(window.confirm("Bu personeli pozisyondan almak istediğinize emin misiniz?")) {
            await removeUserFromPosition(posId);
            setPositions(prev => prev.map(p => p.id === posId ? { ...p, occupantId: null } : p));
        }
    };

    const handleDelete = async (posId: string) => {
        const hasChildren = positions.some(p => p.parentId === posId);
        if (hasChildren) {
            alert("Alt pozisyonları olan bir kutuyu silemezsiniz. Önce alt dalları silin.");
            return;
        }
        if (window.confirm("Bu pozisyonu silmek istediğinize emin misiniz?")) {
            await deletePosition(posId);
            setPositions(prev => prev.filter(p => p.id !== posId));
        }
    };

    // Find Root(s)
    const rootPositions = positions.filter(p => p.parentId === null);

    // Unassigned Users (Bench)
    const assignedUserIds = positions.map(p => p.occupantId).filter(Boolean);
    const benchUsers = users.filter(u => !assignedUserIds.includes(u.id));

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Organizasyon Şeması</h1>
                    <p className="text-gray-500 text-sm">Hiyerarşiyi sürükleyip bırakarak değil, mantıksal olarak inşa edin.</p>
                </div>
                <div className="flex gap-2">
                    {rootPositions.length === 0 && (
                        <button 
                            onClick={() => { setSelectedParentId(null); setIsAddModalOpen(true); }}
                            className="bg-primary text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Tepe Yönetici Ekle
                        </button>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 overflow-auto p-10 relative custom-scrollbar shadow-inner">
                {/* Dotted Grid Background */}
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0B1E3B 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {loading ? (
                    <div className="flex justify-center items-center h-full text-gray-400">Yükleniyor...</div>
                ) : rootPositions.length > 0 ? (
                    <div className="flex justify-center min-w-max relative z-10">
                        {rootPositions.map(root => (
                            <OrgNode 
                                key={root.id}
                                position={root}
                                allPositions={positions}
                                users={users}
                                onAddChild={(id) => { setSelectedParentId(id); setIsAddModalOpen(true); }}
                                onAssign={(id) => { setTargetPositionId(id); setIsAssignModalOpen(true); }}
                                onDelete={handleDelete}
                                onRemoveUser={handleRemoveUser}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Briefcase className="w-16 h-16 mb-4 opacity-20" />
                        <p>Henüz bir yapı kurulmadı.</p>
                        <p className="text-xs">"Tepe Yönetici Ekle" butonu ile başlayın.</p>
                    </div>
                )}
            </div>

            {/* ADD POSITION MODAL */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                            <h2 className="text-lg font-bold mb-4">{selectedParentId ? 'Alt Pozisyon Ekle' : 'Tepe Pozisyon Ekle'}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ünvan</label>
                                    <input value={newPosTitle} onChange={e => setNewPosTitle(e.target.value)} placeholder="Örn: Kat Şefi" className="w-full p-3 border rounded-xl outline-none focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Departman</label>
                                    <select value={newPosDept} onChange={e => setNewPosDept(e.target.value)} className="w-full p-3 border rounded-xl outline-none">
                                        <option value="housekeeping">Housekeeping</option>
                                        <option value="kitchen">Kitchen</option>
                                        <option value="front_office">Front Office</option>
                                        <option value="management">Management</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 text-gray-500 font-bold">İptal</button>
                                    <button onClick={handleAddPosition} className="flex-1 py-2 bg-primary text-white rounded-xl font-bold">Ekle</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ASSIGN USER MODAL */}
            <AnimatePresence>
                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md h-[500px] flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">Koltuk Doldurma</h2>
                                <button onClick={() => setIsAssignModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            
                            <div className="bg-blue-50 p-3 rounded-xl mb-4 text-xs text-blue-700 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                Personel seçildiğinde, profilindeki departman ve ünvan otomatik olarak bu pozisyona göre güncellenir.
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Boştaki Personel ({benchUsers.length})</h3>
                                {benchUsers.map(user => (
                                    <button 
                                        key={user.id}
                                        onClick={() => handleAssignUser(user.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary/5 transition-all text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold overflow-hidden">
                                            {user.avatar.length > 4 ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.avatar}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800">{user.name}</div>
                                            <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                                        </div>
                                        <CornerDownRight className="w-4 h-4 text-gray-300" />
                                    </button>
                                ))}
                                {benchUsers.length === 0 && <div className="text-center py-4 text-gray-400 text-sm">Atanacak boşta personel yok.</div>}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
