
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User as UserIcon, Loader2, Briefcase, Shield } from 'lucide-react';
import { JoinRequest, User, PermissionType } from '../../types';
import { getJoinRequests, approveJoinRequest, rejectJoinRequest } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

export const TeamRequests: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  const [requests, setRequests] = useState<(JoinRequest & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Approval Modal State
  const [selectedRequest, setSelectedRequest] = useState<(JoinRequest & { user?: User }) | null>(null);
  const [roleTitle, setRoleTitle] = useState('');
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = async () => {
      if (!currentOrganization || !currentUser) return;
      setLoading(true);
      
      // LOGIC FIX: Managers and Admins should see ALL requests. Only staff/supervisors might be restricted.
      const canSeeAll = ['admin', 'manager', 'super_admin'].includes(currentUser.role);
      
      // If Admin/Manager, fetch all (undefined). If Dept Head (future), fetch dept specific.
      // Use explicit undefined to trigger "fetch all" logic in db service
      const data = await getJoinRequests(currentOrganization.id, canSeeAll ? undefined : currentUser.department);
      
      setRequests(data);
      setLoading(false);
  };

  useEffect(() => {
      fetchRequests();
  }, [currentOrganization]);

  const openApprovalModal = (req: JoinRequest & { user?: User }) => {
      setSelectedRequest(req);
      setRoleTitle(req.requestedRoleTitle || 'Staff');
      setPermissions([]);
  };

  const handleApprove = async () => {
      if (!selectedRequest) return;
      setIsProcessing(true);
      
      const success = await approveJoinRequest(
          selectedRequest.id, 
          selectedRequest,
          roleTitle,
          permissions
      );

      if (success) {
          alert("Başarıyla onaylandı.");
          setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
          setSelectedRequest(null);
      } else {
          alert("İşlem sırasında bir hata oluştu.");
      }
      setIsProcessing(false);
  };

  const handleReject = async (id: string) => {
      if (window.confirm("Bu isteği reddetmek istediğinize emin misiniz?")) {
          const success = await rejectJoinRequest(id);
          if (success) {
              setRequests(prev => prev.filter(r => r.id !== id));
          } else {
              alert("İşlem başarısız.");
          }
      }
  };

  const togglePermission = (perm: PermissionType) => {
      if (permissions.includes(perm)) {
          setPermissions(permissions.filter(p => p !== perm));
      } else {
          setPermissions([...permissions, perm]);
      }
  };

  return (
    <div className="flex flex-col gap-6 pb-20 relative">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Katılım İstekleri</h1>
            <p className="text-gray-500">Ekibe katılmak isteyen adayları yönet.</p>
        </div>

        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                    {requests.map(req => (
                        <motion.div 
                            key={req.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                    {req.user?.avatar && req.user.avatar.length > 4 ? <img src={req.user.avatar} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-gray-400" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{req.user?.name || "Bilinmeyen Kullanıcı"}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Briefcase className="w-4 h-4" />
                                        <span>{req.requestedRoleTitle || "Belirtilmemiş"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-xl flex justify-between items-center text-sm">
                                <span className="text-gray-500">Departman:</span>
                                <span className="font-bold text-primary uppercase">{req.targetDepartment}</span>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button 
                                    onClick={() => handleReject(req.id)}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-5 h-5" /> Reddet
                                </button>
                                <button 
                                    onClick={() => openApprovalModal(req)}
                                    className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-light shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Check className="w-5 h-5" /> İncele & Onayla
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                
                {requests.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                        Bekleyen istek yok.
                    </div>
                )}
            </div>
        )}

        {/* APPROVAL MODAL */}
        <AnimatePresence>
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6"
                    >
                        <h2 className="text-xl font-bold text-gray-800 mb-6">Onay Detayları</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Atanacak Ünvan</label>
                                <input 
                                    value={roleTitle}
                                    onChange={e => setRoleTitle(e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-800 focus:border-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Ek Yetkiler (Opsiyonel)
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'CAN_CREATE_CONTENT', label: 'İçerik Üreticisi' },
                                        { id: 'CAN_MANAGE_TEAM', label: 'Takım Lideri' },
                                    ].map((perm: any) => (
                                        <div 
                                            key={perm.id}
                                            onClick={() => togglePermission(perm.id)}
                                            className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 ${permissions.includes(perm.id) ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                                        >
                                            <div className={`w-5 h-5 rounded flex items-center justify-center ${permissions.includes(perm.id) ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span className="text-sm font-bold text-gray-700">{perm.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setSelectedRequest(null)}
                                className="flex-1 py-3 text-gray-500 font-bold"
                            >
                                İptal
                            </button>
                            <button 
                                onClick={handleApprove}
                                disabled={isProcessing}
                                className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Onayla'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
