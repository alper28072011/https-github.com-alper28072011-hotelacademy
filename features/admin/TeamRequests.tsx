
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User as UserIcon, Loader2, Shield } from 'lucide-react';
import { JoinRequest, User, PermissionType } from '../../types';
import { getJoinRequests, approveJoinRequest, rejectJoinRequest } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

export const TeamRequests: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  const [requests, setRequests] = useState<(JoinRequest & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Approval State
  const [selectedRequest, setSelectedRequest] = useState<(JoinRequest & { user?: User }) | null>(null);
  const [roleTitle, setRoleTitle] = useState('');
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
      const fetchRequests = async () => {
          if (!currentOrganization || !currentUser) return;
          setLoading(true);
          const canSeeAll = ['admin', 'manager', 'super_admin'].includes(currentUser.role);
          const data = await getJoinRequests(currentOrganization.id, canSeeAll ? undefined : currentUser.department);
          setRequests(data);
          setLoading(false);
      };
      fetchRequests();
  }, [currentOrganization]);

  const handleApprove = async () => {
      if (!selectedRequest) return;
      setIsProcessing(true);
      const success = await approveJoinRequest(selectedRequest.id, selectedRequest, roleTitle, permissions);
      if (success) {
          setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
          setSelectedRequest(null);
      }
      setIsProcessing(false);
  };

  const handleReject = async (id: string) => {
      if (confirm("Bu isteği reddetmek istediğinize emin misiniz?")) {
          const success = await rejectJoinRequest(id);
          if (success) setRequests(prev => prev.filter(r => r.id !== id));
      }
  };

  const togglePermission = (perm: PermissionType) => {
      setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  return (
    <div className="space-y-4">
        {/* Page Header Container */}
        <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-3">
            <h1 className="text-sm font-bold text-[#333]">Katılım İstekleri</h1>
            <p className="text-[11px] text-gray-500">Ekibe katılmak isteyen {requests.length} aday var.</p>
        </div>

        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>
        ) : (
            <div className="space-y-0">
                {requests.map((req, idx) => (
                    <div 
                        key={req.id}
                        className={`flex gap-3 p-3 bg-white ${idx !== requests.length - 1 ? 'border-b border-[#e9e9e9]' : ''}`}
                    >
                        {/* Avatar */}
                        <div className="shrink-0 w-[50px] h-[50px] border border-[#d8dfea] p-0.5 bg-white">
                            {req.user?.avatar && req.user.avatar.length > 4 ? (
                                <img src={req.user.avatar} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#f7f7f7] flex items-center justify-center text-gray-300">
                                    <UserIcon className="w-6 h-6" />
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col md:flex-row justify-between gap-3">
                            <div>
                                <div className="text-[13px] font-bold text-[#3b5998] hover:underline cursor-pointer">
                                    {req.user?.name || "İsimsiz Kullanıcı"}
                                </div>
                                <div className="text-[11px] text-gray-600 mt-0.5">
                                    Talep: <span className="font-bold">{req.requestedRoleTitle || 'Personel'}</span>
                                    <span className="mx-1">•</span>
                                    {req.targetDepartment || 'Genel'}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                    {new Date(req.createdAt).toLocaleDateString()} tarihinde başvurdu
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <button 
                                    onClick={() => { setSelectedRequest(req); setRoleTitle(req.requestedRoleTitle || ''); setPermissions([]); }}
                                    className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-3 py-1 text-[11px] font-bold border border-[#29447e] cursor-pointer"
                                >
                                    Onayla
                                </button>
                                <button 
                                    onClick={() => handleReject(req.id)}
                                    className="bg-[#f7f7f7] hover:bg-[#e9e9e9] text-[#333] px-3 py-1 text-[11px] font-bold border border-[#d8dfea] cursor-pointer"
                                >
                                    Yoksay
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                
                {requests.length === 0 && (
                    <div className="p-10 text-center text-gray-500 text-xs bg-white border border-[#d8dfea]">
                        Şu anda bekleyen katılım isteği bulunmamaktadır.
                    </div>
                )}
            </div>
        )}

        {/* RETRO MODAL */}
        <AnimatePresence>
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="bg-white w-full max-w-md border-[4px] border-[#555] shadow-xl"
                    >
                        {/* Classic Modal Header */}
                        <div className="bg-[#3b5998] text-white px-3 py-2 text-[13px] font-bold flex justify-between items-center">
                            <span>İsteği Onayla</span>
                            <button onClick={() => setSelectedRequest(null)} className="hover:bg-[#2d4373] px-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="bg-[#fff9d7] border border-[#e2c822] p-2 text-[11px] text-[#333]">
                                <span className="font-bold">{selectedRequest.user?.name}</span> adlı kullanıcıyı ekibinize eklemek üzeresiniz.
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Atanacak Ünvan:</label>
                                <input 
                                    value={roleTitle}
                                    onChange={e => setRoleTitle(e.target.value)}
                                    className="w-full border border-[#bdc7d8] p-1 text-sm focus:border-[#3b5998] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 mb-1">Ek İzinler:</label>
                                <div className="border border-[#bdc7d8] p-2 h-32 overflow-y-auto bg-white">
                                    {[
                                        { id: 'CAN_CREATE_CONTENT', label: 'İçerik Üreticisi' },
                                        { id: 'CAN_MANAGE_TEAM', label: 'Takım Lideri' },
                                    ].map((perm: any) => (
                                        <div 
                                            key={perm.id}
                                            onClick={() => togglePermission(perm.id)}
                                            className={`flex items-center gap-2 p-1 cursor-pointer hover:bg-[#eff0f5] ${permissions.includes(perm.id) ? 'bg-[#d8dfea]' : ''}`}
                                        >
                                            <div className={`w-3 h-3 border border-gray-400 ${permissions.includes(perm.id) ? 'bg-[#3b5998] border-[#3b5998]' : 'bg-white'}`}></div>
                                            <span className="text-[11px]">{perm.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#f7f7f7] border-t border-[#ccc] p-3 flex justify-end gap-2">
                            <button 
                                onClick={handleApprove}
                                disabled={isProcessing}
                                className="bg-[#3b5998] text-white px-4 py-1 text-[11px] font-bold border border-[#29447e]"
                            >
                                {isProcessing ? 'İşleniyor...' : 'Kabul Et'}
                            </button>
                            <button 
                                onClick={() => setSelectedRequest(null)}
                                className="bg-white text-[#333] px-4 py-1 text-[11px] font-bold border border-[#999]"
                            >
                                İptal
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
