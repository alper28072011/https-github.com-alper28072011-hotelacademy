
import React, { useState } from 'react';
import { 
    Plus, Trash2, Save, LayoutList, Loader2, Crown, 
    MoreVertical, ArrowRightLeft, ShieldCheck, User, X,
    Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrgDepartmentDefinition, Organization, PositionPrototype, RolePermissions } from '../../types';
import { saveOrganizationDefinitions } from '../../services/organizationService';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { PermissionEditor } from '../organization/components/PermissionEditor';
import { DEFAULT_PERMISSIONS } from '../../hooks/usePermission';

interface OrgDefinitionsProps {
    organization: Organization;
}

export const OrgDefinitions: React.FC<OrgDefinitionsProps> = ({ organization }) => {
    const { switchToOrganizationAction } = useOrganizationStore();
    
    // --- STATE ---
    const [departments, setDepartments] = useState<OrgDepartmentDefinition[]>(organization.definitions?.departments || []);
    const [prototypes, setPrototypes] = useState<PositionPrototype[]>(organization.definitions?.positionPrototypes || []);
    
    const [isSaving, setIsSaving] = useState(false);
    
    // Modal States
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [isPosModalOpen, setIsPosModalOpen] = useState(false);
    const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
    const [editingProto, setEditingProto] = useState<PositionPrototype | null>(null);
    
    // Forms
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptColor, setNewDeptColor] = useState('#3B82F6');
    
    // Position Form
    const [posTitle, setPosTitle] = useState('');
    const [posPermissions, setPosPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS);

    // --- ACTIONS: DEPARTMENTS ---
    const handleAddDepartment = () => {
        if (!newDeptName.trim()) return;
        const id = newDeptName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (departments.some(d => d.id === id)) {
            alert("Bu isimde bir departman zaten var.");
            return;
        }
        
        setDepartments([...departments, { id, name: newDeptName, color: newDeptColor }]);
        setNewDeptName('');
        setIsDeptModalOpen(false);
    };

    const handleDeleteDepartment = (deptId: string) => {
        const hasPositions = prototypes.some(p => p.departmentId === deptId);
        if (hasPositions) {
            alert("DİKKAT: Bu departmana bağlı pozisyonlar var. Silmeden önce pozisyonları silmeli veya başka departmana taşımalısınız.");
            return;
        }
        if (window.confirm("Departmanı silmek istediğinize emin misiniz?")) {
            setDepartments(departments.filter(d => d.id !== deptId));
        }
    };

    // --- ACTIONS: POSITIONS ---
    const openAddPositionModal = (deptId: string) => {
        setActiveDeptId(deptId);
        setEditingProto(null);
        setPosTitle('');
        setPosPermissions(DEFAULT_PERMISSIONS);
        setIsPosModalOpen(true);
    };

    const openEditPositionModal = (proto: PositionPrototype) => {
        setEditingProto(proto);
        setPosTitle(proto.title);
        // Ensure permissions object exists, merge with defaults if missing keys
        setPosPermissions({ ...DEFAULT_PERMISSIONS, ...(proto.permissions || {}) });
        setIsPosModalOpen(true);
    };

    const handleSavePosition = () => {
        if (!posTitle.trim()) return;
        
        // Determine "Managerial" visual tag based on key permission
        const isManager = posPermissions.adminAccess || posPermissions.manageStaff;

        if (editingProto) {
            // Update Existing
            const updated = prototypes.map(p => p.id === editingProto.id ? {
                ...p,
                title: posTitle,
                isManagerial: isManager,
                permissions: posPermissions
            } : p);
            setPrototypes(updated);
        } else if (activeDeptId) {
            // Create New
            const newProto: PositionPrototype = {
                id: `proto_${Date.now()}`,
                title: posTitle,
                departmentId: activeDeptId,
                defaultLevel: isManager ? 2 : 8,
                isManagerial: isManager,
                permissions: posPermissions
            };
            setPrototypes([...prototypes, newProto]);
        }

        setIsPosModalOpen(false);
    };

    const handleDeletePosition = (protoId: string) => {
        if (window.confirm("Bu pozisyon tanımını silmek istediğinize emin misiniz?")) {
            setPrototypes(prototypes.filter(p => p.id !== protoId));
        }
    };

    // --- PERSISTENCE ---
    const handleSave = async () => {
        setIsSaving(true);
        const success = await saveOrganizationDefinitions(organization.id, departments, prototypes);
        if (success) {
            await switchToOrganizationAction(organization.id);
            alert("Organizasyon yapısı başarıyla güncellendi!");
        } else {
            alert("Kaydetme başarısız.");
        }
        setIsSaving(false);
    };

    const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280'];

    return (
        <div className="h-full flex flex-col relative bg-gray-50/50">
            
            {/* Header Toolbar */}
            <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <LayoutList className="w-5 h-5 text-primary" /> 
                        Yapılandırma
                    </h2>
                    <p className="text-xs text-gray-500">Departmanları ve bağlı rolleri tanımla.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsDeptModalOpen(true)}
                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Departman Ekle
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-light active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Kaydet
                    </button>
                </div>
            </div>

            {/* Masonry Grid Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {departments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <LayoutList className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="font-medium">Henüz departman tanımlanmadı.</p>
                        <button onClick={() => setIsDeptModalOpen(true)} className="mt-4 text-primary font-bold hover:underline">İlk Departmanı Ekle</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                        {departments.map(dept => {
                            const deptPositions = prototypes.filter(p => p.departmentId === dept.id);
                            
                            return (
                                <motion.div 
                                    key={dept.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group/card"
                                >
                                    {/* Card Header */}
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: dept.color }} />
                                            <div>
                                                <h3 className="font-bold text-gray-800 leading-none">{dept.name}</h3>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteDepartment(dept.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Positions List */}
                                    <div className="p-2 flex-1 min-h-[100px] bg-white">
                                        {deptPositions.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-xs text-gray-400 italic py-8">
                                                Henüz pozisyon yok
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {deptPositions.map(pos => (
                                                    <div 
                                                        key={pos.id} 
                                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 group/pos transition-all cursor-pointer"
                                                        onClick={() => openEditPositionModal(pos)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {pos.isManagerial ? (
                                                                <div className="p-1 bg-yellow-100 text-yellow-600 rounded">
                                                                    <Crown className="w-3 h-3" />
                                                                </div>
                                                            ) : (
                                                                <div className="p-1 bg-gray-100 text-gray-500 rounded">
                                                                    <User className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                            <span className="text-sm font-bold text-gray-700">{pos.title}</span>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/pos:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeletePosition(pos.id); }}
                                                                className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                            <Settings2 className="w-3 h-3 text-gray-300" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Position Action */}
                                    <button 
                                        onClick={() => openAddPositionModal(dept.id)}
                                        className="m-2 p-3 rounded-xl border border-dashed border-gray-300 text-gray-400 text-xs font-bold hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-3 h-3" /> Pozisyon Ekle
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL: ADD DEPARTMENT */}
            <AnimatePresence>
                {isDeptModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-gray-800">Yeni Departman</h3>
                                <button onClick={() => setIsDeptModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Departman Adı</label>
                                    <input 
                                        autoFocus
                                        value={newDeptName}
                                        onChange={e => setNewDeptName(e.target.value)}
                                        placeholder="Örn: Mutfak"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Renk Etiketi</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {colors.map(c => (
                                            <button 
                                                key={c}
                                                onClick={() => setNewDeptColor(c)}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${newDeptColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <button onClick={handleAddDepartment} className="w-full py-3 bg-primary text-white rounded-xl font-bold mt-2 hover:bg-primary-light">
                                    Oluştur
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: POSITIONS (WITH PERMISSIONS) */}
            <AnimatePresence>
                {isPosModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                                <div>
                                    <h3 className="font-bold text-xl text-gray-800">{editingProto ? 'Pozisyonu Düzenle' : 'Yeni Pozisyon'}</h3>
                                    <p className="text-xs text-primary font-bold uppercase mt-1">
                                        {departments.find(d => d.id === (editingProto?.departmentId || activeDeptId))?.name}
                                    </p>
                                </div>
                                <button onClick={() => setIsPosModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-500" /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Pozisyon Ünvanı</label>
                                    <input 
                                        autoFocus
                                        value={posTitle}
                                        onChange={e => setPosTitle(e.target.value)}
                                        placeholder="Örn: Şef Garson"
                                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-primary focus:bg-white font-bold text-lg transition-all"
                                    />
                                </div>

                                {/* Permissions Editor */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                                    <PermissionEditor 
                                        permissions={posPermissions}
                                        onChange={setPosPermissions}
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl">
                                <button onClick={handleSavePosition} className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-light shadow-xl shadow-primary/20 active:scale-[0.98] transition-all">
                                    {editingProto ? 'Değişiklikleri Kaydet' : 'Pozisyonu Oluştur'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};
