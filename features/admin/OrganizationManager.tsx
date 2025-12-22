
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Hash, Loader2, Plus, Settings, Trash2, Edit2, Shield, MoreHorizontal
} from 'lucide-react';
import { User, Channel, PageRole } from '../../types';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { getOrganizationUsers } from '../../services/db';
import { createChannel, deleteChannel, updateUserPageRole } from '../../services/organizationService';

export const OrganizationManager: React.FC = () => {
  const { currentOrganization, addLocalChannel, removeLocalChannel } = useOrganizationStore();
  const [activeTab, setActiveTab] = useState<'CHANNELS' | 'MEMBERS'>('CHANNELS');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  
  // Create Channel Form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  useEffect(() => {
      loadAllData();
  }, [currentOrganization?.id]);

  const loadAllData = async () => {
      if (!currentOrganization) return;
      setLoading(true);
      const allUsers = await getOrganizationUsers(currentOrganization.id);
      setUsers(allUsers);
      setLoading(false);
  };

  const handleCreateChannel = async () => {
      if (!currentOrganization || !newChannelName) return;
      const tempId = `temp_${Date.now()}`;
      addLocalChannel({ id: tempId, name: newChannelName, description: newChannelDesc, isPrivate: false, createdAt: Date.now() } as any);
      setNewChannelName(''); setNewChannelDesc('');
      await createChannel(currentOrganization.id, newChannelName, newChannelDesc, false);
  };

  const handleDeleteChannel = async (id: string) => {
      if (currentOrganization && confirm("Kanalı silmek istediğinize emin misiniz?")) {
          removeLocalChannel(id);
          await deleteChannel(currentOrganization.id, id);
      }
  };

  return (
    <div className="bg-white border border-[#d8dfea] min-h-[600px]">
        {/* Classic Tab Header */}
        <div className="bg-[#f7f7f7] border-b border-[#d8dfea] px-2 pt-2 flex gap-1">
            <button 
                onClick={() => setActiveTab('CHANNELS')}
                className={`px-4 py-2 text-[11px] font-bold border-t border-l border-r rounded-t-sm ${activeTab === 'CHANNELS' ? 'bg-white border-[#d8dfea] border-b-white text-[#333] -mb-px relative z-10' : 'bg-[#f7f7f7] border-transparent text-[#3b5998] hover:bg-[#eff0f5]'}`}
            >
                Kanallar
            </button>
            <button 
                onClick={() => setActiveTab('MEMBERS')}
                className={`px-4 py-2 text-[11px] font-bold border-t border-l border-r rounded-t-sm ${activeTab === 'MEMBERS' ? 'bg-white border-[#d8dfea] border-b-white text-[#333] -mb-px relative z-10' : 'bg-[#f7f7f7] border-transparent text-[#3b5998] hover:bg-[#eff0f5]'}`}
            >
                Üyeler ({users.length})
            </button>
        </div>

        <div className="p-4">
            {activeTab === 'CHANNELS' && (
                <div className="space-y-6">
                    {/* Create Box */}
                    <div className="bg-[#eff0f5] border border-[#d8dfea] p-3 flex flex-col md:flex-row gap-2 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Kanal Adı</label>
                            <input 
                                value={newChannelName} onChange={e => setNewChannelName(e.target.value)} 
                                className="w-full border border-[#bdc7d8] p-1 text-sm focus:border-[#3b5998] outline-none"
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Açıklama</label>
                            <input 
                                value={newChannelDesc} onChange={e => setNewChannelDesc(e.target.value)} 
                                className="w-full border border-[#bdc7d8] p-1 text-sm focus:border-[#3b5998] outline-none"
                            />
                        </div>
                        <button onClick={handleCreateChannel} className="bg-[#3b5998] text-white px-4 py-1 text-[11px] font-bold border border-[#29447e] h-[29px]">
                            Ekle
                        </button>
                    </div>

                    <div className="space-y-0 border-t border-[#d8dfea]">
                        {currentOrganization?.channels?.map(channel => (
                            <div key={channel.id} className="flex justify-between items-center p-3 border-b border-[#e9e9e9] hover:bg-[#f7f7f7]">
                                <div className="flex items-center gap-3">
                                    <Hash className="w-4 h-4 text-[#3b5998]" />
                                    <div>
                                        <div className="text-[13px] font-bold text-[#3b5998]">{channel.name}</div>
                                        <div className="text-[11px] text-gray-500">{channel.description}</div>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteChannel(channel.id)} className="text-[#3b5998] hover:underline text-[10px]">Sil</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'MEMBERS' && (
                <div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f7f7] border-b border-[#d8dfea]">
                                <th className="p-2 text-[11px] font-bold text-gray-600">Fotoğraf</th>
                                <th className="p-2 text-[11px] font-bold text-gray-600">İsim</th>
                                <th className="p-2 text-[11px] font-bold text-gray-600">Rol</th>
                                <th className="p-2 text-[11px] font-bold text-gray-600 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-[#e9e9e9] hover:bg-[#fff9d7]">
                                    <td className="p-2">
                                        <div className="w-8 h-8 bg-gray-200 border border-[#ccc]">
                                            {user.avatar.length > 3 && <img src={user.avatar} className="w-full h-full object-cover" />}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <div className="text-[13px] font-bold text-[#3b5998] hover:underline cursor-pointer">{user.name}</div>
                                    </td>
                                    <td className="p-2 text-[11px] text-gray-600">
                                        {user.pageRoles?.[currentOrganization?.id || ''] || 'Üye'}
                                    </td>
                                    <td className="p-2 text-right">
                                        <button className="text-[#3b5998] text-[10px] hover:underline">Düzenle</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
  );
};
