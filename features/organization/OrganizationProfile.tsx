
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, MapPin, Globe, Loader2, CheckCircle2, UserPlus, 
    Users, Utensils, BedDouble, ConciergeBell, Settings, ShieldCheck, 
    BarChart3, Edit, Megaphone, Bell, Briefcase, GraduationCap, Laptop, Heart, ShoppingBag, Landmark, BellOff,
    Search, AlertCircle, ChevronRight, UserCheck
} from 'lucide-react';
import { getOrganizationDetails, sendJoinRequest, getMyMemberships, switchUserActiveOrganization } from '../../services/db';
import { getOrgPositions } from '../../services/organizationService';
import { Organization, DepartmentType, OrganizationSector, FollowStatus, Position } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { checkFollowStatus, followOrganizationSmart, unfollowUserSmart } from '../../services/socialService';
import confetti from 'canvas-confetti';

export const OrganizationProfile: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { currentUser, loginSuccess } = useAuthStore();
  const { switchOrganization } = useOrganizationStore();
  
  const [org, setOrg] = useState<Organization | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('NONE');
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPosId, setSelectedPosId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
        if (!orgId) return;
        setLoading(true);
        const [data, posData] = await Promise.all([
            getOrganizationDetails(orgId),
            getOrgPositions(orgId)
        ]);

        if (data) setOrg(data);
        setPositions(posData);
        
        if (currentUser) {
            const memberships = await getMyMemberships(currentUser.id);
            if (memberships.some(m => m.organizationId === orgId)) setIsMember(true);
            const status = await checkFollowStatus(currentUser.id, orgId);
            setFollowStatus(status);
        }
        setLoading(false);
    };
    init();
  }, [orgId, currentUser]);

  const handleJoinRequest = async () => {
      if (!currentUser || !org || !selectedPosId) return;
      setIsSubmitting(true);
      
      const selectedPos = positions.find(p => p.id === selectedPosId);
      
      const result = await sendJoinRequest(
          currentUser.id, 
          org.id, 
          selectedPos?.departmentId || 'General', 
          selectedPos?.title || ''
      );
      
      setIsSubmitting(false);
      
      if (result.success) {
          setShowWizard(false);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          alert("Açık pozisyon için başvurunuz iletildi. Onay bekleniyor.");
          navigate('/lobby');
      } else {
          alert(result.message || "Başvuru yapılamadı.");
      }
  };

  const handleFollow = async () => {
      if (!currentUser || !org || isFollowLoading) return;
      setIsFollowLoading(true);

      if (followStatus === 'FOLLOWING') {
          await unfollowUserSmart(currentUser.id, org.id);
          setFollowStatus('NONE');
          setOrg(prev => prev ? ({...prev, followersCount: Math.max(0, (prev.followersCount || 0) - 1)}) : null);
      } else {
          const res = await followOrganizationSmart(currentUser.id, org.id);
          if (res.success) {
              setFollowStatus('FOLLOWING');
              setOrg(prev => prev ? ({...prev, followersCount: (prev.followersCount || 0) + 1}) : null);
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          }
      }
      setIsFollowLoading(false);
  };

  const handleGoToPanel = async () => {
      if (!currentUser || !org) return;
      if (currentUser.currentOrganizationId === org.id) {
          navigate('/');
          return;
      }
      const success = await switchOrganization(org.id);
      if (success) {
          navigate('/');
          window.location.reload();
      }
  };

  const vacantPositions = positions.filter(p => p.occupantId === null);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!org) return <div>Organization not found</div>;

  return (
    <div className="min-h-screen bg-white pb-32 relative">
        {/* HERO */}
        <div className="relative h-80 w-full">
            <img 
                src={org.coverUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200'} 
                className="w-full h-full object-cover"
                alt="Cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <button onClick={() => navigate('/lobby')} className="absolute top-6 left-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white"><ArrowLeft className="w-6 h-6" /></button>
        </div>

        <div className="px-6 -mt-16 relative z-10">
            <div className="w-32 h-32 rounded-3xl bg-white p-1 shadow-2xl mb-4">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{org.name[0]}</span>}
                </div>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{org.name}</h1>
                <div className="flex gap-6 mt-2 pb-4 border-b border-gray-100">
                    <div className="text-center">
                        <div className="font-bold text-lg text-gray-900">{org.followersCount || 0}</div>
                        <div className="text-xs text-gray-400 uppercase font-black">Takipçi</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-lg text-gray-900">{org.memberCount || 0}</div>
                        <div className="text-xs text-gray-400 uppercase font-black">Ekip</div>
                    </div>
                </div>
            </div>

            {/* VACANT SLOTS SECTION */}
            <section className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Açık Pozisyonlar ({vacantPositions.length})
                    </h3>
                </div>
                
                {vacantPositions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                        {vacantPositions.map(pos => (
                            <div key={pos.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-accent transition-all">
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{pos.departmentId}</div>
                                    <div className="font-bold text-gray-800">{pos.title}</div>
                                </div>
                                <button 
                                    onClick={() => { setSelectedPosId(pos.id); setShowWizard(true); }}
                                    className="bg-white border-2 border-primary text-primary px-4 py-1.5 rounded-xl text-xs font-bold group-hover:bg-primary group-hover:text-white transition-all shadow-sm"
                                >
                                    Başvur
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 font-medium">Şu an aktif açık pozisyon bulunmuyor.</p>
                    </div>
                )}
            </section>
        </div>

        {/* ACTIONS */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-30">
            {isMember ? (
                <button onClick={handleGoToPanel} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6" /> Panele Git
                </button>
            ) : (
                <div className="flex gap-3">
                    <button onClick={handleFollow} disabled={isFollowLoading} className={`flex-1 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 ${followStatus === 'FOLLOWING' ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'}`}>
                        {isFollowLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : followStatus === 'FOLLOWING' ? 'Takiptesin' : 'Takip Et'}
                    </button>
                </div>
            )}
        </div>

        {/* JOIN MODAL */}
        <AnimatePresence>
            {showWizard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWizard(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Başvuru Onayı</h2>
                        <p className="text-gray-500 text-sm mb-8">
                            <b>{positions.find(p => p.id === selectedPosId)?.title}</b> koltuğu için katılım isteği göndermek istediğinize emin misiniz?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleJoinRequest}
                                disabled={isSubmitting}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Evet, Başvur'}
                            </button>
                            <button onClick={() => setShowWizard(false)} className="text-gray-400 font-bold text-sm">Vazgeç</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
