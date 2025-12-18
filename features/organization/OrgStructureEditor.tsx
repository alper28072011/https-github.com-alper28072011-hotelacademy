
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Briefcase, CheckCircle2, User as UserIcon, Shield, Trash2, Edit3, Eye, Target } from 'lucide-react';
import { OrgChartBuilder } from './OrgChartBuilder';
import { Position, User, PermissionSet, OrgDepartmentDefinition, PositionPrototype } from '../../types';
import { updatePositionPermissions, deletePosition, createPosition } from '../../services/organizationService';

interface OrgStructureEditorProps {
    positions: Position[];
    users: User[];
    definitions: { departments: OrgDepartmentDefinition[], positionPrototypes: PositionPrototype[] };
    onAddChild: (parentId: string | null, deptId?: string) => void; // Passed up to parent usually
    onAssign: (positionId: string) => void;
    onRemoveUser: (positionId: string) => void;
    owner?: User;
}

export const OrgStructureEditor: React.FC<OrgStructureEditorProps> = ({
    positions, users, definitions, onAddChild, onAssign, onRemoveUser, owner
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
            canViewAnalytics: false,
            contentTargetingScope: 'NONE'
        };
        
        // Handle boolean toggles
        if (key !== 'contentTargetingScope') {
            const newPerms = { ...currentPerms, [key]: !currentPerms[key] };
            setSelectedPos({ ...selectedPos, permissions: newPerms });
            await updatePositionPermissions(selectedPos.id, newPerms);
        }
    };

    const handleScopeChange = async (scope: 'GLOBAL' | 'OWN_NODE_AND_BELOW' | 'NONE') => {
        if (!selectedPos) return;
        const currentPerms = selectedPos.permissions || {
            canCreateContent: false,
            canInviteStaff: false,
            canManageStructure: false,
            canViewAnalytics: false,
            contentTargetingScope: 'NONE'
        };
        const newPerms = { ...currentPerms, contentTargetingScope: scope };
        setSelectedPos({ ...selectedPos, permissions: newPerms });
        await updatePositionPermissions(selectedPos.id, newPerms);
    };

    const handleDeleteNode = async () => {
        if (!selectedPos) return;
        const hasChildren = positions.some(p => p.parentId === selectedPos.id);
        if (hasChildren) {
            alert("Alt pozisyonları olan bir kutuyu silemezsiniz. Önce alt kademeyi temizleyin.");
            return;
        }
        if (window.confirm("Bu pozisyonu silmek istediğinize emin misiniz?")) {
            await deletePosition(selectedPos.id);
            setSelectedPos(null);
            // Refresh logic handled by parent listener
        }
    };

    // Helper to find occupant
    const occupant = selectedPos ? users.find(u => u.id === selectedPos.occupantId) : null;

    return (
        <div className="relative h-full flex flex-col">
            {/* TOOLBAR */}
            <div className="flex justify-between items-center mb-4 px-4 pt-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">Şema Düzenleyici</span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-200">Canlı Senkronizasyon</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-600 hover:text-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
                        <Download className="w-4 h-4" /> Şemayı İndir
                    </button>
                </div>
            </div>

            {/* CHART AREA */}
            <div className="flex-1 bg-gray-50 rounded-t-3xl border-t border-gray-200 overflow-hidden relative">
                <OrgChartBuilder 
                    positions={positions}
                    users={users}
                    definitions={definitions}
                    owner={owner}
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
                            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{selectedPos.title}</h3>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" />
                                        {definitions.departments.find(d => d.id === selectedPos.departmentId)?.name || selectedPos.departmentId}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedPos(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex border-b border-gray-100">
                                <button 
                                    onClick={() => setActiveTab('DETAILS')}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'DETAILS' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Detaylar
                                </button>
                                <button 
                                    onClick={() => setActiveTab('PERMISSIONS')}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'PERMISSIONS' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Yetki & Erişim
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {activeTab === 'DETAILS' && (
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center relative overflow-hidden">
                                            {occupant ? (
                                                <>
                                                    <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-gray-300 shadow-sm overflow-hidden border-4 border-white">
                                                        {occupant.avatar.length > 3 ? <img src={occupant.avatar} className="w-full h-full object-cover" /> : occupant.avatar}
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 text-lg mb-1">{occupant.name}</h4>
                                                    <p className="text-xs text-gray-500 mb-4 font-mono">{occupant.email}</p>
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => { onRemoveUser(selectedPos.id); setSelectedPos(null); }} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">Koltuktan Kaldır</button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="py-4">
                                                    <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-gray-300">
                                                        <UserIcon className="w-8 h-8 text-gray-300" />
                                                    </div>
                                                    <p className="text-sm text-gray-500 mb-6 font-medium">Bu pozisyon şu an boş.</p>
                                                    <button onClick={() => { onAssign(selectedPos.id); setSelectedPos(null); }} className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-primary-light transition-all active:scale-95">Personel Ata</button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase ml-1">Pozisyon Bilgileri</h4>
                                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                                <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Hiyerarşi Seviyesi</span>
                                                    <span className="font-bold text-gray-900">Level {selectedPos.level || '-'}</span>
                                                </div>
                                                <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Üst Yönetici</span>
                                                    <span className="font-bold text-gray-900">
                                                        {positions.find(p => p.id === selectedPos.parentId)?.title || 'Kurucu'}
                                                    </span>
                                                </div>
                                                <div className="p-3 flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Bağlı Alt Birim</span>
                                                    <span className="font-bold text-gray-900">
                                                        {positions.filter(p => p.parentId === selectedPos.id).length} adet
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'PERMISSIONS' && (
                                    <div className="space-y-6">
                                        {/* SCOPE SELECTOR */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                                <Target className="w-4 h-4" /> Eğitim Hedefleme Kapsamı
                                            </h4>
                                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                                {[
                                                    { id: 'NONE', label: 'Yetkisiz', desc: 'Kimseye eğitim atayamaz.' },
                                                    { id: 'OWN_NODE_AND_BELOW', label: 'Sadece Kendi Ekibi', desc: 'Yalnızca kendisine bağlı alt kadroya eğitim verebilir.' },
                                                    { id: 'GLOBAL', label: 'Global (Tüm Otel)', desc: 'Tüm departmanlara erişebilir (GM, İK vb.)' }
                                                ].map((opt) => (
                                                    <button 
                                                        key={opt.id}
                                                        onClick={() => handleScopeChange(opt.id as any)}
                                                        className={`w-full text-left p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex items-start gap-3 ${selectedPos.permissions?.contentTargetingScope === opt.id ? 'bg-blue-50/50' : ''}`}
                                                    >
                                                        <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPos.permissions?.contentTargetingScope === opt.id ? 'border-blue-600' : 'border-gray-300'}`}>
                                                            {selectedPos.permissions?.contentTargetingScope === opt.id && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                                        </div>
                                                        <div>
                                                            <div className={`font-bold text-sm ${selectedPos.permissions?.contentTargetingScope === opt.id ? 'text-blue-700' : 'text-gray-800'}`}>{opt.label}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-100" />

                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                                <Shield className="w-4 h-4" /> Fonksiyonel Yetkiler
                                            </h4>
                                            {[
                                                { key: 'canCreateContent', label: 'Eğitim Oluşturabilir', desc: 'Stüdyoyu kullanarak yeni ders içerikleri hazırlayabilir.' },
                                                { key: 'canInviteStaff', label: 'Personel Davet Edebilir', desc: 'Sisteme yeni kullanıcı ekleyebilir.' },
                                                { key: 'canManageStructure', label: 'Organizasyonu Yönetebilir', desc: 'Şemayı düzenleyebilir, pozisyon ekleyip silebilir.' },
                                                { key: 'canViewAnalytics', label: 'Raporları Görebilir', desc: 'Ekip performans verilerine tam erişim.' },
                                            ].map((perm) => (
                                                <div key={perm.key} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handlePermissionToggle(perm.key as keyof PermissionSet)}>
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
