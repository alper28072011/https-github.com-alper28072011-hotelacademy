
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, MapPin, Globe, Loader2, CheckCircle2, UserPlus, 
    Users, Utensils, BedDouble, ConciergeBell, Settings, ShieldCheck, 
    BarChart3, Edit, Megaphone, Bell, Briefcase, GraduationCap, Laptop, Heart, ShoppingBag, Landmark, BellOff, ArrowRight, Clock
} from 'lucide-react';
import { getOrganizationDetails, sendJoinRequest, getMyMemberships, switchUserActiveOrganization, getUserPendingRequests } from '../../services/db';
import { Organization, DepartmentType, OrganizationSector, FollowStatus } from '../../types';
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
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('NONE');
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedPosId, setSelectedPosId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
        if (!orgId) return;
        setLoading(true);
        const data = await getOrganizationDetails(orgId);
        if (data) setOrg(data);
        
        if (currentUser) {
            // Check Membership
            const memberships = await getMyMemberships(currentUser.id);
            if (memberships.some(m => m.organizationId === orgId)) setIsMember(true);
            
            // Check Pending Requests
            const pending = await getUserPendingRequests(currentUser.id);
            if (pending.some(r => r.organizationId === orgId)) setHasPendingRequest(true);

            // Check follow status
            const status = await checkFollowStatus(currentUser.id, orgId);
            setFollowStatus(status);
        }
        setLoading(false);
    };
    init();
  }, [orgId, currentUser]);

  const handleJoin = async () => {
      if (!currentUser || !org || !selectedDeptId || !selectedPosId) return;
      setIsSubmitting(true);
      
      const deptDefinition = org.definitions?.departments.find(d => d.id === selectedDeptId);
      const protoDefinition = org.definitions?.positionPrototypes.find(p => p.id === selectedPosId);
      
      const roleTitle = protoDefinition?.title || 'Unknown';

      // FIX: Do NOT send selectedPosId as positionId because selectedPosId is a Prototype ID (e.g. proto_123), 
      // whereas the backend expects a real Position Node ID (seat) to occupy it.
      // Sending undefined means "General Application" for this role, not for a specific seat.
      const result = await sendJoinRequest(currentUser.id, org.id, selectedDeptId, roleTitle, undefined);
      
      setIsSubmitting(false);
      
      if (result.success) {
          setShowWizard(false);
          setHasPendingRequest(true); // Optimistic Update
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          alert("Başvuru gönderildi! Yönetici onayı bekleniyor.");
          navigate('/lobby');
      } else {
          alert(result.message || "Başvuru yapılamadı.");
          setShowWizard(false);
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
      } else {
          alert("Panele geçiş yapılamadı.");
      }
  };

  const canManage = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && currentUser.currentOrganizationId === orgId;

  const getSectorIcon = (sector: OrganizationSector) => {
      switch(sector) {
          case 'technology': return <Laptop className="w-4 h-4" />;
          case 'health': return <Heart className="w-4 h-4" />;
          case 'education': return <GraduationCap className="w-4 h-4" />;
          case 'retail': return <ShoppingBag className="w-4 h-4" />;
          case 'finance': return <Landmark className="w-4 h-4" />;
          case 'tourism': return <ConciergeBell className="w-4 h-4" />;
          default: return <Briefcase className="w-4 h-4" />;
      }
  };

  const getSectorLabel = (sector: OrganizationSector) => {
      const map: Record<string, string> = {
          'tourism': 'Turizm', 'technology': 'Teknoloji', 'health': 'Sağlık', 
          'education': 'Eğitim', 'retail': 'Perakende', 'finance': 'Finans', 'other': 'Genel'
      };
      return map[sector] || 'Genel';
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!org) return <div>Organization not found</div>;

  const availableDepartments = org.definitions?.departments || [];
  const activeDept = availableDepartments.find(d => d.id === selectedDeptId);
  const availablePositions = org.definitions?.positionPrototypes.filter(p => p.departmentId === selectedDeptId) || [];

  return (
    <div className="min-h-screen bg-white pb-24 relative">
        {/* HERO SECTION */}
        <div className="relative h-80 w-full">
            <img 
                src={org.coverUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200'} 
                className="w-full h-full object-cover"
                alt="Cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            <button 
                onClick={() => navigate('/lobby')}
                className="absolute top-6 left-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-all"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
        </div>

        {/* OWNER DASHBOARD PANEL */}
        {canManage && (
            <div className="px-6 -mt-10 relative z-20 mb-6">
                <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-2xl border border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck className="w-4 h-4 text-accent" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Kurum Yönetimi</h3>
                            </div>
                            <p className="text-xs text-gray-400">Son 30 günde 1.2k ziyaret</p>
                        </div>
                        <button 
                            onClick={() => navigate('/admin')}
                            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                            Panele Git
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => navigate('/admin/content')} className="bg-gray-800 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition-colors">
                            <Megaphone className="w-5 h-5 text-blue-400" />
                            <span className="text-[10px] font-bold">İçerik</span>
                        </button>
                        <button onClick={() => navigate('/admin/settings')} className="bg-gray-800 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition-colors">
                            <Edit className="w-5 h-5 text-green-400" />
                            <span className="text-[10px] font-bold">Düzenle</span>
                        </button>
                        <button onClick={() => navigate('/admin/reports')} className="bg-gray-800 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-700 transition-colors">
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                            <span className="text-[10px] font-bold">Analiz</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* PROFILE INFO */}
        <div className={`px-6 relative z-10 ${canManage ? '' : '-mt-16'}`}>
            <div className="w-32 h-32 rounded-3xl bg-white p-1 shadow-2xl mb-4">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{org.name[0]}</span>}
                </div>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{org.name}</h1>
                
                <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold mb-3 uppercase tracking-wide">
                    {getSectorIcon(org.sector)}
                    {getSectorLabel(org.sector)}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 font-medium">
                    {org.location && <div className="flex items-center gap-1"><MapPin className="w-4 h-4 text-accent" /> {org.location}</div>}
                    {org.website && <div className="flex items-center gap-1"><Globe className="w-4 h-4 text-blue-500" /> {org.website}</div>}
                </div>
                <div className="flex gap-6 mt-4 pb-4 border-b border-gray-100">
                    <div className="text-center">
                        <div className="font-bold text-lg text-gray-900">{org.followersCount || 0}</div>
                        <div className="text-xs text-gray-500">Takipçi</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-lg text-gray-900">{org.memberCount || 0}</div>
                        <div className="text-xs text-gray-500">Personel</div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8">
                <h3 className="font-bold text-gray-900 mb-2">Hakkımızda</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                    {org.description || "Dünyanın en iyi deneyimini sunmak için çalışan tutkulu bir ekibiz."}
                </p>
            </div>
        </div>

        {/* STICKY ACTIONS */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-30 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
            {isMember ? (
                <button 
                    onClick={handleGoToPanel}
                    className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <CheckCircle2 className="w-6 h-6" />
                    Panele Git
                </button>
            ) : hasPendingRequest ? (
                <div className="w-full bg-orange-100 text-orange-600 font-bold text-lg py-4 rounded-2xl shadow-none border border-orange-200 flex items-center justify-center gap-2 cursor-default">
                    <Clock className="w-6 h-6" />
                    Başvuru Değerlendiriliyor
                </div>
            ) : (
                <div className="flex gap-3">
                    <button 
                        onClick={handleFollow}
                        disabled={isFollowLoading}
                        className={`flex-1 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all ${followStatus === 'FOLLOWING' ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'}`}
                    >
                        {isFollowLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                         followStatus === 'FOLLOWING' ? <><BellOff className="w-5 h-5" /> Takiptesin</> : 
                         <><Bell className="w-5 h-5" /> Takip Et</>}
                    </button>
                    <button 
                        onClick={() => setShowWizard(true)}
                        className="flex-1 bg-primary text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-5 h-5" />
                        İşe Başvur
                    </button>
                </div>
            )}
        </div>

        {/* WIZARD MODAL (Structured) */}
        <AnimatePresence>
            {showWizard && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowWizard(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Başvuru Sihirbazı</h2>
                            <p className="text-gray-500 mb-8 text-sm">Doğru pozisyonu seçmek, eğitimlerini belirler.</p>

                            {/* STEP 1: Department Selection */}
                            {step === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Departman Seçiniz</label>
                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                        {availableDepartments.length > 0 ? (
                                            availableDepartments.map((dept) => (
                                                <button 
                                                    key={dept.id}
                                                    onClick={() => { setSelectedDeptId(dept.id); setStep(2); }}
                                                    className="p-4 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary/5 flex items-center justify-between transition-all group text-left"
                                                >
                                                    <span className="font-bold text-gray-700">{dept.name}</span>
                                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
                                                Bu kurum henüz yapılandırma yapmamış.
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: Position Selection */}
                            {step === 2 && activeDept && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">{activeDept.name}</span>
                                    </div>
                                    
                                    <label className="text-xs font-bold text-gray-400 uppercase">Pozisyon (Ünvan) Seçiniz</label>
                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                        {availablePositions.length > 0 ? (
                                            availablePositions.map((pos) => (
                                                <button 
                                                    key={pos.id}
                                                    onClick={() => setSelectedPosId(pos.id)}
                                                    className={`p-4 rounded-xl border flex items-center justify-between transition-all text-left ${selectedPosId === pos.id ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 hover:bg-gray-50'}`}
                                                >
                                                    <span className="font-bold text-gray-800">{pos.title}</span>
                                                    {selectedPosId === pos.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-gray-400 text-sm italic">Bu departmanda açık pozisyon yok.</div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 mt-4">
                                        <button onClick={() => setStep(1)} className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600">Geri</button>
                                        <button 
                                            onClick={handleJoin}
                                            disabled={isSubmitting || !selectedPosId}
                                            className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Başvuruyu Tamamla'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
