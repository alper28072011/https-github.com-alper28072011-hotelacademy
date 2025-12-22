
import React, { useState, useEffect } from 'react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { updateOrganization } from '../../services/db';
import { requestOrganizationDeletion, getPotentialSuccessors, transferOwnership, updateJoinConfig, updateOrganizationCover, removeOrganizationCover } from '../../services/organizationService';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { OrganizationSector, OrganizationSize, User, JoinConfig } from '../../types';

export const OrganizationSettings: React.FC = () => {
  const { currentOrganization, switchOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'PRIVACY' | 'ROLES' | 'DELETE'>('GENERAL');
  const [isSaving, setIsSaving] = useState(false);

  // Danger Zone
  const [deleteReason, setDeleteReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [potentialSuccessors, setPotentialSuccessors] = useState<User[]>([]);
  const [selectedSuccessor, setSelectedSuccessor] = useState<string>('');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [website, setWebsite] = useState('');
  const [joinConfig, setJoinConfig] = useState<JoinConfig>({ rules: "", requireApproval: true, availableRoles: [] });
  const [newRoleInput, setNewRoleInput] = useState('');

  const isOwner = currentOrganization?.ownerId === currentUser?.id;

  useEffect(() => {
      if(currentOrganization) {
          setName(currentOrganization.name);
          setDescription(currentOrganization.description || '');
          setLocationStr(currentOrganization.location || '');
          setWebsite(currentOrganization.website || '');
          if (currentOrganization.joinConfig) setJoinConfig(currentOrganization.joinConfig);
      }
  }, [currentOrganization]);

  const handleSave = async () => {
      if (!currentOrganization) return;
      setIsSaving(true);
      
      await updateOrganization(currentOrganization.id, { name, description, location: locationStr, website });
      await updateJoinConfig(currentOrganization.id, joinConfig);
      await switchOrganization(currentOrganization.id);
      
      setIsSaving(false);
      alert('Ayarlar kaydedildi.');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0] && currentOrganization) {
          const url = await uploadFile(e.target.files[0], 'org_logos');
          await updateOrganization(currentOrganization.id, { logoUrl: url });
          await switchOrganization(currentOrganization.id);
      }
  };

  // --- DANGER ZONE ---
  const loadSuccessors = async () => {
      if (currentOrganization && currentUser) {
          const users = await getPotentialSuccessors(currentOrganization.id, currentUser.id);
          setPotentialSuccessors(users);
      }
  };

  const handleRequestDelete = async () => {
      if (!currentOrganization || !deleteReason) return;
      await requestOrganizationDeletion(currentOrganization.id, deleteReason);
      alert("Silme talebi gönderildi.");
  };

  if (!currentOrganization) return null;

  return (
    <div className="flex flex-col md:flex-row bg-white border border-[#d8dfea] min-h-[600px]">
        {/* LEFT SETTINGS MENU */}
        <div className="w-full md:w-[200px] bg-[#f7f7f7] border-r border-[#d8dfea] p-2">
            <div className="font-bold text-[#333] px-2 py-2 mb-2 text-xs uppercase">Ayarlar</div>
            {[
                { id: 'GENERAL', label: 'Genel Bilgiler' },
                { id: 'PRIVACY', label: 'Gizlilik & Katılım' },
                { id: 'ROLES', label: 'Rol Tanımları' },
                ...(isOwner ? [{ id: 'DELETE', label: 'Gelişmiş / Sil' }] : [])
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); if(tab.id === 'DELETE') loadSuccessors(); }}
                    className={`w-full text-left px-2 py-1.5 text-[11px] font-bold border-b border-transparent mb-1 ${
                        activeTab === tab.id 
                        ? 'bg-[#3b5998] text-white border-[#29447e]' 
                        : 'text-[#3b5998] hover:bg-[#d8dfea]'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 p-6">
            <div className="border-b border-[#d8dfea] pb-2 mb-4">
                <h2 className="text-lg font-bold text-[#333]">
                    {activeTab === 'GENERAL' && 'Genel Bilgiler'}
                    {activeTab === 'PRIVACY' && 'Gizlilik Ayarları'}
                    {activeTab === 'ROLES' && 'Rol Seçenekleri'}
                    {activeTab === 'DELETE' && 'Tehlikeli Bölge'}
                </h2>
            </div>

            {/* TAB: GENERAL */}
            {activeTab === 'GENERAL' && (
                <div className="space-y-4 max-w-lg">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-600">Kurum Logosu</label>
                        <div className="flex items-center gap-3">
                            <div className="w-16 h-16 border border-[#ccc] p-1 bg-white">
                                {currentOrganization.logoUrl ? <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100" />}
                            </div>
                            <input type="file" onChange={handleLogoUpload} className="text-[11px]" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-600">Kurum Adı</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="border border-[#bdc7d8] p-1 text-sm w-full" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-600">Konum</label>
                        <input value={locationStr} onChange={e => setLocationStr(e.target.value)} className="border border-[#bdc7d8] p-1 text-sm w-full" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-600">Açıklama</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="border border-[#bdc7d8] p-1 text-sm w-full" />
                    </div>
                </div>
            )}

            {/* TAB: PRIVACY */}
            {activeTab === 'PRIVACY' && (
                <div className="space-y-4 max-w-lg">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-600">Katılım Kuralları</label>
                        <textarea 
                            value={joinConfig.rules}
                            onChange={e => setJoinConfig({...joinConfig, rules: e.target.value})}
                            rows={5}
                            className="border border-[#bdc7d8] p-1 text-sm w-full font-mono bg-[#f7f7f7]"
                        />
                        <p className="text-[10px] text-gray-500">Üyeler katılmadan önce bu metni onaylamak zorundadır.</p>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                        <input 
                            type="checkbox" 
                            checked={joinConfig.requireApproval}
                            onChange={e => setJoinConfig({...joinConfig, requireApproval: e.target.checked})}
                        />
                        <span className="text-[11px] font-bold text-[#333]">Yönetici onayı gerektir (Kapalı Devre)</span>
                    </div>
                </div>
            )}

            {/* TAB: ROLES */}
            {activeTab === 'ROLES' && (
                <div className="space-y-4 max-w-lg">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-600">Mevcut Roller</label>
                        <div className="border border-[#bdc7d8] bg-white p-2">
                            {joinConfig.availableRoles.map(role => (
                                <div key={role} className="inline-block bg-[#eff0f5] border border-[#d8dfea] px-2 py-0.5 text-[11px] mr-1 mb-1">
                                    {role}
                                    <button 
                                        onClick={() => setJoinConfig({...joinConfig, availableRoles: joinConfig.availableRoles.filter(r => r !== role)})}
                                        className="ml-1 text-red-500 font-bold hover:underline"
                                    >x</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            value={newRoleInput}
                            onChange={e => setNewRoleInput(e.target.value)}
                            placeholder="Yeni rol ekle..."
                            className="border border-[#bdc7d8] p-1 text-sm flex-1"
                        />
                        <button 
                            onClick={() => {
                                if(newRoleInput) {
                                    setJoinConfig({...joinConfig, availableRoles: [...joinConfig.availableRoles, newRoleInput]});
                                    setNewRoleInput('');
                                }
                            }}
                            className="bg-[#f7f7f7] border border-[#d8dfea] px-3 text-[11px] font-bold"
                        >
                            Ekle
                        </button>
                    </div>
                </div>
            )}

            {/* TAB: DELETE */}
            {activeTab === 'DELETE' && isOwner && (
                <div className="space-y-6 max-w-lg">
                    <div className="bg-[#ffebe8] border border-[#dd3c10] p-3">
                        <h4 className="font-bold text-[#dd3c10] text-sm mb-2">Kurumu Sil</h4>
                        <p className="text-[11px] mb-2">Bu işlem geri alınamaz. Lütfen bir sebep belirtin.</p>
                        <input 
                            value={deleteReason} 
                            onChange={e => setDeleteReason(e.target.value)}
                            className="w-full border border-[#dd3c10] p-1 text-sm mb-2"
                            placeholder="Silme sebebi..."
                        />
                        <button onClick={handleRequestDelete} className="bg-[#dd3c10] text-white px-3 py-1 text-[11px] font-bold border border-[#b0300d]">
                            Silme Talebi Oluştur
                        </button>
                    </div>
                </div>
            )}

            {/* FOOTER ACTIONS */}
            {activeTab !== 'DELETE' && (
                <div className="mt-8 border-t border-[#d8dfea] pt-4 flex justify-end gap-2">
                    <button onClick={handleSave} disabled={isSaving} className="bg-[#3b5998] text-white px-6 py-1.5 text-[11px] font-bold border border-[#29447e]">
                        {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
