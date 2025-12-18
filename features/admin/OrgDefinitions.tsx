
import React, { useState } from 'react';
import { Plus, Trash2, Save, LayoutList, Briefcase, Loader2, Crown, Network, Shield } from 'lucide-react';
import { OrgDepartmentDefinition, Organization, PositionPrototype, ContentTargetingScope } from '../../types';
import { saveOrganizationDefinitions } from '../../services/organizationService';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

interface OrgDefinitionsProps {
    organization: Organization;
}

export const OrgDefinitions: React.FC<OrgDefinitionsProps> = ({ organization }) => {
    const { switchOrganization } = useOrganizationStore();
    
    // Departments State
    const [departments, setDepartments] = useState<OrgDepartmentDefinition[]>(organization.definitions?.departments || []);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptColor, setNewDeptColor] = useState('#3B82F6');

    // Prototypes State (Updated from plain Titles)
    const [prototypes, setPrototypes] = useState<PositionPrototype[]>(organization.definitions?.positionPrototypes || []);
    const [newProto, setNewProto] = useState<PositionPrototype>({
        title: '',
        defaultLevel: 5,
        isManagerial: false,
        defaultScope: 'NONE'
    });

    const [isSaving, setIsSaving] = useState(false);

    // --- DEPARTMENTS ACTIONS ---
    const handleAddDepartment = () => {
        if (!newDeptName.trim()) return;
        const id = newDeptName.toLowerCase().replace(/\s+/g, '_');
        if (departments.some(d => d.id === id)) {
            alert("Bu departman zaten var.");
            return;
        }
        setDepartments([...departments, { id, name: newDeptName, color: newDeptColor }]);
        setNewDeptName('');
    };

    const handleRemoveDepartment = (id: string) => {
        if (window.confirm("Departmanı silmek istediğinize emin misiniz?")) {
            setDepartments(departments.filter(d => d.id !== id));
        }
    };

    // --- PROTOTYPE ACTIONS ---
    const handleAddPrototype = () => {
        if (!newProto.title.trim()) return;
        if (prototypes.some(p => p.title === newProto.title)) {
            alert("Bu ünvan zaten var.");
            return;
        }
        setPrototypes([...prototypes, newProto]);
        setNewProto({ title: '', defaultLevel: 5, isManagerial: false, defaultScope: 'NONE' });
    };

    const handleRemovePrototype = (title: string) => {
        setPrototypes(prototypes.filter(p => p.title !== title));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await saveOrganizationDefinitions(organization.id, departments, prototypes);
        if (success) {
            await switchOrganization(organization.id);
            alert("Yapısal tanımlar başarıyla güncellendi!");
        } else {
            alert("Kaydetme başarısız.");
        }
        setIsSaving(false);
    };

    const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280'];

    return (
        <div className="h-full flex flex-col gap-6 p-2">
            <div className="flex justify-between items-center">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-xs max-w-2xl">
                    <LayoutList className="w-5 h-5 shrink-0" />
                    <div>
                        <span className="font-bold block mb-1">Kurumsal DNA Tanımları</span>
                        Rol prototiplerini ve departmanları burada tanımlayın. Bu tanımlar, hiyerarşi ağacını oluştururken şablon olarak kullanılacaktır.
                    </div>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Değişiklikleri Kaydet
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden">
                {/* 1. DEPARTMENTS */}
                <div className="bg-white rounded-3xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><LayoutList className="w-5 h-5" /></div>
                        <h3 className="font-bold text-gray-800">Departmanlar</h3>
                    </div>
                    
                    <div className="p-5 border-b border-gray-100">
                        <div className="flex gap-2 mb-3">
                            {colors.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => setNewDeptColor(c)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${newDeptColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                value={newDeptName}
                                onChange={e => setNewDeptName(e.target.value)}
                                placeholder="Örn: Ön Büro, Mutfak" 
                                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-blue-500 outline-none"
                            />
                            <button onClick={handleAddDepartment} disabled={!newDeptName} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-2">
                        {departments.map(dept => (
                            <div key={dept.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-300 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-10 rounded-full" style={{ backgroundColor: dept.color }} />
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{dept.name}</div>
                                        <div className="text-[10px] text-gray-400 uppercase">{dept.id}</div>
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveDepartment(dept.id)} className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. ROLE PROTOTYPES */}
                <div className="bg-white rounded-3xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Briefcase className="w-5 h-5" /></div>
                        <h3 className="font-bold text-gray-800">Rol Prototipleri (Ünvanlar)</h3>
                    </div>

                    <div className="p-5 border-b border-gray-100 space-y-3">
                        <input 
                            value={newProto.title}
                            onChange={e => setNewProto({...newProto, title: e.target.value})}
                            placeholder="Yeni Ünvan (Örn: Resepsiyon Şefi)" 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-purple-500 outline-none"
                        />
                        
                        <div className="flex gap-2">
                            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500 ml-2">Hiyerarşi</span>
                                <select 
                                    value={newProto.defaultLevel}
                                    onChange={e => setNewProto({...newProto, defaultLevel: parseInt(e.target.value)})}
                                    className="bg-transparent text-sm font-bold text-gray-800 outline-none text-right"
                                >
                                    {[1,2,3,4,5,6,7,8,9,10].map(i => <option key={i} value={i}>Seviye {i}</option>)}
                                </select>
                            </div>
                            
                            <button 
                                onClick={() => setNewProto({...newProto, isManagerial: !newProto.isManagerial})}
                                className={`flex-1 p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${newProto.isManagerial ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                            >
                                <Crown className="w-4 h-4" /> Yönetici
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500 ml-2">Vars. Yetki</span>
                                <select 
                                    value={newProto.defaultScope}
                                    onChange={e => setNewProto({...newProto, defaultScope: e.target.value as ContentTargetingScope})}
                                    className="bg-transparent text-xs font-bold text-gray-800 outline-none text-right max-w-[100px]"
                                >
                                    <option value="NONE">Yetkisiz</option>
                                    <option value="OWN_NODE_AND_BELOW">Alt Ekip</option>
                                    <option value="GLOBAL">Tüm Otel</option>
                                </select>
                            </div>
                            <button onClick={handleAddPrototype} disabled={!newProto.title} className="bg-purple-600 text-white px-6 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-2">
                        {prototypes.length === 0 && <div className="text-center text-gray-400 py-10 text-sm">Henüz rol tanımlanmadı.</div>}
                        {prototypes.map(p => (
                            <div key={p.title} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-300 bg-gray-50/50 transition-all group">
                                <div>
                                    <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                        {p.title}
                                        {p.isManagerial && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] bg-gray-200 px-1.5 rounded text-gray-600">Lv.{p.defaultLevel}</span>
                                        <span className={`text-[10px] px-1.5 rounded border ${p.defaultScope === 'GLOBAL' ? 'bg-blue-100 text-blue-700 border-blue-200' : p.defaultScope === 'OWN_NODE_AND_BELOW' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                            {p.defaultScope === 'GLOBAL' ? 'Global' : p.defaultScope === 'OWN_NODE_AND_BELOW' ? 'Ekip' : 'Standart'}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleRemovePrototype(p.title)} className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
