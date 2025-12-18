
import React from 'react';
import { RolePermissions, ContentTargetingScope } from '../../../types';
import { Shield, BookOpen, Users, Lock, Globe, Building2, User } from 'lucide-react';

interface PermissionEditorProps {
    permissions: RolePermissions;
    onChange: (newPerms: RolePermissions) => void;
}

export const PermissionEditor: React.FC<PermissionEditorProps> = ({ permissions, onChange }) => {

    const toggle = (key: keyof RolePermissions) => {
        onChange({ ...permissions, [key]: !permissions[key] });
    };

    const setScope = (scope: ContentTargetingScope) => {
        onChange({ ...permissions, contentTargeting: scope });
    };

    return (
        <div className="space-y-8 py-2">
            
            {/* 1. MANAGEMENT */}
            <section className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Shield className="w-4 h-4 text-red-500" /> Yönetim Yetkileri
                </h4>
                
                <ToggleItem 
                    label="Admin Paneli Erişimi" 
                    desc="Yönetim paneline giriş yapabilir."
                    active={permissions.adminAccess}
                    onToggle={() => toggle('adminAccess')}
                />
                
                {permissions.adminAccess && (
                    <div className="pl-4 border-l-2 border-gray-100 space-y-4">
                        <ToggleItem 
                            label="Organizasyon Yapısı" 
                            desc="Departman ve pozisyon ekleyip silebilir."
                            active={permissions.manageStructure}
                            onToggle={() => toggle('manageStructure')}
                        />
                        <ToggleItem 
                            label="Personel Yönetimi" 
                            desc="İşe alım, atama ve işten çıkarma yapabilir."
                            active={permissions.manageStaff}
                            onToggle={() => toggle('manageStaff')}
                        />
                        <ToggleItem 
                            label="Raporları Görüntüle" 
                            desc="Tüm ekibin performans verilerini görebilir."
                            active={permissions.viewAnalytics}
                            onToggle={() => toggle('viewAnalytics')}
                        />
                    </div>
                )}
            </section>

            {/* 2. EDUCATION & CONTENT */}
            <section className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 pb-2 border-b border-gray-100">
                    <BookOpen className="w-4 h-4 text-blue-500" /> Eğitim & İçerik
                </h4>

                <ToggleItem 
                    label="İçerik Oluşturucu" 
                    desc="Stüdyo erişimi ile eğitim hazırlayabilir."
                    active={permissions.canCreateContent}
                    onToggle={() => toggle('canCreateContent')}
                />

                {permissions.canCreateContent && (
                    <div className="pl-4 pt-2">
                        <label className="text-xs font-bold text-gray-700 block mb-2">Hedefleme Kapsamı</label>
                        <div className="bg-gray-50 rounded-xl p-1 grid grid-cols-1 gap-1">
                            {[
                                { id: 'NONE', label: 'Atama Yapamaz', icon: Lock },
                                { id: 'OWN_DEPT', label: 'Sadece Kendi Departmanı', icon: Building2 },
                                { id: 'ENTIRE_ORG', label: 'Tüm Organizasyon', icon: Globe },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setScope(opt.id as ContentTargetingScope)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                        permissions.contentTargeting === opt.id 
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                                        : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    <opt.icon className="w-3.5 h-3.5" />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* 3. SOCIAL */}
            <section className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Users className="w-4 h-4 text-green-500" /> Sosyal
                </h4>
                
                <ToggleItem 
                    label="Akış Paylaşımı" 
                    desc="Ana sayfada gönderi paylaşabilir."
                    active={permissions.canPostFeed}
                    onToggle={() => toggle('canPostFeed')}
                />
                
                <ToggleItem 
                    label="İstekleri Onayla" 
                    desc="Organizasyona katılım isteklerini onaylayabilir."
                    active={permissions.canApproveRequests}
                    onToggle={() => toggle('canApproveRequests')}
                />
            </section>

        </div>
    );
};

const ToggleItem = ({ label, desc, active, onToggle }: { label: string, desc: string, active: boolean, onToggle: () => void }) => (
    <div className="flex justify-between items-center gap-4">
        <div className="flex-1">
            <div className={`text-sm font-bold ${active ? 'text-gray-900' : 'text-gray-500'}`}>{label}</div>
            <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{desc}</div>
        </div>
        <button 
            onClick={onToggle}
            className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${active ? 'bg-green-500' : 'bg-gray-200'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);
