
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Loader2, Ban, CheckCircle, 
    Trash2, Eye, Shield, ChevronRight, User as UserIcon, AlertTriangle, Building2, Crown, X
} from 'lucide-react';
import { User, UserStatus, Organization } from '../../types';
import { getAllUsers, updateUserStatus, deleteUserComplete, checkUserOwnership, deleteOrganizationFully, PaginatedUsers } from '../../services/superAdminService';
import { useNavigate } from 'react-router-dom';

export const UserManager: React.FC = () => {
  const navigate = useNavigate();
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Judge Modal State
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [ownedOrg, setOwnedOrg] = useState<Organization | null>(null);
  const [isCheckingOwnership, setIsCheckingOwnership] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'BANNED' | 'MANAGERS'>('ALL');
  
  // --- LOAD DATA ---
  const loadUsers = useCallback(async (isLoadMore = false) => {
      setLoading(true);
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

  useEffect(() => {
      const timer = setTimeout(() => {
          loadUsers(false);
      }, 500); 
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

  // Step 1: Initiate Delete - Check Ownership
  const initiateDelete = async (user: User) => {
      setDeleteTarget(user);
      setIsCheckingOwnership(true);
      
      const org = await checkUserOwnership(user.id);
      setOwnedOrg(org);
      
      setIsCheckingOwnership(false);
  };

  // Step 2: Execute Judge Decision
  const executeDelete = async (mode: 'USER_ONLY' | 'WIPE_ALL' | 'TRANSFER') => {
      if (!deleteTarget) return;
      setIsProcessingDelete(true);

      let success = false;

      if (mode === 'USER_ONLY') {
          // Standard user delete
          success = await deleteUserComplete(deleteTarget.id);
      } else if (mode === 'WIPE_ALL') {
          // Delete Org + User
          if (ownedOrg) await deleteOrganizationFully(ownedOrg.id);
          success = await deleteUserComplete(deleteTarget.id);
      } else if (mode === 'TRANSFER') {
          alert("Otomatik devir şu an pasif. Lütfen otel ayarlarından manuel devredin.");
          setIsProcessingDelete(false);
          return;
      }

      if (success) {
          setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
          setDeleteTarget(null);
          setOwnedOrg(null);
      }
      setIsProcessingDelete(false);
  };

  // --- RENDER HELPERS ---
  const getStatusBadge = (status?: string) => {
      switch (status) {
          case 'BANNED': return <span className="px-1 bg-red-600 text-white text-[9px] font-bold uppercase">Yasaklı</span>;
          case 'SUSPENDED': return <span className="px-1 bg-orange-500 text-white text-[9px] font-bold uppercase">Askıda</span>;
          default: return <span className="px-1 bg-green-600 text-white text-[9px] font-bold uppercase">Aktif</span>;
      }
  };

  return (
    <div className="flex flex-col h-[700px] relative">
        {/* 1. TOP BAR */}
        <div className="p-3 bg-[#f7f7f7] border-b border-[#d8dfea] flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <span>Kullanıcı Ara:</span>
                <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border border-[#bdc7d8] px-2 py-0.5 w-48 focus:border-[#3b5998] outline-none"
                />
            </div>

            <div className="flex gap-1">
                {(['ALL', 'MANAGERS', 'BANNED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-0.5 text-[10px] font-bold border transition-colors ${
                            filter === f 
                            ? 'bg-[#6d84b4] text-white border-[#3b5998]' 
                            : 'bg-white text-[#3b5998] border-[#d8dfea] hover:bg-[#eff0f5]'
                        }`}
                    >
                        {f === 'ALL' ? 'Tümü' : f === 'MANAGERS' ? 'Yöneticiler' : 'Yasaklı'}
                    </button>
                ))}
            </div>
        </div>

        {/* 2. TABLE GRID */}
        <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-left border-collapse">
                <thead className="bg-[#f2f2f2] text-[#666] text-[10px] font-bold uppercase sticky top-0 border-b border-[#e9e9e9]">
                    <tr>
                        <th className="px-4 py-2 border-r border-[#e9e9e9]">Kullanıcı</th>
                        <th className="px-4 py-2 border-r border-[#e9e9e9]">Rol / Org</th>
                        <th className="px-4 py-2 border-r border-[#e9e9e9]">Durum</th>
                        <th className="px-4 py-2 border-r border-[#e9e9e9]">Kayıt</th>
                        <th className="px-4 py-2 text-right">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e9e9]">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-[#fff9d7] text-xs">
                            <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-[#e9e9e9] border border-[#ccc] flex items-center justify-center font-bold text-gray-500 text-[9px] overflow-hidden">
                                        {user.avatar.length > 3 ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#3b5998] cursor-pointer hover:underline" onClick={() => navigate(`/user/${user.id}`)}>{user.name}</div>
                                        <div className="text-[10px] text-gray-500 font-mono">{user.phoneNumber}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-2">
                                <span className="font-bold text-gray-700 capitalize flex items-center gap-1">
                                    {user.role}
                                    {user.isSuperAdmin && <Shield className="w-3 h-3 text-yellow-600" />}
                                </span>
                                <span className="text-[10px] text-gray-400 block">
                                    {user.currentOrganizationId ? `Org: ${user.currentOrganizationId.substring(0,8)}...` : '-'}
                                </span>
                            </td>
                            <td className="px-4 py-2">
                                {getStatusBadge(user.status)}
                            </td>
                            <td className="px-4 py-2 text-gray-500">
                                {user.joinDate ? new Date(user.joinDate).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-2 text-right">
                                <div className="flex justify-end gap-1">
                                    {user.status === 'BANNED' ? (
                                        <button 
                                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                                            className="text-green-600 hover:underline font-bold"
                                        >
                                            Aç
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleStatusChange(user.id, 'BANNED')}
                                            disabled={user.isSuperAdmin}
                                            className="text-orange-600 hover:underline font-bold disabled:opacity-30"
                                        >
                                            Yasakla
                                        </button>
                                    )}
                                    <span className="text-gray-300">|</span>
                                    <button 
                                        onClick={() => initiateDelete(user)}
                                        disabled={user.isSuperAdmin}
                                        className="text-red-600 hover:underline font-bold disabled:opacity-30"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && !loading && (
                        <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                                Veri bulunamadı.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* 3. FOOTER */}
        <div className="p-2 border-t border-[#d8dfea] bg-[#f7f7f7] flex justify-center">
            {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" /> Yükleniyor...
                </div>
            ) : (
                lastDoc && (
                    <button 
                        onClick={() => loadUsers(true)}
                        className="text-[#3b5998] font-bold text-xs hover:underline"
                    >
                        Daha Fazla Göster ▼
                    </button>
                )
            )}
        </div>

        {/* --- THE JUDGE MODAL (RETRO STYLE) --- */}
        <AnimatePresence>
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white border-[4px] border-[#555] shadow-xl max-w-md w-full"
                    >
                        {/* Modal Header */}
                        <div className="bg-[#3b5998] text-white px-2 py-1 text-xs font-bold flex justify-between items-center">
                            <span>{ownedOrg ? "KRİTİK UYARI" : "Kullanıcıyı Sil"}</span>
                            <button onClick={() => setDeleteTarget(null)} className="hover:bg-[#2d4373]"><X className="w-4 h-4" /></button>
                        </div>

                        {isCheckingOwnership ? (
                            <div className="p-8 text-center text-gray-500 text-xs">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#3b5998]" />
                                Mülkiyet Kontrolü...
                            </div>
                        ) : (
                            <div className="p-4">
                                <div className="bg-[#fff9d7] border border-[#e2c822] p-2 text-xs text-[#333] mb-4">
                                    <span className="font-bold">{deleteTarget.name}</span> kullanıcısı üzerinde işlem yapıyorsunuz.
                                </div>

                                {ownedOrg ? (
                                    <div className="space-y-4">
                                        <div className="text-xs text-red-600 font-bold border border-red-200 bg-red-50 p-2">
                                            DİKKAT: Bu kullanıcı <span className="underline">{ownedOrg.name}</span> işletmesinin sahibi.
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={() => executeDelete('WIPE_ALL')}
                                                disabled={isProcessingDelete}
                                                className="bg-red-700 text-white py-2 px-4 text-xs font-bold border border-red-800 hover:bg-red-800"
                                            >
                                                {isProcessingDelete ? 'İşleniyor...' : 'Her Şeyi Sil (Kullanıcı + Otel)'}
                                            </button>
                                            <button 
                                                onClick={() => executeDelete('TRANSFER')}
                                                className="bg-[#f7f7f7] text-[#333] py-2 px-4 text-xs font-bold border border-[#ccc] hover:bg-[#e9e9e9]"
                                            >
                                                Sahipliği Devret (Manuel)
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-xs text-gray-700 mb-4">
                                            Bu kullanıcıyı ve tüm verilerini (kurslar, paylaşımlar) kalıcı olarak silmek istediğinize emin misiniz?
                                        </p>
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => executeDelete('USER_ONLY')}
                                                disabled={isProcessingDelete}
                                                className="bg-[#3b5998] text-white px-4 py-1 text-xs font-bold border border-[#29447e]"
                                            >
                                                {isProcessingDelete ? 'Siliniyor...' : 'Evet, Sil'}
                                            </button>
                                            <button 
                                                onClick={() => setDeleteTarget(null)}
                                                className="bg-white text-[#333] px-4 py-1 text-xs font-bold border border-[#999]"
                                            >
                                                İptal
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
