
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Activity, Users, DollarSign, Database, Building2, Search, Power, Trash2, Loader2, RotateCcw, AlertTriangle, Check, X } from 'lucide-react';
import { getAllPublicOrganizations } from '../../services/db';
import { executeOrganizationDeathSentence, setOrganizationStatus } from '../../services/superAdminService';
import { Organization } from '../../types';
import { UserManager } from './UserManager';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'HOTELS'>('OVERVIEW');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
      loadHotels();
  }, []);

  const loadHotels = async () => {
      setLoading(true);
      const data = await getAllPublicOrganizations();
      setHotels(data);
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Top Bar */}
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">Platform Yönetimi</h1>
                <p className="text-xs text-gray-400 font-mono tracking-wider">ROOT_ACCESS_GRANTED</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-gray-800 rounded-lg p-1 flex">
                <button onClick={() => setActiveTab('OVERVIEW')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'OVERVIEW' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Özet</button>
                <button onClick={() => setActiveTab('USERS')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'USERS' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Kullanıcılar</button>
                <button onClick={() => setActiveTab('HOTELS')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'HOTELS' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}>İşletmeler</button>
            </div>
            <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-sm font-bold border border-gray-700"
            >
                <ArrowLeft className="w-4 h-4" /> Uygulamaya Dön
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <>
              {/* PENDING DELETIONS ALERT */}
              {pendingDeletions.length > 0 && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-6 animate-pulse">
                      <h3 className="text-red-400 font-bold text-lg flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-6 h-6" />
                          {pendingDeletions.length} Silme Talebi Bekliyor
                      </h3>
                      <div className="space-y-2">
                          {pendingDeletions.map(org => (
                              <div key={org.id} className="bg-red-900/40 p-4 rounded-xl flex items-center justify-between border border-red-500/30">
                                  <div>
                                      <span className="font-bold text-white block">{org.name}</span>
                                      <span className="text-sm text-red-200">Sebep: {org.deletionReason}</span>
                                  </div>
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleExecuteDelete(org)}
                                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"
                                      >
                                          {actionLoading === org.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                          Onayla ve Sil
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 relative overflow-hidden group">
                      <h3 className="text-3xl font-bold mb-1">{hotels.length}</h3>
                      <p className="text-sm text-gray-500">Toplam İşletme</p>
                  </div>
                  {/* ... Other stats ... */}
              </div>
            </>
          )}

          {/* TAB 2: USER MANAGER */}
          {activeTab === 'USERS' && (
              <div className="animate-in fade-in zoom-in duration-300">
                  <UserManager />
              </div>
          )}

          {/* TAB 3: HOTELS LIST */}
          {(activeTab === 'HOTELS' || activeTab === 'OVERVIEW') && (
            <div className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-gray-500" />
                        İşletme Listesi
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-4 top-3 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Otel ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-950 border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-yellow-500/50 w-full md:w-64"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950/50 text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-6 font-medium">Otel Adı</th>
                                    <th className="p-6 font-medium">Durum</th>
                                    <th className="p-6 font-medium">Personel</th>
                                    <th className="p-6 font-medium text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredHotels.map(hotel => (
                                    <tr key={hotel.id} className="hover:bg-gray-800/50 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700">
                                                    {hotel.logoUrl ? <img src={hotel.logoUrl} className="w-full h-full object-cover" /> : <span className="font-bold text-gray-500">{hotel.name[0]}</span>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{hotel.name}</div>
                                                    <div className="text-xs text-gray-500">{hotel.location || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            {hotel.status === 'ACTIVE' && <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold border border-green-500/30">Aktif</span>}
                                            {hotel.status === 'SUSPENDED' && <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-bold border border-orange-500/30">Askıda</span>}
                                            {hotel.status === 'PENDING_DELETION' && <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold border border-red-500/30 animate-pulse">Silinme Bekliyor</span>}
                                        </td>
                                        <td className="p-6 text-sm text-gray-400">{hotel.memberCount || 0}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleSuspend(hotel)}
                                                    className={`p-2 rounded-lg transition-colors ${hotel.status === 'SUSPENDED' ? 'bg-green-900/50 text-green-400 hover:bg-green-900' : 'bg-gray-800 hover:bg-orange-900/50 text-orange-400'}`}
                                                    title={hotel.status === 'SUSPENDED' ? "Aktif Et" : "Askıya Al"}
                                                >
                                                    <Power className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleExecuteDelete(hotel)}
                                                    className="p-2 bg-gray-800 hover:bg-red-900/50 hover:text-red-500 rounded-lg transition-colors text-gray-400" 
                                                    title="Tamamen Sil (İnfaz)"
                                                >
                                                    {actionLoading === hotel.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
          )}
      </div>
    </div>
  );
};
