
import React, { useState } from 'react';
import { 
    Plus, Trash2, Save, LayoutList, Loader2, Crown, 
    MoreVertical, ArrowRightLeft, ShieldCheck, User, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrgDepartmentDefinition, Organization, PositionPrototype, ContentTargetingScope } from '../../types';
import { saveOrganizationDefinitions } from '../../services/organizationService';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

interface OrgDefinitionsProps {
    organization: Organization;
}

export const OrgDefinitions: React.FC<OrgDefinitionsProps> = ({ organization }) => {
    const { switchOrganization } = useOrganizationStore();
    
    // --- STATE ---
    const [departments, setDepartments] = useState<OrgDepartmentDefinition[]>(organization.definitions?.departments || []);
    const [prototypes, setPrototypes] = useState<PositionPrototype[]>(organization.definitions?.positionPrototypes || []);
    
    const [isSaving, setIsSaving] = useState(false);
    
    // Modal States
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [isPosModalOpen, setIsPosModalOpen] = useState(false);
    const [activeDeptId, setActiveDeptId] = useState<string | null>(null); // For Position Creation context
    
    // Forms
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptColor, setNewDeptColor] = useState('#3B82F6');
    
    const [newPosTitle, setNewPosTitle] = useState('');
    const [newPosIsManager, setNewPosIsManager] = useState(false);

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
        setNewPosTitle('');
        setNewPosIsManager(false);
        setIsPosModalOpen(true);
    };

    const handleAddPosition = () => {
        if (!newPosTitle.trim() || !activeDeptId) return;
        
        const newProto: PositionPrototype = {
            id: `proto_${Date.now()}`,
            title: newPosTitle,
            departmentId: activeDeptId,
            defaultLevel: newPosIsManager ? 2 : 8, // Default Logic
            isManagerial: newPosIsManager,
            defaultScope: newPosIsManager ? 'OWN_NODE_AND_BELOW' : 'NONE'
        };

        setPrototypes([...prototypes, newProto]);
        setIsPosModalOpen(false);
    };

    const handleDeletePosition = (protoId: string) => {
        if (window.confirm("Bu pozisyon tanımını silmek istediğinize emin misiniz?")) {
            setPrototypes(prototypes.filter(p => p.id !== protoId));
        }
    };

    const handleMovePosition = (protoId: string, targetDeptId: string) => {
        setPrototypes(prototypes.map(p => p.id === protoId ? { ...p, departmentId: targetDeptId } : p));
    };

    // --- PERSISTENCE ---
    const handleSave = async () => {
        setIsSaving(true);
        const success = await saveOrganizationDefinitions(organization.id, departments, prototypes);
        if (success) {
            await switchOrganization(organization.id);
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
                                                <span className="text-[10px] text-gray-400 font-mono uppercase">{dept.id}</span>
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
                                                    <div key={pos.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 group/pos transition-all">
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
                                                        
                                                        {/* Position Actions */}
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/pos:opacity-100 transition-opacity">
                                                            {/* Move Dropdown (Simple implementation) */}
                                                            <div className="relative group/move">
                                                                <button className="p-1 hover:bg-blue-100 text-gray-400 hover:text-blue-600 rounded">
                                                                    <ArrowRightLeft className="w-3 h-3" />
                                                                </button>
                                                                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-100 shadow-xl rounded-lg hidden group-hover/move:block z-50 overflow-hidden">
                                                                    <div className="text-[9px] font-bold text-gray-400 p-2 bg-gray-50 uppercase">Şuraya Taşı:</div>
                                                                    {departments.filter(d => d.id !== dept.id).map(target => (
                                                                        <button 
                                                                            key={target.id}
                                                                            onClick={() => handleMovePosition(pos.id, target.id)}
                                                                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                                                                        >
                                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: target.color }} />
                                                                            {target.name}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <button 
                                                                onClick={() => handleDeletePosition(pos.id)}
                                                                className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
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

            {/* MODAL: ADD POSITION */}
            <AnimatePresence>
                {isPosModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">Yeni Pozisyon</h3>
                                    <p className="text-xs text-primary font-bold uppercase">
                                        {departments.find(d => d.id === activeDeptId)?.name}
                                    </p>
                                </div>
                                <button onClick={() => setIsPosModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Pozisyon Ünvanı</label>
                                    <input 
                                        autoFocus
                                        value={newPosTitle}
                                        onChange={e => setNewPosTitle(e.target.value)}
                                        placeholder="Örn: Şef Garson"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary font-bold"
                                    />
                                </div>
                                
                                <div 
                                    onClick={() => setNewPosIsManager(!newPosIsManager)}
                                    className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${newPosIsManager ? 'border-primary bg-primary/5' : 'border-gray-100'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${newPosIsManager ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">Yönetici Rolü</div>
                                            <div className="text-xs text-gray-500">Ekip yönetimi ve raporlama yetkisi.</div>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${newPosIsManager ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                        {newPosIsManager && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                </div>

                                <button onClick={handleAddPosition} className="w-full py-3 bg-primary text-white rounded-xl font-bold mt-2 hover:bg-primary-light">
                                    Ekle
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};
