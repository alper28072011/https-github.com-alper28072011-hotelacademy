
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Hash, Loader2, Plus, Settings, Trash2, Edit2, Shield, MoreHorizontal
} from 'lucide-react';
import { User, Channel, PageRole } from '../../types';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getOrganizationUsers } from '../../services/db';
import { createChannel, deleteChannel, updateUserPageRole } from '../../services/organizationService';
import confetti from 'canvas-confetti';

export const OrganizationManager: React.FC = () => {
  const { currentOrganization, addLocalChannel, removeLocalChannel } = useOrganizationStore();
  
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
  }, [currentOrganization?.id]); // Only reload if ID changes, not on every store update

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
      
      // 1. Optimistic Update (Immediate UI Feedback)
      const tempId = `temp_${Date.now()}`;
      const optimisticChannel: Channel = {
          id: tempId, // This will be replaced on next full fetch, but visually fine for now
          name: newChannelName,
          description: newChannelDesc,
          isPrivate,
          managerIds: [],
          createdAt: Date.now()
      };

      addLocalChannel(optimisticChannel);
      
      // Reset Form Immediately
      setNewChannelName('');
      setNewChannelDesc('');
      setIsProcessing(true);

      // 2. Actual API Call
      try {
          const success = await createChannel(currentOrganization.id, optimisticChannel.name, optimisticChannel.description || '', isPrivate);
          if (!success) {
              // Rollback if failed
              removeLocalChannel(tempId);
              alert("Kanal oluşturulamadı.");
          } else {
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          }
      } catch (e) {
          console.error(e);
          removeLocalChannel(tempId);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDeleteChannel = async (id: string) => {
      if (!currentOrganization) return;
      
      if (window.confirm("Kanalı silmek istediğinize emin misiniz?")) {
          // 1. Optimistic Update
          removeLocalChannel(id);

          // 2. API Call
          await deleteChannel(currentOrganization.id, id);
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
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 z-20">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Sayfa Yönetimi</h1>
                <p className="text-sm text-gray-500">Kanalları ve üyeleri yönet.</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('CHANNELS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'CHANNELS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Hash className="w-4 h-4" /> Kanallar
                </button>
                <button 
                    onClick={() => setActiveTab('MEMBERS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'MEMBERS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Users className="w-4 h-4" /> Üyeler
                </button>
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative p-4 md:p-8 overflow-y-auto">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {activeTab === 'CHANNELS' && (
                        <div className="max-w-3xl mx-auto space-y-6">
                            
                            {/* CREATE BOX - Matched to Screenshot Style */}
                            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
                                        <Plus className="w-4 h-4 text-green-600" /> Yeni Kanal Oluştur
                                    </h3>
                                    <div className="flex flex-col md:flex-row gap-3 items-stretch">
                                        <div className="flex-1 space-y-2">
                                            <input 
                                                value={newChannelName}
                                                onChange={e => setNewChannelName(e.target.value)}
                                                placeholder="Kanal Adı (Örn: Ön Büro)"
                                                className="w-full px-4 py-3 bg-gray-800 text-white placeholder-gray-400 border border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                                            />
                                            <input 
                                                value={newChannelDesc}
                                                onChange={e => setNewChannelDesc(e.target.value)}
                                                placeholder="Açıklama (Opsiyonel)"
                                                className="w-full px-4 py-3 bg-gray-800 text-white placeholder-gray-400 border border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-medium"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleCreateChannel}
                                            disabled={isProcessing || !newChannelName}
                                            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                                        >
                                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ekle'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* CHANNEL LIST */}
                            <div className="space-y-3">
                                <AnimatePresence initial={false}>
                                    {currentOrganization?.channels?.map(channel => (
                                        <motion.div 
                                            key={channel.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center group hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                                                    <Hash className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{channel.name}</div>
                                                    <div className="text-xs text-gray-500">{channel.description || 'Açıklama yok'}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteChannel(channel.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {currentOrganization?.channels?.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 text-sm">Henüz kanal oluşturulmadı.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'MEMBERS' && (
                        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(user => {
                                        const role = user.pageRoles?.[currentOrganization?.id || ''] || 'MEMBER';
                                        return (
                                            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs border border-gray-200 text-gray-600 overflow-hidden">
                                                            {user.avatar && user.avatar.length > 3 ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.avatar}
                                                        </div>
                                                        <div className="font-bold text-sm text-gray-800">{user.name}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${role === 'ADMIN' ? 'bg-red-50 text-red-600 border border-red-100' : role === 'MODERATOR' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                        {role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <div className="relative group/actions">
                                                            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><MoreHorizontal className="w-4 h-4" /></button>
                                                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover/actions:block z-50 overflow-hidden">
                                                                {role !== 'ADMIN' && <button onClick={() => handleChangeRole(user.id, 'ADMIN')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Yönetici Yap</button>}
                                                                {role !== 'MODERATOR' && <button onClick={() => handleChangeRole(user.id, 'MODERATOR')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Moderatör Yap</button>}
                                                                {role !== 'MEMBER' && <button onClick={() => handleChangeRole(user.id, 'MEMBER')} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Üye Yap</button>}
                                                            </div>
                                                        </div>
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
