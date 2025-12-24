
import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { getOrganizationUsers } from '../../services/db';
import { Loader2, TrendingUp, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';

export const StaffManager: React.FC = () => {
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'ALL' | 'CHANNEL'>('ALL');
  const [managedChannelNames, setManagedChannelNames] = useState<string[]>([]);

  useEffect(() => {
      const init = async () => {
          if (!currentOrganization || !currentUser) return;
          setLoading(true);
          
          // 1. Determine Scope
          const isOwner = currentOrganization.ownerId === currentUser.id;
          // Check page role or if they manage any channels
          const managedChannels = currentOrganization.channels.filter(c => c.managerIds?.includes(currentUser.id));
          const isManager = managedChannels.length > 0;
          
          let userList = await getOrganizationUsers(currentOrganization.id);

          if (!isOwner && isManager) {
              setScope('CHANNEL');
              setManagedChannelNames(managedChannels.map(c => c.name));
              // Filter users: Only show those subscribed to managed channels
              const managedChannelIds = managedChannels.map(c => c.id);
              userList = userList.filter(u => 
                  u.channelSubscriptions?.some(id => managedChannelIds.includes(id))
              );
          } else {
              setScope('ALL');
          }

          setUsers(userList);
          setLoading(false);
      };
      init();
  }, [currentOrganization, currentUser]);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>;

  return (
    <div className="space-y-4">
       {/* Header */}
       <div className="bg-[#6d84b4] border border-[#3b5998] text-white p-2 font-bold text-sm flex justify-between items-center">
           <span>Personel Performans Raporu</span>
           {scope === 'CHANNEL' && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Kapsam: {managedChannelNames.join(', ')}</span>}
       </div>

       <div className="bg-white border border-[#d8dfea]">
            {/* Stats Overview */}
            <div className="p-4 grid grid-cols-3 gap-4 border-b border-[#d8dfea]">
                <div className="text-center">
                    <div className="text-2xl font-bold text-[#3b5998]">{users.length}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Toplam Personel</div>
                </div>
                <div className="text-center border-l border-[#eee]">
                    <div className="text-2xl font-bold text-green-600">
                        {Math.round(users.reduce((acc, u) => acc + (u.xp > 0 ? 1 : 0), 0) / (users.length || 1) * 100)}%
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Aktif Katılım</div>
                </div>
                <div className="text-center border-l border-[#eee]">
                    <div className="text-2xl font-bold text-orange-500">
                        {users.reduce((acc, u) => acc + (u.completedCourses?.length || 0), 0)}
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Tamamlanan Eğitim</div>
                </div>
            </div>

            {/* User List */}
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-[#f7f7f7] border-b border-[#d8dfea]">
                        <th className="p-3 text-[11px] font-bold text-gray-600 uppercase">Personel</th>
                        <th className="p-3 text-[11px] font-bold text-gray-600 uppercase">Departman / Rol</th>
                        <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">XP & Seviye</th>
                        <th className="p-3 text-[11px] font-bold text-gray-600 uppercase text-right">Durum</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e9e9]">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-[#fff9d7] group transition-colors">
                            <td className="p-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-200 rounded border border-gray-300 overflow-hidden">
                                    {user.avatar.length > 3 && <img src={user.avatar} className="w-full h-full object-cover" />}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-[#3b5998]">{user.name}</div>
                                    <div className="text-[9px] text-gray-500">{user.email}</div>
                                </div>
                            </td>
                            <td className="p-3">
                                <span className="px-2 py-0.5 bg-[#eff0f5] border border-[#d8dfea] rounded text-[10px] font-bold text-gray-600">
                                    {user.department || 'Genel'}
                                </span>
                                <div className="text-[9px] text-gray-400 mt-1">{user.roleTitle || 'Personel'}</div>
                            </td>
                            <td className="p-3 text-right">
                                <div className="text-xs font-bold text-[#333]">{user.xp} XP</div>
                                <div className="text-[9px] text-gray-500">{user.creatorLevel}</div>
                            </td>
                            <td className="p-3 text-right">
                                {user.completedCourses.length > 0 ? (
                                    <span className="flex items-center justify-end gap-1 text-[10px] font-bold text-green-600">
                                        <CheckCircle2 className="w-3 h-3" /> Aktif
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-end gap-1 text-[10px] font-bold text-orange-400">
                                        <AlertCircle className="w-3 h-3" /> Başlamadı
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {users.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs">
                    {scope === 'CHANNEL' ? 'Yönettiğiniz kanallara abone olmuş personel bulunamadı.' : 'Henüz personel yok.'}
                </div>
            )}
       </div>
    </div>
  );
};
