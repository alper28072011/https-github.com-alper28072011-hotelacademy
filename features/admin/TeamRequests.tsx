
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User as UserIcon, Loader2, Briefcase } from 'lucide-react';
import { JoinRequest, User } from '../../types';
import { getJoinRequests, approveJoinRequest, rejectJoinRequest } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

export const TeamRequests: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  const [requests, setRequests] = useState<(JoinRequest & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
      if (!currentOrganization || !currentUser) return;
      setLoading(true);
      // If Admin/Manager, fetch all. If Dept Head, fetch dept specific (Logic handled in DB service)
      const data = await getJoinRequests(currentOrganization.id, currentUser.role === 'admin' ? undefined : currentUser.department);
      setRequests(data);
      setLoading(false);
  };

  useEffect(() => {
      fetchRequests();
  }, [currentOrganization]);

  const handleApprove = async (req: JoinRequest) => {
      setProcessingId(req.id);
      const success = await approveJoinRequest(req.id, req);
      if (success) {
          setRequests(prev => prev.filter(r => r.id !== req.id));
      }
      setProcessingId(null);
  };

  const handleReject = async (id: string) => {
      setProcessingId(id);
      const success = await rejectJoinRequest(id);
      if (success) {
          setRequests(prev => prev.filter(r => r.id !== id));
      }
      setProcessingId(null);
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
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
                                <span className="font-bold text-primary uppercase">{req.targetDepartment.replace('_', ' ')}</span>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button 
                                    onClick={() => handleReject(req.id)}
                                    disabled={!!processingId}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-5 h-5" /> Reddet
                                </button>
                                <button 
                                    onClick={() => handleApprove(req)}
                                    disabled={!!processingId}
                                    className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-light shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {processingId === req.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Onayla</>}
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
    </div>
  );
};
