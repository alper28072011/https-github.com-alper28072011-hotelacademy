
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, MapPin, Globe, Loader2, CheckCircle2, UserPlus, 
    ShieldCheck, Bell, Briefcase, GraduationCap, Laptop, Heart, ShoppingBag, Landmark, BellOff, ArrowRight, Clock, Hash, Check, Lock, FileText
} from 'lucide-react';
import { getOrganizationDetails, sendJoinRequest, getMyMemberships, switchUserActiveOrganization, getUserPendingRequests } from '../../services/db';
import { updateUserSubscriptions } from '../../services/organizationService';
import { Organization, OrganizationSector, FollowStatus } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore'; 
import { checkFollowStatus, followOrganizationSmart, unfollowUserSmart } from '../../services/socialService';
import { addDoc, collection } from 'firebase/firestore'; 
import { db } from '../../services/firebase';
import confetti from 'canvas-confetti';

export const OrganizationProfile: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAuthStore();
  const { switchOrganization } = useOrganizationStore(); 
  
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Membership States (Corporate)
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  
  // Follow States (Social)
  const [followStatus, setFollowStatus] = useState<FollowStatus>('NONE');
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Modals
  const [showTuner, setShowTuner] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false); // Onboarding Modal
  
  // Onboarding State
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [isJoinSubmitting, setIsJoinSubmitting] = useState(false);

  // Channel Tuner
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isSavingChannels, setIsSavingChannels] = useState(false);

  useEffect(() => {
    const init = async () => {
        if (!orgId) return;
        setLoading(true);
        const data = await getOrganizationDetails(orgId);
        if (data) setOrg(data);
        
        if (currentUser) {
            // 1. Check Membership
            const memberships = await getMyMemberships(currentUser.id);
            if (memberships.some(m => m.organizationId === orgId)) setIsMember(true);
            
            // 2. Check Pending Requests
            const pending = await getUserPendingRequests(currentUser.id);
            if (pending.some(r => r.organizationId === orgId)) setHasPendingRequest(true);

            // 3. Check Follow Status
            const status = await checkFollowStatus(currentUser.id, orgId);
            setFollowStatus(status);
            
            // 4. Pre-select subscribed channels
            if (currentUser.channelSubscriptions) {
                setSelectedChannels(currentUser.channelSubscriptions);
            }
        }
        setLoading(false);
    };
    init();
  }, [orgId, currentUser?.id]);

  // --- ACTIONS ---

  const handleJoinClick = () => {
      if (!currentUser || !org) return;
      setShowJoinModal(true);
  };

  const submitJoinRequest = async () => {
      if (!currentUser || !org || !selectedRole || !agreedToRules) return;
      setIsJoinSubmitting(true);

      try {
          // Custom Implementation of sendJoinRequest to support extended payload
          await addDoc(collection(db, 'requests'), { 
              type: 'REQUEST_TO_JOIN', 
              userId: currentUser.id, 
              organizationId: org.id, 
              status: 'PENDING', 
              createdAt: Date.now(),
              requestedRoleTitle: selectedRole,
              agreedToRules: true,
              targetDepartment: currentUser.department || 'housekeeping' // Fallback
          });

          setHasPendingRequest(true); 
          setShowJoinModal(false);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          alert("Katılım isteğiniz gönderildi! Yönetici onayı bekleniyor.");
      } catch (e: any) {
          alert("Başvuru yapılamadı.");
      } finally {
          setIsJoinSubmitting(false);
      }
  };

  const handleFollowToggle = async () => {
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

  const handleEnterWorkspace = async () => {
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
          alert("Çalışma alanına geçiş yapılamadı.");
      }
  };

  const toggleChannel = (id: string) => {
      if (selectedChannels.includes(id)) {
          setSelectedChannels(selectedChannels.filter(c => c !== id));
      } else {
          setSelectedChannels([...selectedChannels, id]);
      }
  };

  const saveChannels = async () => {
      if (!currentUser) return;
      setIsSavingChannels(true);
      const success = await updateUserSubscriptions(currentUser.id, selectedChannels);
      setIsSavingChannels(false);
      
      if (success) {
          updateCurrentUser({ channelSubscriptions: selectedChannels });
          setShowTuner(false);
          alert("Kanal tercihlerin güncellendi!");
          handleEnterWorkspace();
      }
  };

  // Safe accessor for object/string role
  const getRole = (orgId: string) => {
      if (!currentUser?.pageRoles) return 'GUEST';
      const r = currentUser.pageRoles[orgId];
      if (typeof r === 'string') return r;
      return r?.role || 'GUEST';
  };

  const canManage = currentUser && getRole(orgId || '') === 'ADMIN';

  const getSectorIcon = (sector: OrganizationSector) => {
      switch(sector) {
          case 'technology': return <Laptop className="w-4 h-4" />;
          case 'health': return <Heart className="w-4 h-4" />;
          case 'education': return <GraduationCap className="w-4 h-4" />;
          case 'retail': return <ShoppingBag className="w-4 h-4" />;
          case 'finance': return <Landmark className="w-4 h-4" />;
          default: return <Briefcase className="w-4 h-4" />;
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!org) return <div>Organization not found</div>;

  return (
    <div className="min-h-screen bg-white pb-24 relative">
        {/* HERO */}
        <div className="relative h-72 w-full">
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

        {/* OWNER PANEL */}
        {canManage && (
            <div className="px-6 -mt-10 relative z-20 mb-6">
                <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-2xl border border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-accent" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Yönetim Paneli</h3>
                    </div>
                    <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        Yönet
                    </button>
                </div>
            </div>
        )}

        {/* PROFILE INFO */}
        <div className={`px-6 relative z-10 ${canManage ? '' : '-mt-16'}`}>
            <div className="w-28 h-28 rounded-3xl bg-white p-1 shadow-2xl mb-4">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{org.name[0]}</span>}
                </div>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{org.name}</h1>
                <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold mb-3 uppercase tracking-wide">
                    {getSectorIcon(org.sector)}
                    {org.sector}
                </div>
                
                {/* Stats Row */}
                <div className="flex gap-6 mt-2 text-sm text-gray-600">
                    <div>
                        <span className="font-bold text-gray-900 mr-1">{org.followersCount || 0}</span>
                        Takipçi
                    </div>
                    <div>
                        <span className="font-bold text-gray-900 mr-1">{org.memberCount || 0}</span>
                        Personel
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS (Split Logic) */}
            <div className="flex gap-3 mb-8">
                {/* 1. SOCIAL FOLLOW BUTTON */}
                <button 
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        followStatus === 'FOLLOWING' 
                        ? 'bg-gray-100 text-gray-800 border border-gray-200' 
                        : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    }`}
                >
                    {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                     followStatus === 'FOLLOWING' ? <><BellOff className="w-4 h-4" /> Takibi Bırak</> : 
                     <><Bell className="w-4 h-4" /> Takip Et</>}
                </button>

                {/* 2. CORPORATE JOIN BUTTON */}
                {isMember ? (
                    <button 
                        onClick={handleEnterWorkspace}
                        className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                    >
                        <Briefcase className="w-4 h-4" /> Çalışma Alanı
                    </button>
                ) : hasPendingRequest ? (
                    <button disabled className="flex-[2] bg-orange-100 text-orange-600 border border-orange-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-default">
                        <Clock className="w-4 h-4" /> İstek Gönderildi
                    </button>
                ) : (
                    <button 
                        onClick={handleJoinClick}
                        className="flex-[2] bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                    >
                        <UserPlus className="w-4 h-4" /> Ekibe Katıl
                    </button>
                )}
            </div>

            {/* ABOUT */}
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">Hakkımızda</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                    {org.description || "Topluluğumuza hoş geldiniz."}
                </p>
                {org.website && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm font-bold text-blue-600">
                        <Globe className="w-4 h-4" />
                        <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="hover:underline">
                            Web Sitesi
                        </a>
                    </div>
                )}
            </div>

            {/* CHANNEL TUNER (For Members) */}
            {isMember && (
                <button 
                    onClick={() => setShowTuner(true)}
                    className="w-full mt-4 p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-between group hover:border-accent transition-colors shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-accent group-hover:text-primary transition-colors">
                            <Hash className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-gray-900 text-sm">Kanal Ayarları</div>
                            <div className="text-xs text-gray-500">Bildirimleri yönet</div>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
            )}
        </div>

        {/* ONBOARDING MODAL */}
        <AnimatePresence>
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowJoinModal(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        <div className="p-8 pb-4">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-none">Aramıza Katıl</h2>
                                    <p className="text-xs text-gray-500 mt-1">{org.name} Topluluk Protokolü</p>
                                </div>
                            </div>

                            {/* Rules */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6 text-sm text-gray-600 max-h-40 overflow-y-auto">
                                <h4 className="font-bold text-gray-900 mb-2 text-xs uppercase">Kurallar & Şartlar</h4>
                                <p className="leading-relaxed">
                                    {org.joinConfig?.rules || "Topluluk kurallarına saygı gösteriniz."}
                                </p>
                            </div>

                            {/* Agreement Checkbox */}
                            <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-all mb-4">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${agreedToRules ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                    {agreedToRules && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={agreedToRules} onChange={(e) => setAgreedToRules(e.target.checked)} />
                                <span className="text-sm font-medium text-gray-700">Yukarıdaki kuralları okudum, anladım ve kabul ediyorum.</span>
                            </label>

                            {/* Role Selector */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Hangi statü ile katılmak istiyorsun?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(org.joinConfig?.availableRoles || ["Personel", "Stajyer"]).map(role => (
                                        <button
                                            key={role}
                                            onClick={() => setSelectedRole(role)}
                                            className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                                selectedRole === role 
                                                ? 'border-primary bg-primary/5 text-primary' 
                                                : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={submitJoinRequest}
                                disabled={!agreedToRules || !selectedRole || isJoinSubmitting}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                            >
                                {isJoinSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Başvuruyu Gönder'}
                            </button>
                        </div>
                        <button onClick={() => setShowJoinModal(false)} className="py-4 text-center text-gray-400 font-bold text-sm hover:text-gray-600 bg-gray-50 border-t border-gray-100">
                            Vazgeç
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* CHANNEL MODAL */}
        <AnimatePresence>
            {showTuner && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowTuner(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Kanalları Düzenle</h2>
                            <p className="text-gray-500 mb-6 text-sm">Hangi departmanlardan bildirim almak istersin?</p>

                            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {org.channels?.map(channel => (
                                    <button 
                                        key={channel.id}
                                        onClick={() => toggleChannel(channel.id)}
                                        className={`p-4 rounded-xl border flex items-center justify-between transition-all text-left ${selectedChannels.includes(channel.id) ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedChannels.includes(channel.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                {channel.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-800 block">{channel.name}</span>
                                                <span className="text-xs text-gray-500">{channel.description || 'Genel Kanal'}</span>
                                            </div>
                                        </div>
                                        {selectedChannels.includes(channel.id) && <Check className="w-5 h-5 text-primary" />}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowTuner(false)} className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600">İptal</button>
                                <button 
                                    onClick={saveChannels}
                                    disabled={isSavingChannels}
                                    className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSavingChannels ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kaydet & Gir'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
