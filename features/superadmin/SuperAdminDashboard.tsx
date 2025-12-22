
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, ShieldCheck, Database, Trash2, Loader2, AlertTriangle, 
    Settings, Image, Upload, Save, Power, Search
} from 'lucide-react';
import { getAllPublicOrganizations } from '../../services/db';
import { executeOrganizationDeathSentence, setOrganizationStatus, getSystemSettings, updateSystemSettings } from '../../services/superAdminService';
import { Organization } from '../../types';
import { UserManager } from './UserManager';
import { uploadFile } from '../../services/storage';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'HOTELS' | 'SETTINGS'>('OVERVIEW');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Settings State
  const [loginImage, setLoginImage] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
      loadHotels();
      loadSettings();
  }, []);

  const loadHotels = async () => {
      setLoading(true);
      const data = await getAllPublicOrganizations();
      setHotels(data);
      setLoading(false);
  };

  const loadSettings = async () => {
      const settings = await getSystemSettings();
      setLoginImage(settings.loginScreenImage);
  };

  const filteredHotels = hotels.filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const pendingDeletions = hotels.filter(h => h.status === 'PENDING_DELETION');

  // --- ACTIONS ---

  const handleSuspend = async (org: Organization) => {
      if (!window.confirm(`${org.name} işletmesini ${org.status === 'SUSPENDED' ? 'aktif etmek' : 'askıya almak'} istediğinize emin misiniz?`)) return;
      setActionLoading(org.id);
      
      const newStatus = org.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const success = await setOrganizationStatus(org.id, newStatus);
      
      if (success) setHotels(prev => prev.map(h => h.id === org.id ? { ...h, status: newStatus } : h));
      setActionLoading(null);
  };

  const handleExecuteDelete = async (org: Organization) => {
      if (!window.confirm(`DİKKAT: ${org.name} işletmesi ve tüm verileri KALICI OLARAK silinecek. Personel boşa çıkacak. Onaylıyor musunuz?`)) return;
      
      setActionLoading(org.id);
      const success = await executeOrganizationDeathSentence(org.id);
      
      if (success) {
          setHotels(prev => prev.filter(h => h.id !== org.id));
          alert("İnfaz gerçekleşti. Organizasyon silindi.");
      } else {
          alert("Silme işlemi başarısız.");
      }
      setActionLoading(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsSavingSettings(true);
          try {
              const url = await uploadFile(e.target.files[0], 'system_assets');
              setLoginImage(url);
          } catch (error) {
              alert("Resim yüklenemedi.");
          } finally {
              setIsSavingSettings(false);
          }
      }
  };

  const handleSaveSettings = async () => {
      setIsSavingSettings(true);
      const success = await updateSystemSettings({ loginScreenImage: loginImage });
      setIsSavingSettings(false);
      if(success) alert("Ayarlar güncellendi. Giriş ekranı değişti.");
  };

  return (
    <div className="min-h-screen bg-[#eff0f5] font-sans text-[#333]">
      
      {/* 1. CLASSIC HEADER */}
      <div className="bg-[#3b5998] h-[42px] border-b border-[#29487d] flex justify-between items-center px-4 fixed top-0 w-full z-50">
        <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-white" />
            <h1 className="text-white font-bold text-sm tracking-tight">Platform Admin <span className="font-normal opacity-70">| Root Access</span></h1>
        </div>
        <div>
            <button 
                onClick={() => navigate('/')}
                className="text-white text-xs font-bold hover:bg-[#4b67a1] px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
                <ArrowLeft className="w-3 h-3" /> Uygulamaya Dön
            </button>
        </div>
      </div>

      <div className="max-w-[980px] mx-auto pt-[54px] px-2">
          
          {/* 2. TABS (The Facebook 2008 Style) */}
          <div className="flex items-end gap-1 mb-4 border-b border-[#899bc1] pl-2 h-[32px]">
              {[
                  { id: 'OVERVIEW', label: 'Genel Bakış' },
                  { id: 'USERS', label: 'Kullanıcı Havuzu' },
                  { id: 'HOTELS', label: 'İşletmeler' },
                  { id: 'SETTINGS', label: 'Sistem Ayarları' }
              ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-1.5 text-xs font-bold border-t border-l border-r rounded-t-[4px] cursor-pointer outline-none focus:outline-none ${
                        activeTab === tab.id 
                        ? 'bg-[#eff0f5] border-[#899bc1] text-[#333] mb-[-1px] pb-2 z-10' // Active: Overlaps border
                        : 'bg-[#d8dfea] border-[#d8dfea] text-[#3b5998] hover:bg-[#e4eaf5] mb-0' // Inactive
                    }`}
                  >
                      {tab.label}
                  </button>
              ))}
          </div>

          <div className="space-y-6">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <>
                  {/* Stats Box */}
                  <div className="bg-white border border-[#d8dfea] p-4 flex gap-8">
                      <div className="text-center">
                          <div className="text-2xl font-bold text-[#3b5998]">{hotels.length}</div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">Toplam İşletme</div>
                      </div>
                      <div className="w-px bg-[#d8dfea]" />
                      <div className="text-center">
                          <div className="text-2xl font-bold text-[#dd3c10]">{pendingDeletions.length}</div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">Silinme İsteği</div>
                      </div>
                  </div>

                  {/* Pending Deletions Alert */}
                  {pendingDeletions.length > 0 && (
                      <div className="bg-[#ffebe8] border border-[#dd3c10] p-3">
                          <h3 className="text-[#dd3c10] font-bold text-xs flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4" />
                              Silinme Onayı Bekleyen İşletmeler
                          </h3>
                          <div className="space-y-1">
                              {pendingDeletions.map(org => (
                                  <div key={org.id} className="bg-white p-2 border border-[#dd3c10] flex items-center justify-between">
                                      <div>
                                          <span className="font-bold text-xs text-[#333] block">{org.name}</span>
                                          <span className="text-[10px] text-gray-500">Sebep: {org.deletionReason}</span>
                                      </div>
                                      <button 
                                        onClick={() => handleExecuteDelete(org)}
                                        className="bg-[#dd3c10] hover:bg-[#b0300d] text-white px-3 py-1 text-[10px] font-bold border border-[#b0300d] flex items-center gap-1"
                                      >
                                          {actionLoading === org.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                          Onayla ve Sil
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                </>
              )}

              {/* TAB 2: USER MANAGER */}
              {activeTab === 'USERS' && (
                  <div className="bg-white border border-[#d8dfea]">
                      <UserManager />
                  </div>
              )}

              {/* TAB 3: HOTELS LIST */}
              {(activeTab === 'HOTELS' || activeTab === 'OVERVIEW') && (
                <div className="bg-white border border-[#d8dfea] min-h-[400px]">
                    <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-2 flex justify-between items-center">
                        <h2 className="text-xs font-bold text-[#333] flex items-center gap-2">
                            <Database className="w-4 h-4 text-gray-500" />
                            Kayıtlı İşletmeler
                        </h2>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-500">Ara:</span>
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border border-[#bdc7d8] px-2 py-0.5 text-xs w-48"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#3b5998]" /></div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f2f2f2] text-[#666] text-[10px] font-bold uppercase border-b border-[#e9e9e9]">
                                    <th className="p-2 border-r border-[#e9e9e9]">Otel Adı</th>
                                    <th className="p-2 border-r border-[#e9e9e9]">Durum</th>
                                    <th className="p-2 border-r border-[#e9e9e9]">Personel</th>
                                    <th className="p-2 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHotels.map(hotel => (
                                    <tr key={hotel.id} className="hover:bg-[#fff9d7] border-b border-[#e9e9e9] last:border-0 text-xs">
                                        <td className="p-2 font-bold text-[#3b5998]">
                                            <a href={`#/org/${hotel.id}`} target="_blank" className="hover:underline">{hotel.name}</a>
                                            <div className="text-[9px] text-gray-400 font-normal">{hotel.location || '-'}</div>
                                        </td>
                                        <td className="p-2">
                                            {hotel.status === 'ACTIVE' && <span className="text-green-600 font-bold">Aktif</span>}
                                            {hotel.status === 'SUSPENDED' && <span className="text-orange-600 font-bold">Askıda</span>}
                                            {hotel.status === 'PENDING_DELETION' && <span className="bg-red-600 text-white px-1 font-bold">SİLİNECEK</span>}
                                        </td>
                                        <td className="p-2 text-gray-600">{hotel.memberCount || 0}</td>
                                        <td className="p-2 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button 
                                                    onClick={() => handleSuspend(hotel)}
                                                    className="px-2 py-0.5 border border-[#ccc] bg-[#f7f7f7] hover:bg-[#eee] text-[#333] text-[10px] font-bold"
                                                >
                                                    {hotel.status === 'SUSPENDED' ? "Aktif Et" : "Askıya Al"}
                                                </button>
                                                <button 
                                                    onClick={() => handleExecuteDelete(hotel)}
                                                    className="px-2 py-0.5 border border-[#999] bg-[#dd3c10] hover:bg-[#b0300d] text-white text-[10px] font-bold"
                                                >
                                                    {actionLoading === hotel.id ? "..." : "SİL"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
              )}

              {/* TAB 4: SETTINGS */}
              {activeTab === 'SETTINGS' && (
                  <div className="bg-white border border-[#d8dfea] p-4">
                      <h2 className="text-sm font-bold text-[#333] border-b border-[#d8dfea] pb-2 mb-4">Sistem Ayarları</h2>

                      <div className="flex gap-4 mb-6">
                          <div className="w-1/2">
                              <label className="text-xs font-bold text-gray-500 block mb-1">Giriş Ekranı Görseli</label>
                              <div className="flex items-center gap-2 mb-2">
                                  <input type="file" onChange={handleImageUpload} className="text-xs" />
                                  {isSavingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                              </div>
                              <div className="border border-[#ccc] p-1 bg-gray-100">
                                  <img src={loginImage} className="w-full h-auto object-cover" alt="Login Preview" />
                              </div>
                          </div>
                          
                          <div className="w-1/2">
                               <div className="bg-[#fff9d7] border border-[#e2c822] p-2 text-xs text-[#333]">
                                  <span className="font-bold">Bilgi:</span> Buradan yüklenen görsel, tüm kullanıcıların giriş ekranında (Login Page) arka plan olarak görünecektir. 
                                  Lütfen yüksek çözünürlüklü (1920x1080) bir görsel kullanın.
                               </div>
                          </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="border-t border-[#d8dfea] pt-4 flex justify-end">
                          <button 
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-6 py-2 font-bold text-xs border border-[#29447e] shadow-sm flex items-center gap-2"
                          >
                              {isSavingSettings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Ayarları Kaydet
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
