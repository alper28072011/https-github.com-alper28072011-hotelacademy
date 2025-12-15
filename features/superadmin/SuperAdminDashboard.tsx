
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Activity, Users, DollarSign, Database, Building2, Search, Power, Trash2, Loader2 } from 'lucide-react';
import { getAllPublicOrganizations } from '../../services/db';
import { Organization } from '../../types';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
      const init = async () => {
          setLoading(true);
          const data = await getAllPublicOrganizations();
          setHotels(data);
          setLoading(false);
      };
      init();
  }, []);

  const filteredHotels = hotels.filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
        <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-sm font-bold border border-gray-700"
        >
            <ArrowLeft className="w-4 h-4" /> Çıkış
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity className="w-24 h-24 text-green-500" /></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-3 bg-green-500/10 rounded-2xl text-green-400"><Activity className="w-6 h-6" /></div>
                      <span className="text-xs font-bold bg-green-500/10 text-green-400 px-2 py-1 rounded">Stabil</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">%99.9</h3>
                  <p className="text-sm text-gray-500">Sistem Çalışma Süresi</p>
              </div>

              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Building2 className="w-24 h-24 text-blue-500" /></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><Building2 className="w-6 h-6" /></div>
                      <span className="text-xs font-bold bg-blue-500/10 text-blue-400 px-2 py-1 rounded">+3 Bugün</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">{hotels.length}</h3>
                  <p className="text-sm text-gray-500">Aktif İşletme (Otel)</p>
              </div>

              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users className="w-24 h-24 text-purple-500" /></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400"><Users className="w-6 h-6" /></div>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">1,245</h3>
                  <p className="text-sm text-gray-500">Toplam Kullanıcı</p>
              </div>

              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign className="w-24 h-24 text-yellow-500" /></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-400"><DollarSign className="w-6 h-6" /></div>
                      <span className="text-xs font-bold bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded">+%12</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">$12.5k</h3>
                  <p className="text-sm text-gray-500">Aylık Tahmini Gelir</p>
              </div>
          </div>

          {/* Tenants List */}
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
                                  <th className="p-6 font-medium">Konum</th>
                                  <th className="p-6 font-medium">Kod</th>
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
                                                  <div className="text-xs text-gray-500">ID: {hotel.id.substring(0, 8)}...</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="p-6 text-sm text-gray-400">{hotel.location || '-'}</td>
                                      <td className="p-6">
                                          <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-mono border border-gray-700">{hotel.code}</span>
                                      </td>
                                      <td className="p-6 text-right">
                                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button className="p-2 bg-gray-800 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors text-gray-400" title="Pasife Al">
                                                  <Power className="w-4 h-4" />
                                              </button>
                                              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-400" title="Detay">
                                                  <ArrowLeft className="w-4 h-4 rotate-180" />
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
      </div>
    </div>
  );
};
