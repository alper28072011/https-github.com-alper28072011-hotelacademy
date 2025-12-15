
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Loader2, Ban, CheckCircle, 
    Trash2, Eye, Shield, ChevronRight, User as UserIcon, AlertTriangle, Building2, Crown
} from 'lucide-react';
import { User, UserStatus, Organization } from '../../types';
import { getAllUsers, updateUserStatus, deleteUserComplete, checkUserOwnership, deleteOrganizationFully, transferOwnership, PaginatedUsers } from '../../services/superAdminService';
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
          // Transfer to Super Admin (Placeholder logic for now)
          // In a real app, we'd select a new user ID.
          // Here we just delete the user, but leave the org orphaned (or assign to system).
          // For safety, let's just abort this branch in UI for now or assume a default logic.
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
          case 'BANNED': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">Yasaklı</span>;
          case 'SUSPENDED': return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">Askıda</span>;
          default: return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">Aktif</span>;
      }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[800px] relative">
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
                                        onClick={() => initiateDelete(user)}
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

        {/* --- THE JUDGE MODAL --- */}
        <AnimatePresence>
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                    >
                        {isCheckingOwnership ? (
                            <div className="p-10 flex flex-col items-center text-gray-500">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                                <p>Mülkiyet Kontrolü Yapılıyor...</p>
                            </div>
                        ) : (
                            <>
                                <div className={`p-6 border-b ${ownedOrg ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <h3 className={`text-lg font-bold flex items-center gap-2 ${ownedOrg ? 'text-red-700' : 'text-gray-800'}`}>
                                        <AlertTriangle className="w-6 h-6" />
                                        {ownedOrg ? "KRİTİK UYARI: İşletme Sahibi!" : "Kullanıcıyı Sil"}
                                    </h3>
                                </div>
                                
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-lg overflow-hidden">
                                            {deleteTarget.avatar.length > 3 ? <img src={deleteTarget.avatar} className="w-full h-full object-cover"/> : deleteTarget.avatar}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{deleteTarget.name}</div>
                                            <div className="text-xs text-gray-500">{deleteTarget.phoneNumber}</div>
                                        </div>
                                    </div>

                                    {ownedOrg ? (
                                        <div className="space-y-4">
                                            <div className="bg-red-50 p-4 rounded-xl text-sm text-red-700 border border-red-100 flex gap-3">
                                                <Building2 className="w-10 h-10 shrink-0 opacity-50" />
                                                <div>
                                                    <span className="font-bold block">{ownedOrg.name}</span>
                                                    Bu kullanıcı bir işletmenin sahibi. Silerseniz işletme verileri ne olacak?
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                <button 
                                                    onClick={() => executeDelete('WIPE_ALL')}
                                                    disabled={isProcessingDelete}
                                                    className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    {isProcessingDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    Her Şeyi Yok Et (Kullanıcı + Otel)
                                                </button>
                                                <button 
                                                    onClick={() => executeDelete('TRANSFER')}
                                                    className="p-3 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Crown className="w-4 h-4 text-yellow-500" />
                                                    Sahipliği Devret (Manuel)
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-gray-600 mb-6">
                                                Bu kullanıcıyı ve tüm verilerini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                            </p>
                                            <button 
                                                onClick={() => executeDelete('USER_ONLY')}
                                                disabled={isProcessingDelete}
                                                className="w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                            >
                                                {isProcessingDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                Evet, Sil
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                                    <button onClick={() => setDeleteTarget(null)} className="text-gray-500 font-bold text-sm hover:underline">
                                        İptal
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
