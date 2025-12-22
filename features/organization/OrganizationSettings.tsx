
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, Save, Upload, Loader2, Palette,
    Trash2, AlertTriangle, ArrowRight, LogOut, Crown,
    UserPlus, ShieldCheck, Tag, Plus, X
} from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { updateOrganization } from '../../services/db';
import { requestOrganizationDeletion, getPotentialSuccessors, transferOwnership, updateJoinConfig } from '../../services/organizationService';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { OrganizationSector, OrganizationSize, User, JoinConfig } from '../../types';
import confetti from 'canvas-confetti';

export const OrganizationSettings: React.FC = () => {
  const { currentOrganization, switchOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<'BRAND' | 'ONBOARDING' | 'DANGER'>('BRAND');
  const [isSaving, setIsSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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
      
      // Save Onboarding separately (optional, could be merged)
      await updateJoinConfig(currentOrganization.id, joinConfig);

      await switchOrganization(currentOrganization.id);
      
      setIsSaving(false);
      if (showWelcome) setShowWelcome(false);
      alert('Ayarlar başarıyla güncellendi.');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0] && currentOrganization) {
          setIsSaving(true);
          const url = await uploadFile(e.target.files[0], 'org_logos');
          await updateOrganization(currentOrganization.id, { logoUrl: url });
          await switchOrganization(currentOrganization.id);
          setIsSaving(false);
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
          await switchOrganization(currentOrganization.id); // Refresh roles
          navigate('/admin');
      } else {
          alert("Devir işlemi başarısız.");
      }
  };

  if (!currentOrganization) return <div>Yükleniyor...</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 relative">
        {/* ONBOARDING MODAL */}
        <AnimatePresence>
            {showWelcome && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl"
                    >
                        <div className="bg-primary p-8 text-center text-white relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                    <Building2 className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold mb-1">Hoş Geldin Patron! 👋</h2>
                                <p className="text-white/80 text-sm">Kurumun hazır. Şimdi detayları tamamlayalım.</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <button 
                                onClick={() => setShowWelcome(false)}
                                className="w-full bg-primary hover:bg-primary-light text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                Hadi Başlayalım <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
            <h1 className="text-2xl font-bold text-gray-800">Kurum Ayarları</h1>
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-light transition-all active:scale-95"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Kaydet
            </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-6 gap-2 overflow-x-auto">
            <button onClick={() => setActiveTab('BRAND')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'BRAND' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
                <Palette className="w-4 h-4" /> Marka & Profil
            </button>
            <button onClick={() => setActiveTab('ONBOARDING')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ONBOARDING' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
                <UserPlus className="w-4 h-4" /> Katılım (Onboarding)
            </button>
            {isOwner && (
                <button onClick={() => { setActiveTab('DANGER'); loadSuccessors(); }} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'DANGER' ? 'bg-red-50 text-red-600 border border-red-100' : 'text-gray-500 hover:bg-gray-200'}`}>
                    <AlertTriangle className="w-4 h-4" /> Kritik Bölge
                </button>
            )}
        </div>

        <div className="p-6">
            <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
            >
                {/* BRAND SETTINGS */}
                {activeTab === 'BRAND' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="relative group cursor-pointer w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary">
                                {currentOrganization.logoUrl ? <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-gray-400" />}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Kurum Logosu</h3>
                                <p className="text-xs text-gray-500">Markanızın yüzü.</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Kurum Adı</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Konum</label>
                                <input value={locationStr} onChange={e => setLocationStr(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Hakkında</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary" />
                        </div>
                    </div>
                )}

                {/* ONBOARDING SETTINGS */}
                {activeTab === 'ONBOARDING' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Katılım Kuralları & Şartları</h3>
                            <p className="text-sm text-gray-500 mb-4">Yeni üyelerin "Katıl" butonuna bastığında göreceği metin.</p>
                            <textarea 
                                value={joinConfig.rules}
                                onChange={e => setJoinConfig({...joinConfig, rules: e.target.value})}
                                rows={4}
                                placeholder="Örn: 1. Saygılı olun. 2. Gizliliğe önem verin..."
                                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:border-primary resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">Yönetici Onayı Gerekli</h4>
                                <p className="text-xs text-gray-500">Kapalı devre kalmak için açık tutun.</p>
                            </div>
                            <button 
                                onClick={() => setJoinConfig({...joinConfig, requireApproval: !joinConfig.requireApproval})}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${joinConfig.requireApproval ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${joinConfig.requireApproval ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Rol Seçenekleri</h3>
                            <p className="text-sm text-gray-500 mb-4">Üyelerin kendileri için seçebileceği veya sizin atayabileceğiniz etiketler.</p>
                            
                            <div className="flex gap-2 mb-3">
                                <input 
                                    value={newRoleInput}
                                    onChange={e => setNewRoleInput(e.target.value)}
                                    placeholder="Rol ekle (Örn: Barmen)"
                                    className="flex-1 p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-primary"
                                    onKeyDown={e => e.key === 'Enter' && addRole()}
                                />
                                <button onClick={addRole} className="bg-gray-100 hover:bg-gray-200 p-3 rounded-xl"><Plus className="w-5 h-5 text-gray-600" /></button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {joinConfig.availableRoles.map(role => (
                                    <div key={role} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-sm font-bold">
                                        <Tag className="w-3 h-3" />
                                        {role}
                                        <button onClick={() => removeRole(role)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* DANGER ZONE (OWNER ONLY) */}
                {activeTab === 'DANGER' && isOwner && (
                    <div className="space-y-8">
                        
                        {/* 1. Transfer Ownership */}
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-white rounded-full text-blue-500 shadow-sm"><Crown className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-blue-900 text-lg">Yönetimi Devret</h3>
                                    <p className="text-blue-800/70 text-sm mt-1">İşletme sahipliğini başka bir yöneticiye aktarır. Siz yönetici rolüne geçersiniz.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 p-3 bg-white border border-blue-200 rounded-xl outline-none text-sm font-bold text-gray-700"
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
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                    Devret
                                </button>
                            </div>
                            {potentialSuccessors.length === 0 && <p className="text-xs text-red-500 mt-2">Devredecek uygun yönetici bulunamadı. Önce birini yönetici yapmalısınız.</p>}
                        </div>

                        {/* 2. Delete Request */}
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-white rounded-full text-red-500 shadow-sm"><Trash2 className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-red-900 text-lg">Kurumu Silmeyi Talep Et</h3>
                                    <p className="text-red-800/70 text-sm mt-1">
                                        Bu işlem geri alınamaz. Kurum silindiğinde tüm veriler yok olur ve personel serbest kalır. 
                                        Bu talep <b>Süper Admin</b> onayına gider.
                                    </p>
                                </div>
                            </div>

                            {currentOrganization.status === 'PENDING_DELETION' ? (
                                <div className="bg-white p-4 rounded-xl border border-red-200 text-red-600 font-bold text-center flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Silme Talebi İnceleniyor...
                                </div>
                            ) : (
                                <>
                                    <textarea 
                                        value={deleteReason}
                                        onChange={e => setDeleteReason(e.target.value)}
                                        placeholder="Silme nedeninizi kısaca belirtin..."
                                        className="w-full p-3 bg-white border border-red-200 rounded-xl outline-none text-red-900 placeholder-red-200 focus:ring-2 focus:ring-red-500 mb-4 h-24 resize-none"
                                    />
                                    <button 
                                        onClick={handleRequestDelete}
                                        disabled={!deleteReason || isRequestingDelete}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                    >
                                        {isRequestingDelete ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                        Silme Talebi Gönder
                                    </button>
                                </>
                            )}
                        </div>

                    </div>
                )}
            </motion.div>
        </div>
    </div>
  );
};
