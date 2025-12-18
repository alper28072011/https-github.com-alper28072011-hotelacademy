
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User as UserIcon, Loader2, Briefcase, Shield, AlertCircle, ChevronRight } from 'lucide-react';
import { JoinRequest, User, PermissionType, Position } from '../../types';
import { getJoinRequests, approveJoinRequest, rejectJoinRequest } from '../../services/db';
import { occupyPosition, getOrgPositions } from '../../services/organizationService';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

export const TeamRequests: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  const [requests, setRequests] = useState<(JoinRequest & { user?: User })[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
      if (!currentOrganization || !currentUser) return;
      setLoading(true);
      const [reqData, posData] = await Promise.all([
          getJoinRequests(currentOrganization.id, currentUser.role === 'admin' ? undefined : currentUser.department),
          getOrgPositions(currentOrganization.id)
      ]);
      setRequests(reqData);
      setPositions(posData);
      setLoading(false);
  };

  useEffect(() => {
      fetchData();
  }, [currentOrganization]);

  const handleApprovePositioned = async (req: JoinRequest & { user?: User }) => {
      if (!req.user || !currentOrganization) return;
      setIsProcessing(true);

      // 1. Find the target position from the request
      const targetPos = positions.find(p => p.title === req.requestedRoleTitle && p.departmentId === req.targetDepartment && p.occupantId === null);
      
      if (!targetPos) {
          alert("Maalesef bu pozisyon için şu an boş koltuk kalmamış. Lütfen şemadan yeni bir koltuk açın.");
          setIsProcessing(false);
          return;
      }

      // 2. Perform Smart Occupancy (Handles Position, User, Membership and Mandatory Courses)
      const success = await occupyPosition(targetPos.id, req.userId);
      
      if (success) {
          // 3. Mark request as APPROVED in DB
          await approveJoinRequest(req.id, req, targetPos.title, []);
          setRequests(prev => prev.filter(r => r.id !== req.id));
      } else {
          alert("Onay işlemi sırasında bir hata oluştu.");
      }
      
      setIsProcessing(false);
  };

  const handleReject = async (id: string) => {
      const success = await rejectJoinRequest(id);
      if (success) {
          setRequests(prev => prev.filter(r => r.id !== id));
      }
  };

  return (
    <div className="flex flex-col gap-6 pb-20 relative">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Katılım İstekleri</h1>
            <p className="text-gray-500 text-sm">Ekibe katılmak isteyen adayları hiyerarşideki koltuklara yerleştir.</p>
        </div>

        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                    {requests.map(req => {
                        const vacantSlot = positions.find(p => p.title === req.requestedRoleTitle && p.occupantId === null);
                        return (
                            <motion.div 
                                key={req.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-5 group hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                        {req.user?.avatar && req.user.avatar.length > 4 ? <img src={req.user.avatar} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-gray-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 text-lg truncate">{req.user?.name || "Bilinmeyen Kullanıcı"}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <Briefcase className="w-3 h-3" /> {req.requestedRoleTitle}
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-2xl border-2 flex items-center justify-between ${vacantSlot ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${vacantSlot ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {vacantSlot ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className={`text-[10px] font-black uppercase ${vacantSlot ? 'text-green-600' : 'text-red-600'}`}>
                                                {vacantSlot ? 'UYGUN KOLTUK' : 'KOLTUK YOK'}
                                            </div>
                                            <div className="text-xs font-bold text-gray-800">{req.requestedRoleTitle} slotu {vacantSlot ? 'bekliyor' : 'bulunamadı'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleReject(req.id)}
                                        className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-400 font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
                                    >
                                        Reddet
                                    </button>
                                    <button 
                                        onClick={() => handleApprovePositioned(req)}
                                        disabled={isProcessing || !vacantSlot}
                                        className="flex-[2] py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-light shadow-lg disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Koltuk Atamasını Onayla'}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                
                {requests.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-10" />
                        <p className="font-medium">Bekleyen katılım isteği bulunmuyor.</p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
