
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Hash, Loader2, Plus, Trash2, Edit2, ChevronRight, Lock, Globe
} from 'lucide-react';
import { User, PageRole } from '../../types';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { getOrganizationUsers } from '../../services/db';
import { createChannel, deleteChannel, updateUserPageRole } from '../../services/organizationService';

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
  }, [currentOrganization?.id]);

  const loadAllData = async () => {
      if (!currentOrganization) return;
      // Keep loading false if we just need to refresh users, org data is in store
      if (activeTab === 'MEMBERS') setLoading(true);
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
      if (!currentOrganization || !newChannelName.trim()) return;
      setIsProcessing(true);
      
      const channelData = await createChannel(currentOrganization.id, newChannelName, newChannelDesc, isPrivate);
      
      if (channelData) {
          // OPTIMISTIC UPDATE: Add to store immediately
          addLocalChannel(channelData);
          
          // Clear Form
          setNewChannelName('');
          setNewChannelDesc('');
          setIsPrivate(false);
      }
      setIsProcessing(false);
  };

  const handleDeleteChannel = async (id: string) => {
      if (!currentOrganization) return;
      if (window.confirm("Kanalı silmek istediğinize emin misiniz?")) {
          // Optimistic UI Removal
          removeLocalChannel(id);
          
          // Background Sync
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
        <div className="bg-white border-b border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
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
        <div className="flex-1 bg-gray-50 overflow-hidden relative p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'CHANNELS' && (
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* Stylish Creation Bar */}
                    <div className="bg-white p-2 pl-4 rounded-2xl shadow-lg border border-gray-100 flex flex-col md:flex-row items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-primary/10">
                        <div className="p-2 bg-gray-50 rounded-xl">
                            <Hash className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 w-full md:w-auto flex flex-col justify-center">
                            <input 
                                value={newChannelName}
                                onChange={e => setNewChannelName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                                placeholder="Yeni kanal adı..."
                                className="w-full bg-transparent border-none outline-none font-bold text-gray-800 placeholder-gray-300 text-sm"
                            />
                            <input 
                                value={newChannelDesc}
                                onChange={e => setNewChannelDesc(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                                placeholder="Kısa açıklama (opsiyonel)"
                                className="w-full bg-transparent border-none outline-none text-xs text-gray-500 placeholder-gray-300"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end pr-2">
                            <button 
                                onClick={() => setIsPrivate(!isPrivate)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isPrivate ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                            >
                                {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                {isPrivate ? 'Gizli' : 'Genel'}
                            </button>
                            <button 
                                onClick={handleCreateChannel}
                                disabled={isProcessing || !newChannelName}
                                className="bg-primary text-white p-3 rounded-xl font-bold hover:bg-primary-light disabled:opacity-50 transition-transform active:scale-95 shadow-md shadow-primary/20"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Animated List */}
                    <div className="space-y-3">
                        <AnimatePresence initial={false} mode='popLayout'>
                            {currentOrganization?.channels?.map((channel) => (
                                <motion.div 
                                    key={channel.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: -20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center group hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${channel.isPrivate ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                            {channel.isPrivate ? <Lock className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{channel.name}</div>
                                            <div className="text-xs text-gray-500">{channel.description || 'Açıklama yok'}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteChannel(channel.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {(!currentOrganization?.channels || currentOrganization.channels.length === 0) && (
                            <div className="text-center py-10 text-gray-400 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                                Henüz kanal oluşturulmadı.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'MEMBERS' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : (
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
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs overflow-hidden">
                                                        {user.avatar.length > 3 ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.avatar}
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
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
