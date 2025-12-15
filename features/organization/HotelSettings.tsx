
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Save, Upload, Loader2, Palette, Shield, List, Trash2, Plus, AlertTriangle, Archive } from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { updateOrganization } from '../../services/db';
import { archiveOrganization } from '../../services/organizationService';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';

export const HotelSettings: React.FC = () => {
  const { currentOrganization, switchOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'BRAND' | 'DEPTS' | 'PERMS' | 'DANGER'>('BRAND');
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Form State
  const [name, setName] = useState(currentOrganization?.name || '');
  const [description, setDescription] = useState(currentOrganization?.description || '');
  const [location, setLocation] = useState(currentOrganization?.location || '');
  const [website, setWebsite] = useState(currentOrganization?.website || '');
  const [allowContent, setAllowContent] = useState(currentOrganization?.settings?.allowStaffContentCreation || false);
  const [departments, setDepartments] = useState<string[]>(currentOrganization?.settings?.customDepartments || []);
  const [newDept, setNewDept] = useState('');

  // Save Handler
  const handleSave = async () => {
      if (!currentOrganization) return;
      setIsSaving(true);
      
      const updates = {
          name,
          description,
          location,
          website,
          settings: {
              ...currentOrganization.settings,
              allowStaffContentCreation: allowContent,
              customDepartments: departments,
              primaryColor: currentOrganization.settings?.primaryColor || '#0B1E3B'
          }
      };

      await updateOrganization(currentOrganization.id, updates);
      await switchOrganization(currentOrganization.id); // Refresh store
      
      setIsSaving(false);
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

  const addDept = () => {
      if (newDept && !departments.includes(newDept)) {
          setDepartments([...departments, newDept]);
          setNewDept('');
      }
  };

  const removeDept = (dept: string) => {
      setDepartments(departments.filter(d => d !== dept));
  };

  const handleArchive = async () => {
      if (!currentOrganization || !currentUser) return;
      if (!window.confirm("Oteliniz sistem arşivine taşınacak ve sahipliğiniz sona erecek. Bu işlem geri alınamaz. Emin misiniz?")) return;
      
      setIsArchiving(true);
      const success = await archiveOrganization(currentOrganization.id, currentUser.id);
      
      if (success) {
          alert("Otel başarıyla arşive gönderildi. Sahipliğiniz devredildi.");
          navigate('/lobby'); // Send to lobby as free agent
      } else {
          alert("Bir hata oluştu.");
          setIsArchiving(false);
      }
  };

  if (!currentOrganization) return <div>Yükleniyor...</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
            <h1 className="text-2xl font-bold text-gray-800">Otel Ayarları</h1>
            <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-light transition-all"
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
            <button onClick={() => setActiveTab('PERMS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PERMS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>
                <Shield className="w-4 h-4" /> İzinler
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
                {activeTab === 'BRAND' && (
                    <div className="space-y-6">
                        {/* Cover Image */}
                        <div className="relative h-48 rounded-2xl overflow-hidden bg-gray-100 group">
                            <img src={currentOrganization.coverUrl || 'https://via.placeholder.com/800x200'} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <label className="cursor-pointer bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2 hover:bg-white/30 transition-all">
                                    <Upload className="w-5 h-5" /> Kapak Değiştir
                                    <input type="file" className="hidden" onChange={handleCoverUpload} />
                                </label>
                            </div>
                        </div>

                        {/* Logo */}
                        <div className="flex items-center gap-6">
                            <div className="relative w-24 h-24 rounded-2xl bg-gray-100 border-2 border-gray-200 overflow-hidden group shrink-0">
                                {currentOrganization.logoUrl ? (
                                    <img src={currentOrganization.logoUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-2xl">
                                        {currentOrganization.name[0]}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="cursor-pointer text-white p-2 rounded-full hover:bg-white/20">
                                        <Upload className="w-6 h-6" />
                                        <input type="file" className="hidden" onChange={handleLogoUpload} />
                                    </label>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Otel İsmi</label>
                                <input 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-800"
                                />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Konum</label>
                                <input 
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Şehir, Ülke"
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Web Sitesi</label>
                                <input 
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    placeholder="www.hotel.com"
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hakkımızda</label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 resize-none"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'DEPTS' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm mb-4">
                            Standart departmanlara (Housekeeping, Kitchen, Front Office, Management) ek olarak özel departmanlar ekleyebilirsiniz.
                        </div>

                        <div className="flex gap-2">
                            <input 
                                value={newDept}
                                onChange={(e) => setNewDept(e.target.value)}
                                placeholder="Yeni departman adı (Örn: Spa)"
                                className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200"
                            />
                            <button 
                                onClick={addDept}
                                className="bg-gray-800 text-white px-6 rounded-xl font-bold hover:bg-black transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {departments.map((dept, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="font-bold text-gray-700">{dept}</span>
                                    <button onClick={() => removeDept(dept)} className="text-red-400 hover:text-red-600">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            {departments.length === 0 && <div className="text-gray-400 text-center py-4">Özel departman eklenmedi.</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'PERMS' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div>
                                <h3 className="font-bold text-gray-800">Personel İçerik Üretimi</h3>
                                <p className="text-xs text-gray-500">Personelin akışa (Feed) gönderi atmasına izin ver.</p>
                            </div>
                            <button 
                                onClick={() => setAllowContent(!allowContent)}
                                className={`w-14 h-8 rounded-full p-1 transition-colors ${allowContent ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${allowContent ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'DANGER' && (
                    <div className="space-y-6">
                        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-full text-red-500 shadow-sm"><Archive className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="font-bold text-red-700 text-lg">İşletmeyi Devret & Arşivle</h3>
                                    <p className="text-red-600/80 text-sm mt-1 mb-4 leading-relaxed">
                                        Bu işlem oteli silmez, ancak sahipliği <b>Sistem Yöneticisine (Super Admin)</b> devreder ve oteli "Arşivlenmiş" duruma getirir. 
                                        Sizin yönetici yetkiniz alınır ve personel statüsüne düşersiniz.
                                    </p>
                                    <button 
                                        onClick={handleArchive}
                                        disabled={isArchiving}
                                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 transition-all"
                                    >
                                        {isArchiving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                        Güvenli Çıkış Yap
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
