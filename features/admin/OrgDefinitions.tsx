
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, LayoutList, Briefcase, Loader2, Check } from 'lucide-react';
import { OrgDepartmentDefinition, Organization } from '../../types';
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
    const [newDeptColor, setNewDeptColor] = useState('#3B82F6'); // Default Blue

    // Titles State
    const [titles, setTitles] = useState<string[]>(organization.definitions?.positionTitles || []);
    const [newTitle, setNewTitle] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    // --- ACTIONS ---

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

    const handleAddTitle = () => {
        if (!newTitle.trim()) return;
        if (titles.includes(newTitle)) {
            alert("Bu ünvan zaten var.");
            return;
        }
        setTitles([...titles, newTitle]);
        setNewTitle('');
    };

    const handleRemoveTitle = (title: string) => {
        setTitles(titles.filter(t => t !== title));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await saveOrganizationDefinitions(organization.id, departments, titles);
        if (success) {
            // Reload context to reflect changes
            await switchOrganization(organization.id);
            alert("Tanımlar güncellendi!");
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
                    Önce departmanları ve pozisyon isimlerini (ünvanları) tanımlayın. Şemanızı bu yapı taşlarını kullanarak oluşturacaksınız.
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
                                placeholder="Yeni Departman Adı (Örn: Mutfak)" 
                                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-blue-500 outline-none"
                            />
                            <button onClick={handleAddDepartment} disabled={!newDeptName} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-2">
                        {departments.length === 0 && <div className="text-center text-gray-400 py-10 text-sm">Henüz departman eklenmedi.</div>}
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

                {/* 2. TITLES (POOL) */}
                <div className="bg-white rounded-3xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Briefcase className="w-5 h-5" /></div>
                        <h3 className="font-bold text-gray-800">Pozisyon Kataloğu (Ünvanlar)</h3>
                    </div>

                    <div className="p-5 border-b border-gray-100">
                        <div className="flex gap-2">
                            <input 
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="Yeni Ünvan (Örn: Şef Garson)" 
                                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-purple-500 outline-none"
                            />
                            <button onClick={handleAddTitle} disabled={!newTitle} className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 disabled:opacity-50">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                        <div className="flex flex-wrap gap-2">
                            {titles.length === 0 && <div className="w-full text-center text-gray-400 py-10 text-sm">Henüz ünvan tanımlanmadı.</div>}
                            {titles.map(title => (
                                <div key={title} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold text-gray-700 group hover:border-purple-300 transition-all">
                                    {title}
                                    <button onClick={() => handleRemoveTitle(title)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
