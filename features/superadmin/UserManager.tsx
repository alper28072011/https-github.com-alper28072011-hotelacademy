
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    Search, Loader2, MoreVertical, Ban, CheckCircle, 
    Trash2, Eye, Shield, Filter, ChevronRight, User as UserIcon
} from 'lucide-react';
import { User, UserStatus } from '../../types';
import { getAllUsers, updateUserStatus, deleteUserComplete, PaginatedUsers } from '../../services/superAdminService';
import { useNavigate } from 'react-router-dom';

export const UserManager: React.FC = () => {
  const navigate = useNavigate();
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'BANNED' | 'MANAGERS'>('ALL');
  
  // --- LOAD DATA ---
  const loadUsers = useCallback(async (isLoadMore = false) => {
      setLoading(true);
      // If new search/filter, reset pagination
      const cursor = isLoadMore ? lastDoc : null;
      
      const result: PaginatedUsers = await getAllUsers(cursor, 20, searchTerm, filter);
      
      if (isLoadMore) {
          setUsers(prev => [...prev, ...result.users]);
      } else {
          setUsers(result.users);
      }
      
      setLastDoc(result.lastDoc);
      setLoading(false);
  }, [searchTerm, filter, lastDoc]);

  // Initial Load & Debounced Search Effect
  useEffect(() => {
      const timer = setTimeout(() => {
          loadUsers(false);
      }, 500); // 500ms debounce
      return () => clearTimeout(timer);
  }, [searchTerm, filter]);

  // --- ACTIONS ---
  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
      setActionLoading(userId);
      const success = await updateUserStatus(userId, newStatus);
      if (success) {
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      }
      setActionLoading(null);
  };

  const handleDelete = async (userId: string) => {
      if (!window.confirm("Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?")) return;
      setActionLoading(userId);
      const success = await deleteUserComplete(userId);
      if (success) {
          setUsers(prev => prev.filter(u => u.id !== userId));
      }
      setActionLoading(null);
  };

  // --- RENDER HELPERS ---
  const getStatusBadge = (status?: string) => {
      switch (status) {
          case 'BANNED': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">Yasaklı</span>;
          case 'SUSPENDED': return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">Askıda</span>;
          default: return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">Aktif</span>;
      }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[800px]">
        {/* 1. TOP BAR */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
            <div>
                <h2 className="text-xl font-bold text-gray-800">Kullanıcı Havuzu</h2>
                <p className="text-sm text-gray-500">Platformdaki tüm kullanıcıları yönet.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="İsim veya Telefon ara..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                    />
                </div>
                <div className="flex bg-gray-200 p-1 rounded-xl">
                    {(['ALL', 'MANAGERS', 'BANNED'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {f === 'ALL' ? 'Tümü' : f === 'MANAGERS' ? 'Yöneticiler' : 'Yasaklı'}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* 2. TABLE GRID */}
        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rol / Org</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kayıt</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50/80 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">
                                        {user.avatar.length > 3 ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{user.phoneNumber}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-800 capitalize flex items-center gap-1">
                                        {user.role}
                                        {user.isSuperAdmin && <Shield className="w-3 h-3 text-yellow-500" />}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {user.currentOrganizationId ? `Org: ${user.currentOrganizationId.substring(0,8)}...` : 'No Org'}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                {getStatusBadge(user.status)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => navigate(`/user/${user.id}`)}
                                        title="Profili Gör"
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    
                                    {user.status === 'BANNED' ? (
                                        <button 
                                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                                            disabled={!!actionLoading}
                                            title="Yasağı Kaldır"
                                            className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                                        >
                                            {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleStatusChange(user.id, 'BANNED')}
                                            disabled={!!actionLoading || user.isSuperAdmin}
                                            title="Engelle"
                                            className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors disabled:opacity-30"
                                        >
                                            {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => handleDelete(user.id)}
                                        disabled={!!actionLoading || user.isSuperAdmin}
                                        title="Sil"
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && !loading && (
                        <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                                <div className="flex flex-col items-center">
                                    <UserIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p>Kullanıcı bulunamadı.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* 3. FOOTER & PAGINATION */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center">
            {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
                </div>
            ) : (
                lastDoc && (
                    <button 
                        onClick={() => loadUsers(true)}
                        className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 shadow-sm hover:bg-gray-100 transition-all flex items-center gap-2"
                    >
                        Daha Fazla Yükle <ChevronRight className="w-4 h-4" />
                    </button>
                )
            )}
        </div>
    </div>
  );
};
