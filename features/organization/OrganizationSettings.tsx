
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, Save, Upload, Loader2, Palette, Shield, List, 
    Trash2, Plus, AlertTriangle, XCircle, CheckCircle2, 
    ArrowRight, Globe, MapPin, X
} from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { updateOrganization } from '../../services/db';
import { deleteOrganizationFully } from '../../services/organizationService';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { OrganizationSector, OrganizationSize } from '../../types';
import confetti from 'canvas-confetti';

export const OrganizationSettings: React.FC = () => {
  const { currentOrganization, switchOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<'BRAND' | 'DEPTS' | 'DANGER'>('BRAND');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); 
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

  // Form State - Brand
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [website, setWebsite] = useState('');
  const [sector, setSector] = useState<OrganizationSector>('other');
  const [size, setSize] = useState<OrganizationSize>('1-10');
  
  // Form State - Departments
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDeptInput, setNewDeptInput] = useState('');

  // Sync state when org loads
  useEffect(() => {
      if(currentOrganization) {
          setName(currentOrganization.name);
          setDescription(currentOrganization.description || '');
          setLocationStr(currentOrganization.location || '');
          setWebsite(currentOrganization.website || '');
          setSector(currentOrganization.sector || 'other');
          setSize(currentOrganization.size || '1-10');
          setDepartments(currentOrganization.settings?.customDepartments || []);
      }
  }, [currentOrganization]);

  // Check for Onboarding Flag
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
              customDepartments: departments,
              primaryColor: currentOrganization.settings?.primaryColor || '#0B1E3B'
          }
      };

      await updateOrganization(currentOrganization.id, updates);
      await switchOrganization(currentOrganization.id); // Refresh store
      
      setIsSaving(false);
      if (showWelcome) setShowWelcome(false);
      alert('Ayarlar kaydedildi.');
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0] && currentOrganization) {
          setIsSaving(true);
          const url = await uploadFile(e.target.files[0], 'org_covers');
          await updateOrganization(currentOrganization.id, { coverUrl: url });
          await switchOrganization(currentOrganization.id);
          setIsSaving(false);
      }
  };

  const addDepartment = () => {
      if(newDeptInput.trim() && !departments.includes(newDeptInput.trim())) {
          setDepartments([...departments, newDeptInput.trim()]);
          setNewDeptInput('');
      }
  };

  const removeDepartment = (dept: string) => {
      setDepartments(departments.filter(d => d !== dept));
  };

  const handleDeleteOrg = async () => {
      if (!currentOrganization || !currentUser) return;
      if (deleteConfirm !== currentOrganization.name) return;
      
      setIsDeleting(true);
      const success = await deleteOrganizationFully(currentOrganization.id);
      
      if (success) {
          alert("Kurum kalıcı olarak silindi. Tüm personel serbest kaldı.");
          navigate('/');
          window.location.reload();
      } else {
          alert("Silme işlemi başarısız oldu.");
          setIsDeleting(false);
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
                            <div className="flex flex-col gap-4 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">1</div>
                                    <div className="text-sm text-gray-600">Marka ve Sektör bilgilerini gir.</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">2</div>
                                    <div className="text-sm text-gray-600">Departmanlarını yapılandır.</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">3</div>
                                    <div className="text-sm text-gray-600">Ekibini davet etmeye başla!</div>
                                </div>
                            </div>
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
                <Palette className="w-4 h-4" /> Marka
            </button>
            <button onClick={() => setActiveTab('DEPTS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'DEPTS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
                <List className="w-4 h-4" /> Departmanlar
            </button>
            <button onClick={() => setActiveTab('DANGER')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'DANGER' ? 'bg-red-50 text-red-600 border border-red-100' : 'text-gray-500 hover:bg-gray-200'}`}>
                <AlertTriangle className="w-4 h-4" /> Risk Bölgesi
            </button>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo Upload */}
                            <div className="flex items-center gap-6">
                                <div className="relative group cursor-pointer w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary">
                                    {currentOrganization.logoUrl ? <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-gray-400" />}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Kurum Logosu</h3>
                                    <p className="text-xs text-gray-500">Önerilen: 500x500px PNG</p>
                                </div>
                            </div>

                            {/* Cover Upload */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Kapak Fotoğrafı</label>
                                <div className="relative group cursor-pointer w-full h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary">
                                    {currentOrganization.coverUrl ? (
                                        <>
                                            <img src={currentOrganization.coverUrl} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload className="w-6 h-6 text-white" />
                                            </div>
                                        </>
                                    ) : <Upload className="w-8 h-8 text-gray-400" />}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCoverUpload} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Kurum Adı</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Konum</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                    <input value={locationStr} onChange={e => setLocationStr(e.target.value)} placeholder="Şehir, Ülke" className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Web Sitesi</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary" />
                            </div>
                        </div>

                        {/* SECTOR & SIZE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Faaliyet Sektörü</label>
                                <select 
                                    value={sector}
                                    onChange={(e) => setSector(e.target.value as any)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary"
                                >
                                    <option value="tourism">Turizm & Otelcilik</option>
                                    <option value="technology">Teknoloji & Yazılım</option>
                                    <option value="health">Sağlık Hizmetleri</option>
                                    <option value="education">Eğitim & Akademi</option>
                                    <option value="retail">Perakende & Mağazacılık</option>
                                    <option value="finance">Finans & Danışmanlık</option>
                                    <option value="other">Diğer</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Kurum Büyüklüğü</label>
                                <select 
                                    value={size}
                                    onChange={(e) => setSize(e.target.value as any)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary"
                                >
                                    <option value="1-10">1-10 Kişi</option>
                                    <option value="11-50">11-50 Kişi</option>
                                    <option value="50-200">50-200 Kişi</option>
                                    <option value="200+">200+ Kişi</option>
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Hakkında</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary" />
                        </div>
                    </div>
                )}

                {/* DEPARTMENTS SETTINGS */}
                {activeTab === 'DEPTS' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-700 text-sm">
                            <List className="w-5 h-5 shrink-0" />
                            <div>
                                <span className="font-bold block">Departman Yapısı</span>
                                İşletmenize özgü departmanları buraya ekleyin. Bunlar personel atamalarında ve görev dağılımlarında kullanılacaktır.
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <input 
                                value={newDeptInput}
                                onChange={e => setNewDeptInput(e.target.value)}
                                placeholder="Yeni departman adı (örn: Spa, Vale)"
                                className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary"
                                onKeyDown={e => e.key === 'Enter' && addDepartment()}
                            />
                            <button 
                                onClick={addDepartment}
                                disabled={!newDeptInput.trim()}
                                className="bg-gray-900 text-white px-6 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50"
                            >
                                Ekle
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {departments.map(dept => (
                                <div key={dept} className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm group hover:border-primary transition-colors">
                                    <span className="font-bold text-gray-700">{dept}</span>
                                    <button onClick={() => removeDepartment(dept)} className="text-gray-400 hover:text-red-500 p-1">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {departments.length === 0 && <div className="text-gray-400 text-sm italic py-4">Henüz departman eklenmedi.</div>}
                        </div>
                    </div>
                )}

                {/* DANGER ZONE */}
                {activeTab === 'DANGER' && (
                    <div className="space-y-6">
                        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-full text-red-500 shadow-sm"><XCircle className="w-8 h-8" /></div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-red-700 text-lg">Kurumu Kalıcı Olarak Sil</h3>
                                    <p className="text-red-600/80 text-sm mt-2 mb-4 leading-relaxed">
                                        Bu işlem geri alınamaz. 
                                        <ul className="list-disc ml-4 mt-2 mb-2">
                                            <li>Tüm kurslar, gönderiler ve görevler <b>silinecek</b>.</li>
                                            <li>Personel hesapları <b>silinmeyecek</b>, ancak hepsi kurumdan çıkarılıp serbest (freelancer) statüsüne geçecek.</li>
                                        </ul>
                                    </p>
                                    
                                    <div className="mb-4">
                                        <label className="text-xs font-bold text-red-800 uppercase mb-1 block">Onaylamak için kurum adını yazın:</label>
                                        <input 
                                            value={deleteConfirm}
                                            onChange={e => setDeleteConfirm(e.target.value)}
                                            placeholder={currentOrganization.name}
                                            className="w-full p-2 bg-white border border-red-200 rounded-lg text-red-900 placeholder-red-200 outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <button 
                                        onClick={handleDeleteOrg}
                                        disabled={isDeleting || deleteConfirm !== currentOrganization.name}
                                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 transition-all w-full justify-center"
                                    >
                                        {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                        Kurumu Sil ve Kapat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    </div>
  );
};
