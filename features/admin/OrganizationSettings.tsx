
import React, { useState, useEffect } from 'react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { updateOrganization, getOrganizationUsers } from '../../services/db';
import { 
    requestOrganizationDeletion, 
    getPotentialSuccessors, 
    transferOwnership, 
    updateJoinConfig, 
    updateOrganizationCover, 
    removeOrganizationCover,
    updateChannelConfig 
} from '../../services/organizationService';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { OrganizationSector, OrganizationSize, User, JoinConfig, Channel } from '../../types';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, Save, Upload, Loader2, Palette,
    Trash2, AlertTriangle, ArrowRight, LogOut, Crown,
    UserPlus, ShieldCheck, Tag, Plus, X, Image as ImageIcon,
    Info, Hash, Lock, CheckCircle2, User as UserIcon
} from 'lucide-react';

export const OrganizationSettings: React.FC = () => {
  const { currentOrganization, startOrganizationSession } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<'BRAND' | 'CHANNELS' | 'ONBOARDING' | 'DANGER'>('BRAND');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Users Data for Channel Manager Assignment
  const [staff, setStaff] = useState<User[]>([]);

  // Danger Zone States
  const [deleteReason, setDeleteReason] = useState('');
  const [isRequestingDelete, setIsRequestingDelete] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [potentialSuccessors, setPotentialSuccessors] = useState<User[]>([]);
  const [selectedSuccessor, setSelectedSuccessor] = useState<string>('');

  // Form State - Brand
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [website, setWebsite] = useState('');
  const [sector, setSector] = useState<OrganizationSector>('other');
  const [size, setSize] = useState<OrganizationSize>('1-10');

  // Form State - Onboarding
  const [joinConfig, setJoinConfig] = useState<JoinConfig>({
      rules: "Kurum kurallarına ve gizlilik politikalarına uymayı kabul ediyorum.",
      requireApproval: true,
      availableRoles: ["Personel", "Stajyer", "Öğrenci"]
  });
  const [newRoleInput, setNewRoleInput] = useState('');

  // Identify Role
  const isOwner = currentOrganization?.ownerId === currentUser?.id;

  useEffect(() => {
      if(currentOrganization) {
          setName(currentOrganization.name);
          setDescription(currentOrganization.description || '');
          setLocationStr(currentOrganization.location || '');
          setWebsite(currentOrganization.website || '');
          setSector(currentOrganization.sector || 'other');
          setSize(currentOrganization.size || '1-10');
          if (currentOrganization.joinConfig) {
              setJoinConfig(currentOrganization.joinConfig);
          }
          // Load staff for manager assignment
          getOrganizationUsers(currentOrganization.id).then(setStaff);
      }
  }, [currentOrganization]);

  useEffect(() => {
      if (location.state?.isNewOrg) {
          setShowWelcome(true);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
  }, [location.state]);

  const handleSave = async () => {
      if (!currentOrganization) return;
      setIsSaving(true);
      
      const updates = {
          name,
          description,
          location: locationStr,
          website,
          sector,
          size,
          settings: {
              ...currentOrganization.settings,
              primaryColor: currentOrganization.settings?.primaryColor || '#0B1E3B'
          }
      };

      await updateOrganization(currentOrganization.id, updates);
      await updateJoinConfig(currentOrganization.id, joinConfig);
      await startOrganizationSession(currentOrganization.id);
      
      setIsSaving(false);
      if (showWelcome) setShowWelcome(false);
      alert('Değişiklikler başarıyla kaydedildi.');
  };

  const handleChannelUpdate = async (channelId: string, updates: Partial<Channel>) => {
      if (!currentOrganization) return;
      await updateChannelConfig(currentOrganization.id, channelId, updates);
      await startOrganizationSession(currentOrganization.id); // Refresh
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0] && currentOrganization) {
          setIsSaving(true);
          const url = await uploadFile(e.target.files[0], 'org_logos');
          await updateOrganization(currentOrganization.id, { logoUrl: url });
          await startOrganizationSession(currentOrganization.id);
          setIsSaving(false);
      }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0] && currentOrganization) {
          setIsUploadingCover(true);
          try {
              await updateOrganizationCover(currentOrganization.id, e.target.files[0]);
              await startOrganizationSession(currentOrganization.id); 
          } catch (error) {
              alert("Kapak fotoğrafı güncellenemedi.");
          } finally {
              setIsUploadingCover(false);
          }
      }
  };

  const handleRemoveCover = async () => {
      if (currentOrganization && window.confirm("Kapak fotoğrafını kaldırmak istediğinize emin misiniz?")) {
          setIsUploadingCover(true);
          try {
              await removeOrganizationCover(currentOrganization.id);
              await startOrganizationSession(currentOrganization.id);
          } catch (error) {
              alert("İşlem başarısız.");
          } finally {
              setIsUploadingCover(false);
          }
      }
  };

  // Onboarding Helpers
  const addRole = () => {
      if (newRoleInput && !joinConfig.availableRoles.includes(newRoleInput)) {
          setJoinConfig({
              ...joinConfig,
              availableRoles: [...joinConfig.availableRoles, newRoleInput]
          });
          setNewRoleInput('');
      }
  };

  const removeRole = (role: string) => {
      setJoinConfig({
          ...joinConfig,
          availableRoles: joinConfig.availableRoles.filter(r => r !== role)
      });
  };

  // --- DANGER ZONE ACTIONS ---

  const handleRequestDelete = async () => {
      if (!currentOrganization || !deleteReason) return;
      setIsRequestingDelete(true);
      const success = await requestOrganizationDeletion(currentOrganization.id, deleteReason);
      setIsRequestingDelete(false);
      if (success) {
          alert("Silme talebiniz iletildi. Süper Admin onayladığında işlem tamamlanacak.");
          setDeleteReason('');
      } else {
          alert("Talep iletilemedi.");
      }
  };

  const loadSuccessors = async () => {
      if (!currentOrganization || !currentUser) return;
      const users = await getPotentialSuccessors(currentOrganization.id, currentUser.id);
      setPotentialSuccessors(users);
  };

  const handleTransfer = async () => {
      if (!currentOrganization || !currentUser || !selectedSuccessor) return;
      if (!window.confirm("Sahipliği devretmek üzeresiniz. Bu işlemden sonra tam yetki devredilecek ve siz yönetici rolüne geçeceksiniz. Emin misiniz?")) return;

      setIsTransferring(true);
      const success = await transferOwnership(currentOrganization.id, selectedSuccessor, currentUser.id);
      setIsTransferring(false);

      if (success) {
          alert("Devir işlemi başarılı. Sahiplik aktarıldı.");
          await startOrganizationSession(currentOrganization.id); // Refresh roles
          navigate('/admin');
      } else {
          alert("Devir işlemi başarısız.");
      }
  };

  if (!currentOrganization) return <div>Yükleniyor...</div>;

  return (
    <div className="bg-[#eff0f5] min-h-[600px] p-4 font-sans text-[#333]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 px-2">
            <h1 className="text-xl font-bold text-[#3b5998]">Kurum Ayarları</h1>
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#3b5998] border border-[#29447e] text-white px-4 py-1.5 text-[11px] font-bold shadow-sm hover:bg-[#2d4373] disabled:opacity-50 flex items-center gap-2"
            >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Değişiklikleri Kaydet
            </button>
        </div>

        {/* TABS CONTAINER */}
        <div className="flex items-end px-2 h-[31px]">
            {[
                { id: 'BRAND', label: 'Marka & Profil' },
                { id: 'CHANNELS', label: 'Kanal Yönetimi' },
                { id: 'ONBOARDING', label: 'Katılım (Onboarding)' },
                ...(isOwner ? [{ id: 'DANGER', label: 'Kritik Bölge' }] : [])
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); if(tab.id === 'DANGER') loadSuccessors(); }}
                    className={`px-4 py-1.5 text-[11px] font-bold border-t border-l border-r rounded-t-[3px] mr-1 cursor-pointer focus:outline-none ${
                        activeTab === tab.id 
                        ? 'bg-white border-[#899bc1] text-[#333] mb-[-1px] z-10 pb-2.5' 
                        : 'bg-[#d8dfea] border-[#d8dfea] text-[#3b5998] hover:bg-[#eff0f5]'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* MAIN CONTENT BOX */}
        <div className="bg-white border border-[#899bc1] min-h-[400px] p-6">
            
            {/* 1. BRAND TAB */}
            {activeTab === 'BRAND' && (
                <div className="space-y-6 max-w-2xl">
                    <div className="bg-[#fff9d7] border border-[#e2c822] p-3 text-[11px] text-[#333]">
                        <span className="font-bold">İpucu:</span> Kurumunuzun logosu ve kapak fotoğrafı, çalışanların sayfayı ilk açtığında göreceği yüzdür.
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* COVER PHOTO */}
                        <div>
                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#eee]">
                                <h3 className="font-bold text-[#3b5998] text-xs">Kapak Fotoğrafı</h3>
                                {currentOrganization.coverUrl && (
                                    <button onClick={handleRemoveCover} disabled={isUploadingCover} className="text-[10px] text-red-600 hover:underline">Kaldır</button>
                                )}
                            </div>
                            <div className="relative w-full aspect-[4/1] bg-[#f7f7f7] border border-[#ccc] overflow-hidden group">
                                {currentOrganization.coverUrl ? (
                                    <img src={currentOrganization.coverUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                                        Görsel Yok
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="bg-white border border-[#999] px-3 py-1 text-[11px] font-bold cursor-pointer shadow-sm hover:bg-[#f7f7f7]">
                                        {isUploadingCover ? 'Yükleniyor...' : 'Fotoğrafı Değiştir'}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* BASIC INFO */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* LOGO */}
                            <div className="md:col-span-1">
                                <h3 className="font-bold text-[#3b5998] text-xs mb-2 pb-1 border-b border-[#eee]">Logo</h3>
                                <div className="flex gap-4 items-start">
                                    <div className="w-20 h-20 bg-[#f7f7f7] border border-[#ccc] p-1">
                                        {currentOrganization.logoUrl ? <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" /> : null}
                                    </div>
                                    <label className="text-[11px] text-[#3b5998] hover:underline cursor-pointer font-bold mt-1">
                                        Değiştir
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </label>
                                </div>
                            </div>

                            {/* TEXT FIELDS */}
                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Kurum Adı</label>
                                    <input 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none font-bold text-[#333]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Web Sitesi</label>
                                    <input 
                                        value={website} 
                                        onChange={e => setWebsite(e.target.value)} 
                                        className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none"
                                        placeholder="http://www.ornekotel.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Hakkında</label>
                                    <textarea 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)} 
                                        rows={3}
                                        className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. CHANNELS TAB (NEW) */}
            {activeTab === 'CHANNELS' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                        <span className="font-bold">Kanal Yönetimi:</span> Her kanal için bir veya daha fazla yönetici atayabilirsiniz. Zorunlu kanallara tüm personel otomatik abone olur.
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {currentOrganization.channels.map(channel => (
                            <div key={channel.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Hash className="w-4 h-4 text-[#3b5998]" />
                                        <span className="font-bold text-[#333] text-sm">{channel.name}</span>
                                        {channel.isPrivate && <Lock className="w-3 h-3 text-gray-400" />}
                                    </div>
                                    <p className="text-xs text-gray-500">{channel.description}</p>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-6">
                                    {/* Mandatory Toggle */}
                                    <div className="flex items-center gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={channel.isMandatory}
                                                onChange={(e) => handleChannelUpdate(channel.id, { isMandatory: e.target.checked })}
                                            />
                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                        </label>
                                        <span className="text-xs font-bold text-gray-600">Zorunlu</span>
                                    </div>

                                    {/* Manager Selector */}
                                    <div className="relative group">
                                        <div className="text-xs font-bold text-gray-600 mb-1">Yöneticiler:</div>
                                        <div className="flex -space-x-2">
                                            {(channel.managerIds || []).map(mid => {
                                                const m = staff.find(s => s.id === mid);
                                                return m ? (
                                                    <div key={mid} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[8px] font-bold" title={m.name}>
                                                        {m.avatar.length > 2 ? <img src={m.avatar} className="w-full h-full rounded-full object-cover"/> : m.name[0]}
                                                    </div>
                                                ) : null;
                                            })}
                                            <button className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-400 hover:bg-gray-200">
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        
                                        {/* Dropdown (Simplified) */}
                                        <select 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const userId = e.target.value;
                                                const currentIds = channel.managerIds || [];
                                                if (currentIds.includes(userId)) {
                                                    handleChannelUpdate(channel.id, { managerIds: currentIds.filter(id => id !== userId) });
                                                } else {
                                                    handleChannelUpdate(channel.id, { managerIds: [...currentIds, userId] });
                                                }
                                            }}
                                            value=""
                                        >
                                            <option value="">Yönetici Ekle/Çıkar...</option>
                                            {staff.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {(channel.managerIds || []).includes(s.id) ? '✓ ' : ''} {s.name} ({s.roleTitle || 'Personel'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. ONBOARDING TAB */}
            {activeTab === 'ONBOARDING' && (
                <div className="space-y-6 max-w-2xl">
                    <div>
                        <h3 className="font-bold text-[#3b5998] text-xs mb-2 pb-1 border-b border-[#eee]">Katılım Kuralları</h3>
                        <textarea 
                            value={joinConfig.rules}
                            onChange={e => setJoinConfig({...joinConfig, rules: e.target.value})}
                            rows={5}
                            className="w-full border border-[#bdc7d8] p-2 text-xs bg-[#fff] focus:border-[#3b5998] outline-none resize-none font-mono"
                        />
                    </div>

                    <div className="bg-[#f7f7f7] border border-[#ccc] p-3 flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={joinConfig.requireApproval}
                            onChange={e => setJoinConfig({...joinConfig, requireApproval: e.target.checked})}
                        />
                        <span className="text-xs font-bold text-[#333]">Yönetici onayı gerektir (Kapalı Devre)</span>
                    </div>

                    <div>
                        <h3 className="font-bold text-[#3b5998] text-xs mb-2 pb-1 border-b border-[#eee]">Rol Etiketleri</h3>
                        <div className="flex gap-2 mb-2">
                            <input 
                                value={newRoleInput}
                                onChange={e => setNewRoleInput(e.target.value)}
                                placeholder="Yeni rol ekle..."
                                className="border border-[#bdc7d8] p-1 text-xs w-48 focus:border-[#3b5998] outline-none"
                                onKeyDown={e => e.key === 'Enter' && addRole()}
                            />
                            <button onClick={addRole} className="bg-[#f7f7f7] border border-[#ccc] px-2 text-[10px] font-bold text-[#333] hover:bg-[#e9e9e9]">Ekle</button>
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 border border-[#f0f0f0] bg-[#fcfcfc] min-h-[50px]">
                            {joinConfig.availableRoles.map(role => (
                                <div key={role} className="bg-[#eff0f5] border border-[#d8dfea] px-2 py-1 text-[11px] text-[#333] flex items-center gap-1">
                                    {role}
                                    <button onClick={() => removeRole(role)} className="text-[#999] hover:text-red-500 font-bold ml-1">x</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. DANGER ZONE */}
            {activeTab === 'DANGER' && isOwner && (
                <div className="space-y-8 max-w-2xl">
                    <div className="bg-[#fff0f0] border border-red-200 p-4">
                        <div className="flex items-center gap-2 mb-3 border-b border-red-100 pb-2">
                            <Crown className="w-4 h-4 text-[#3b5998]" />
                            <h3 className="font-bold text-[#3b5998] text-sm">Yönetimi Devret</h3>
                        </div>
                        <p className="text-[11px] text-gray-600 mb-3">
                            İşletme sahipliğini başka bir yöneticiye aktarır. Siz yönetici rolüne geçersiniz.
                        </p>
                        <div className="flex gap-2">
                            <select 
                                className="border border-[#bdc7d8] p-1 text-xs w-64"
                                value={selectedSuccessor}
                                onChange={e => setSelectedSuccessor(e.target.value)}
                            >
                                <option value="">Devredilecek Kişiyi Seç...</option>
                                {potentialSuccessors.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleTransfer}
                                disabled={!selectedSuccessor || isTransferring}
                                className="bg-[#f7f7f7] border border-[#ccc] text-[#333] px-3 py-1 text-[10px] font-bold hover:bg-[#e9e9e9]"
                            >
                                {isTransferring ? 'Devrediliyor...' : 'Devret'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#ffebe8] border border-[#dd3c10] p-4">
                        <div className="flex items-center gap-2 mb-3 border-b border-[#dd3c10] pb-2">
                            <AlertTriangle className="w-4 h-4 text-[#dd3c10]" />
                            <h3 className="font-bold text-[#dd3c10] text-sm">Kurumu Sil</h3>
                        </div>
                        <p className="text-[11px] text-gray-600 mb-3">
                            Bu işlem geri alınamaz. Kurum silindiğinde tüm veriler yok olur. Talep Süper Admin onayına gider.
                        </p>
                        
                        {currentOrganization.status === 'PENDING_DELETION' ? (
                            <div className="text-[#dd3c10] font-bold text-xs p-2 bg-white border border-[#dd3c10] text-center">
                                Silme Talebi Gönderildi. Onay Bekleniyor.
                            </div>
                        ) : (
                            <>
                                <textarea 
                                    value={deleteReason} 
                                    onChange={e => setDeleteReason(e.target.value)}
                                    className="w-full border border-[#dd3c10] p-2 text-xs mb-2 outline-none h-20 resize-none placeholder-red-300 text-red-900"
                                    placeholder="Silme nedenini belirtin..."
                                />
                                <button 
                                    onClick={handleRequestDelete}
                                    disabled={!deleteReason || isRequestingDelete}
                                    className="bg-[#dd3c10] text-white border border-[#b0300d] px-4 py-1.5 text-[11px] font-bold hover:bg-[#b0300d]"
                                >
                                    Silme Talebi Oluştur
                                </button>
                            </>
                        )}
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