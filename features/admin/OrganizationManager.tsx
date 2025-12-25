
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Hash, Loader2, Settings, Trash2, Edit2, Shield, MoreHorizontal,
    UserPlus, UserMinus, Crown, Ban, CheckCircle2, User as UserIcon, X, Send
} from 'lucide-react';
import { User, Channel, PageRole } from '../../types';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { getOrganizationUsers } from '../../services/db';
import { 
    createChannel, 
    deleteChannel, 
    updateUserPageRole, 
    kickMember, 
    banMember,
    getRecruitableFollowers,
    inviteUserToOrg
} from '../../services/organizationService';

export const OrganizationManager: React.FC = () => {
  const { currentOrganization, addLocalChannel, removeLocalChannel } = useOrganizationStore();
  const [activeTab, setActiveTab] = useState<'CHANNELS' | 'MEMBERS'>('CHANNELS');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  
  // Create Channel Form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Modals
  const [selectedMember, setSelectedMember] = useState<User | null>(null); // For editing
  const [showRecruitModal, setShowRecruitModal] = useState(false); // For inviting
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
      // Ensure we have an org before loading
      if (currentOrganization) {
          loadAllData();
      }
  }, [currentOrganization?.id]);

  const loadAllData = async () => {
      if (!currentOrganization) return;
      setLoading(true);
      try {
          const allUsers = await getOrganizationUsers(currentOrganization.id);
          setUsers(allUsers || []);
      } catch (e) {
          console.error("Failed to load users", e);
      } finally {
          setLoading(false);
      }
  };

  const loadFollowers = async () => {
      if (!currentOrganization) return;
      setLoading(true);
      try {
          const data = await getRecruitableFollowers(currentOrganization.id);
          setFollowers(data);
      } catch (e) {
          console.error("Failed to load followers", e);
      } finally {
          setLoading(false);
      }
  };

  // ... (Rest of the component logic remains the same, assuming actions) ...
  // --- CHANNEL ACTIONS ---
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

  // --- MEMBER ACTIONS ---
  const handleRoleChange = async (userId: string, newRole: PageRole) => {
      if (!currentOrganization) return;
      setIsProcessing(true);
      await updateUserPageRole(currentOrganization.id, userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { 
          ...u, 
          pageRoles: { ...u.pageRoles, [currentOrganization.id]: { role: newRole, title: newRole === 'ADMIN' ? 'Yönetici' : 'Üye' } } 
      } : u));
      setIsProcessing(false);
      setSelectedMember(null);
  };

  const handleKickMember = async (userId: string) => {
      if (!currentOrganization || !confirm("Kullanıcıyı organizasyondan çıkarmak üzeresiniz. Emin misiniz?")) return;
      setIsProcessing(true);
      const success = await kickMember(currentOrganization.id, userId);
      if (success) {
          setUsers(prev => prev.filter(u => u.id !== userId));
          setSelectedMember(null);
      }
      setIsProcessing(false);
  };

  const handleBanMember = async (userId: string) => {
      if (!currentOrganization || !confirm("Kullanıcıyı askıya almak üzeresiniz. Erişimi kesilecektir.")) return;
      setIsProcessing(true);
      await banMember(currentOrganization.id, userId);
      alert("Kullanıcı askıya alındı.");
      setIsProcessing(false);
      setSelectedMember(null);
  };

  const handleInviteUser = async (userId: string) => {
      if (!currentOrganization) return;
      await inviteUserToOrg(currentOrganization.id, userId, currentOrganization.name);
      setFollowers(prev => prev.filter(u => u.id !== userId));
      alert("Davet gönderildi.");
  };

  const getMemberRole = (user: User) => {
      const roleData = user.pageRoles?.[currentOrganization?.id || ''];
      if (typeof roleData === 'string') return roleData;
      return roleData?.role || 'MEMBER';
  };

  if (!currentOrganization) return null; // Should be handled by layout but extra safety

  return (
    <div className="bg-white border border-[#d8dfea] min-h-[600px] relative">
        {/* Classic Tab Header */}
        <div className="bg-[#f7f7f7] border-b border-[#d8dfea] px-2 pt-2 flex justify-between items-center">
            <div className="flex gap-1">
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
            
            {activeTab === 'MEMBERS' && (
                <button 
                    onClick={() => { setShowRecruitModal(true); loadFollowers(); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#3b5998] hover:underline mb-1 mr-2"
                >
                    <UserPlus className="w-3 h-3" /> Üye Davet Et
                </button>
            )}
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
                    {loading ? <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div> : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f7f7f7] border-b border-[#d8dfea]">
                                    <th className="p-2 text-[11px] font-bold text-gray-600">Fotoğraf</th>
                                    <th className="p-2 text-[11px] font-bold text-gray-600">İsim & Kayıt</th>
                                    <th className="p-2 text-[11px] font-bold text-gray-600">Rol</th>
                                    <th className="p-2 text-[11px] font-bold text-gray-600 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-[#e9e9e9] hover:bg-[#fff9d7]">
                                        <td className="p-2 w-12">
                                            <div className="w-8 h-8 bg-gray-200 border border-[#ccc]">
                                                {user.avatar.length > 3 && <img src={user.avatar} className="w-full h-full object-cover" />}
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <div className="text-[13px] font-bold text-[#3b5998] hover:underline cursor-pointer">{user.name}</div>
                                            <div className="text-[10px] text-gray-400">
                                                Katılım: {new Date(user.joinDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                getMemberRole(user) === 'ADMIN' 
                                                ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                                                : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                                {getMemberRole(user)}
                                            </span>
                                        </td>
                                        <td className="p-2 text-right">
                                            <button 
                                                onClick={() => setSelectedMember(user)}
                                                className="bg-[#f7f7f7] border border-[#ccc] text-[#333] px-3 py-1 text-[10px] font-bold hover:bg-[#e9e9e9]"
                                            >
                                                Yönet
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>

        {/* --- MEMBER DETAIL MODAL --- */}
        <AnimatePresence>
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="bg-white border-[4px] border-[#555] shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="bg-[#3b5998] text-white px-3 py-2 text-[13px] font-bold flex justify-between items-center">
                            <span>Üye Yönetimi: {selectedMember.name}</span>
                            <button onClick={() => setSelectedMember(null)} className="hover:bg-[#2d4373] p-1"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Profile Summary */}
                            <div className="flex items-center gap-4 border-b border-[#eee] pb-4">
                                <div className="w-16 h-16 bg-gray-200 border border-[#ccc] shrink-0">
                                    {selectedMember.avatar.length > 3 && <img src={selectedMember.avatar} className="w-full h-full object-cover" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#3b5998]">{selectedMember.name}</h3>
                                    <p className="text-xs text-gray-500">{selectedMember.email}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[10px] bg-[#f7f7f7] border px-1">XP: {selectedMember.xp}</span>
                                        <span className="text-[10px] bg-[#f7f7f7] border px-1">Level: {selectedMember.creatorLevel}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 1. Role Management */}
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                    <Crown className="w-3 h-3" /> Yetkilendirme
                                </h4>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleRoleChange(selectedMember.id, 'MEMBER')}
                                        disabled={isProcessing}
                                        className={`flex-1 py-2 text-xs font-bold border ${getMemberRole(selectedMember) === 'MEMBER' ? 'bg-[#d8dfea] border-[#3b5998] text-[#3b5998]' : 'bg-white border-[#ccc] text-gray-500'}`}
                                    >
                                        Standart Üye
                                    </button>
                                    <button 
                                        onClick={() => handleRoleChange(selectedMember.id, 'MODERATOR')}
                                        disabled={isProcessing}
                                        className={`flex-1 py-2 text-xs font-bold border ${getMemberRole(selectedMember) === 'MODERATOR' ? 'bg-[#d8dfea] border-[#3b5998] text-[#3b5998]' : 'bg-white border-[#ccc] text-gray-500'}`}
                                    >
                                        Moderatör
                                    </button>
                                    <button 
                                        onClick={() => handleRoleChange(selectedMember.id, 'ADMIN')}
                                        disabled={isProcessing}
                                        className={`flex-1 py-2 text-xs font-bold border ${getMemberRole(selectedMember) === 'ADMIN' ? 'bg-[#d8dfea] border-[#3b5998] text-[#3b5998]' : 'bg-white border-[#ccc] text-gray-500'}`}
                                    >
                                        Yönetici (Admin)
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 italic">Adminler sayfa ayarlarını değiştirebilir ve içerik silebilir.</p>
                            </div>

                            {/* 2. Danger Zone */}
                            <div className="bg-[#fff0f0] border border-red-200 p-3">
                                <h4 className="text-[11px] font-bold text-red-600 uppercase mb-2 flex items-center gap-2">
                                    <Shield className="w-3 h-3" /> Erişim Kontrolü
                                </h4>
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => handleBanMember(selectedMember.id)}
                                        className="w-full flex items-center justify-between bg-white border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                                    >
                                        <span>Askıya Al (Girişi Engelle)</span>
                                        <Ban className="w-3 h-3" />
                                    </button>
                                    <button 
                                        onClick={() => handleKickMember(selectedMember.id)}
                                        className="w-full flex items-center justify-between bg-red-600 border border-red-800 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                                    >
                                        <span>Organizasyondan Çıkar</span>
                                        <UserMinus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* --- RECRUITMENT MODAL --- */}
        <AnimatePresence>
            {showRecruitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white border-[4px] border-[#555] shadow-2xl w-full max-w-lg h-[500px] flex flex-col"
                    >
                        <div className="bg-[#3b5998] text-white px-3 py-2 text-[13px] font-bold flex justify-between items-center shrink-0">
                            <span>Takipçileri Davet Et</span>
                            <button onClick={() => setShowRecruitModal(false)} className="hover:bg-[#2d4373] p-1"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-2 bg-[#f7f7f7] border-b border-[#ccc] text-[11px] text-gray-600 flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            Bu kullanıcılar sayfanızı takip ediyor ancak henüz üye değiller.
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? <div className="flex justify-center mt-10"><Loader2 className="w-6 h-6 animate-spin text-[#3b5998]" /></div> : (
                                <div className="space-y-2">
                                    {followers.map(user => (
                                        <div key={user.id} className="flex items-center gap-3 p-2 border border-[#d8dfea] bg-white hover:bg-[#f0f2f5] transition-colors">
                                            <div className="w-8 h-8 bg-gray-200 border border-[#ccc]">
                                                {user.avatar.length > 3 && <img src={user.avatar} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-xs text-[#333]">{user.name}</div>
                                                <div className="text-[10px] text-gray-500 truncate">{user.bio || 'Kullanıcı'}</div>
                                            </div>
                                            <button 
                                                onClick={() => handleInviteUser(user.id)}
                                                className="bg-[#3b5998] text-white px-3 py-1 text-[10px] font-bold border border-[#29447e] flex items-center gap-1 hover:bg-[#2d4373]"
                                            >
                                                <Send className="w-3 h-3" /> Davet Et
                                            </button>
                                        </div>
                                    ))}
                                    {followers.length === 0 && (
                                        <div className="text-center text-gray-400 text-xs mt-10 p-4 border-2 border-dashed border-[#ccc]">
                                            Davet edilecek takipçi bulunamadı.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
