
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Download, X, Briefcase, CheckCircle2, User as UserIcon, Shield, Trash2, Edit3, Settings2 } from 'lucide-react';
import { OrgChartBuilder } from './OrgChartBuilder';
import { Position, User, PermissionSet } from '../../types';
import { updatePositionPermissions, deletePosition } from '../../services/organizationService';

interface OrgStructureEditorProps {
    positions: Position[];
    users: User[];
    onAddChild: (parentId: string) => void;
    onAssign: (positionId: string) => void;
    onRemoveUser: (positionId: string) => void;
}

export const OrgStructureEditor: React.FC<OrgStructureEditorProps> = ({
    positions, users, onAddChild, onAssign, onRemoveUser
}) => {
    const [selectedPos, setSelectedPos] = useState<Position | null>(null);
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'PERMISSIONS'>('DETAILS');
    
    // --- DRAWER ACTIONS ---
    const handlePermissionToggle = async (key: keyof PermissionSet) => {
        if (!selectedPos) return;
        const currentPerms = selectedPos.permissions || {
            canCreateContent: false,
            canInviteStaff: false,
            canManageStructure: false,
            canViewAnalytics: false
        };
        const newPerms = { ...currentPerms, [key]: !currentPerms[key] };
        
        // Optimistic UI Update (local only for drawer)
        setSelectedPos({ ...selectedPos, permissions: newPerms });
        
        // Backend Update
        await updatePositionPermissions(selectedPos.id, newPerms);
    };

    const handleDeleteNode = async () => {
        if (!selectedPos) return;
        const hasChildren = positions.some(p => p.parentId === selectedPos.id);
        if (hasChildren) {
            alert("Alt pozisyonları olan bir kutuyu silemezsiniz.");
            return;
        }
        if (window.confirm("Bu pozisyonu silmek istediğinize emin misiniz?")) {
            await deletePosition(selectedPos.id);
            setSelectedPos(null);
            // Parent component trigger refresh via listener ideally, but here we assume props update
        }
    };

    // Helper to find occupant
    const occupant = selectedPos ? users.find(u => u.id === selectedPos.occupantId) : null;

    return (
        <div className="relative h-full flex flex-col">
            {/* TOOLBAR */}
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Şema Düzenleyici</span>
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Canlı</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="text-gray-400 hover:text-gray-600 p-2"><Download className="w-5 h-5" /></button>
                </div>
            </div>

            {/* CHART AREA */}
            <div className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 overflow-hidden relative">
                <OrgChartBuilder 
                    positions={positions}
                    users={users}
                    onAddChild={onAddChild}
                    onAssign={onAssign}
                    onRemoveUser={onRemoveUser}
                    onDeletePosition={(id) => {
                        const p = positions.find(pos => pos.id === id);
                        if (p) setSelectedPos(p);
                    }}
                    onEditPosition={(p) => setSelectedPos(p)}
                />
            </div>

            {/* EDIT DRAWER */}
            <AnimatePresence>
                {selectedPos && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedPos(null)}
                            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-40"
                        />
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{selectedPos.title}</h3>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">{selectedPos.departmentId}</p>
                                </div>
                                <button onClick={() => setSelectedPos(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex border-b border-gray-100">
                                <button 
                                    onClick={() => setActiveTab('DETAILS')}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'DETAILS' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Detaylar
                                </button>
                                <button 
                                    onClick={() => setActiveTab('PERMISSIONS')}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'PERMISSIONS' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Yetkiler
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {activeTab === 'DETAILS' && (
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                                            {occupant ? (
                                                <>
                                                    <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-gray-300 shadow-sm overflow-hidden">
                                                        {occupant.avatar.length > 3 ? <img src={occupant.avatar} className="w-full h-full object-cover" /> : occupant.avatar}
                                                    </div>
                                                    <h4 className="font-bold text-gray-900">{occupant.name}</h4>
                                                    <p className="text-xs text-gray-500 mb-4">{occupant.email}</p>
                                                    <button onClick={() => { onRemoveUser(selectedPos.id); setSelectedPos(null); }} className="text-red-500 text-xs font-bold hover:underline">Koltuktan Kaldır</button>
                                                </>
                                            ) : (
                                                <div className="py-6">
                                                    <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center border-2 border-dashed border-gray-300">
                                                        <UserIcon className="w-6 h-6 text-gray-300" />
                                                    </div>
                                                    <p className="text-sm text-gray-400 mb-4">Bu pozisyon boş.</p>
                                                    <button onClick={() => { onAssign(selectedPos.id); setSelectedPos(null); }} className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-primary-light">Personel Ata</button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-300 cursor-pointer group">
                                                <div className="flex items-center gap-3">
                                                    <Briefcase className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                                    <div>
                                                        <span className="block text-xs font-bold text-gray-400 uppercase">Pozisyon Adı</span>
                                                        <span className="font-bold text-gray-800">{selectedPos.title}</span>
                                                    </div>
                                                </div>
                                                <Edit3 className="w-4 h-4 text-gray-300" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'PERMISSIONS' && (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-xs mb-6">
                                            <Shield className="w-5 h-5 shrink-0" />
                                            Bu yetkiler, bu pozisyona atanan herhangi bir personele otomatik olarak tanımlanır.
                                        </div>

                                        {[
                                            { key: 'canCreateContent', label: 'Eğitim Oluşturabilir', desc: 'Yeni ders ve içerik ekleyebilir.' },
                                            { key: 'canInviteStaff', label: 'Personel Davet Edebilir', desc: 'Yeni çalışanları sisteme ekleyebilir.' },
                                            { key: 'canManageStructure', label: 'Yapıyı Düzenleyebilir', desc: 'Alt pozisyonlar ekleyip silebilir.' },
                                            { key: 'canViewAnalytics', label: 'Raporları Görebilir', desc: 'Ekip performans verilerine erişebilir.' },
                                        ].map((perm) => (
                                            <div key={perm.key} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer" onClick={() => handlePermissionToggle(perm.key as keyof PermissionSet)}>
                                                <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedPos.permissions?.[perm.key as keyof PermissionSet] ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300'}`}>
                                                    {selectedPos.permissions?.[perm.key as keyof PermissionSet] && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-sm">{perm.label}</h4>
                                                    <p className="text-xs text-gray-500">{perm.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                                <button 
                                    onClick={handleDeleteNode}
                                    className="w-full py-3 border-2 border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Pozisyonu Sil
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
