
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Hash, Loader2, Plus, Settings, Trash2, Edit2, Shield
} from 'lucide-react';
import { User, Channel, PageRole } from '../../types';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getOrganizationUsers } from '../../services/db';
import { createChannel, deleteChannel, updateUserPageRole } from '../../services/organizationService';
import confetti from 'canvas-confetti';

export const OrganizationManager: React.FC = () => {
  const { currentOrganization } = useOrganizationStore();
  
  // -- GLOBAL STATE --
  const [activeTab, setActiveTab] = useState<'CHANNELS' | 'MEMBERS'>('CHANNELS');
  const [loading, setLoading] = useState(true);
  
  // -- DATA --
  const [users, setUsers] = useState<User[]>([]);
  
  // -- FORMS --
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
      loadAllData();
  }, [currentOrganization]);

  const loadAllData = async () => {
      if (!currentOrganization) return;
      setLoading(true);
      try {
          const allUsers = await getOrganizationUsers(currentOrganization.id);
          setUsers(allUsers);
      } catch (error) {
          console.error("Failed to load org data", error);
      } finally {
          setLoading(false);
      }
  };

  const handleCreateChannel = async () => {
      if (!currentOrganization || !newChannelName) return;
      setIsProcessing(true);
      const success = await createChannel(currentOrganization.id, newChannelName, newChannelDesc, isPrivate);
      if (success) {
          setNewChannelName('');
          setNewChannelDesc('');
          alert("Kanal oluşturuldu!");
          // Reloading whole org context ideally happens via listener, but manual reload for now
          window.location.reload(); 
      }
      setIsProcessing(false);
  };

  const handleDeleteChannel = async (id: string) => {
      if (!currentOrganization) return;
      if (window.confirm("Kanalı silmek istediğinize emin misiniz?")) {
          await deleteChannel(currentOrganization.id, id);
          window.location.reload();
      }
  };

  const handleChangeRole = async (userId: string, newRole: PageRole) => {
      if (!currentOrganization) return;
      if (window.confirm(`Kullanıcının rolünü ${newRole} olarak değiştirmek istiyor musunuz?`)) {
          const success = await updateUserPageRole(currentOrganization.id, userId, newRole);
          if (success) {
              setUsers(prev => prev.map(u => u.id === userId ? { ...u, pageRoles: { ...u.pageRoles, [currentOrganization.id]: newRole } } : u));
          }
      }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-t-3xl shadow-sm border border-gray-200 overflow-hidden relative">
        
        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Sayfa Yönetimi</h1>
                <p className="text-sm text-gray-500">Kanalları ve üyeleri yönet.</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('CHANNELS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'CHANNELS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                >
                    <Hash className="w-4 h-4" /> Kanallar
                </button>
                <button 
                    onClick={() => setActiveTab('MEMBERS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'MEMBERS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
                >
                    <Users className="w-4 h-4" /> Üyeler
                </button>
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative p-6 overflow-y-auto">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {activeTab === 'CHANNELS' && (
                        <div className="max-w-3xl mx-auto space-y-8">
                            {/* Create Box */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-green-500" /> Yeni Kanal Oluştur
                                </h3>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1 space-y-3">
                                        <input 
                                            value={newChannelName}
                                            onChange={e => setNewChannelName(e.target.value)}
                                            placeholder="Kanal Adı (Örn: Ön Büro)"
                                            className="w-full p-3 border rounded-xl"
                                        />
                                        <input 
                                            value={newChannelDesc}
                                            onChange={e => setNewChannelDesc(e.target.value)}
                                            placeholder="Açıklama (Opsiyonel)"
                                            className="w-full p-3 border rounded-xl text-sm"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleCreateChannel}
                                        disabled={isProcessing || !newChannelName}
                                        className="bg-primary text-white px-6 py-8 rounded-xl font-bold hover:bg-primary-light disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ekle'}
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="space-y-3">
                                {currentOrganization?.channels?.map(channel => (
                                    <div key={channel.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                                <Hash className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{channel.name}</div>
                                                <div className="text-xs text-gray-500">{channel.description}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteChannel(channel.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'MEMBERS' && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Kullanıcı</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Rol</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(user => {
                                        const role = user.pageRoles?.[currentOrganization?.id || ''] || 'MEMBER';
                                        return (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs">
                                                            {user.avatar}
                                                        </div>
                                                        <div className="font-bold text-sm text-gray-800">{user.name}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${role === 'ADMIN' ? 'bg-red-100 text-red-600' : role === 'MODERATOR' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                                        {role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {role !== 'ADMIN' && <button onClick={() => handleChangeRole(user.id, 'ADMIN')} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">Admin Yap</button>}
                                                        {role !== 'MODERATOR' && <button onClick={() => handleChangeRole(user.id, 'MODERATOR')} className="text-xs font-bold text-blue-500 hover:bg-blue-50 px-2 py-1 rounded">Moderatör Yap</button>}
                                                        {role !== 'MEMBER' && <button onClick={() => handleChangeRole(user.id, 'MEMBER')} className="text-xs font-bold text-gray-500 hover:bg-gray-100 px-2 py-1 rounded">Üye Yap</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );
};
