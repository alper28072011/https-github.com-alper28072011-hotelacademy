
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, MapPin, Globe, Loader2, CheckCircle2, UserPlus, 
    ShieldCheck, Bell, Briefcase, GraduationCap, Laptop, Heart, ShoppingBag, Landmark, BellOff, ArrowRight, Clock, Hash, Check
} from 'lucide-react';
import { getOrganizationDetails, sendJoinRequest, getMyMemberships, switchUserActiveOrganization, getUserPendingRequests } from '../../services/db';
import { updateUserSubscriptions } from '../../services/organizationService';
import { Organization, OrganizationSector, FollowStatus } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore'; 
import { checkFollowStatus, followOrganizationSmart, unfollowUserSmart } from '../../services/socialService';
import confetti from 'canvas-confetti';

export const OrganizationProfile: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { switchOrganization } = useOrganizationStore(); 
  
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('NONE');
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  // Channel Tuner State
  const [showTuner, setShowTuner] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isSavingChannels, setIsSavingChannels] = useState(false);

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
            
            // Pre-select user's current channels
            if (currentUser.subscribedChannelIds) {
                setSelectedChannels(currentUser.subscribedChannelIds);
            }
        }
        setLoading(false);
    };
    init();
  }, [orgId, currentUser]);

  const handleJoin = async () => {
      if (!currentUser || !org) return;
      
      const result = await sendJoinRequest(currentUser.id, org.id);
      
      if (result.success) {
          setHasPendingRequest(true); 
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          alert("Katılım isteği gönderildi! Yönetici onayı bekleniyor.");
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
      } else {
          alert("Panele geçiş yapılamadı.");
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
          setShowTuner(false);
          alert("Kanal tercihlerin güncellendi!");
          handleGoToPanel(); // Auto enter
      }
  };

  const canManage = currentUser && currentUser.pageRoles?.[orgId] === 'ADMIN';

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
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Yönetim Paneli</h3>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/admin')}
                            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                            Yönet
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
                    {org.sector}
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
                        <div className="text-xs text-gray-500">Üye</div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8">
                <h3 className="font-bold text-gray-900 mb-2">Hakkımızda</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                    {org.description || "Topluluğumuza hoş geldiniz."}
                </p>
            </div>
        </div>

        {/* STICKY ACTIONS */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-30 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
            {isMember ? (
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowTuner(true)}
                        className="flex-1 bg-gray-100 text-gray-800 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <Hash className="w-5 h-5" /> Kanalları Seç
                    </button>
                    <button 
                        onClick={handleGoToPanel}
                        className="flex-[2] bg-green-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <CheckCircle2 className="w-6 h-6" />
                        Giriş Yap
                    </button>
                </div>
            ) : hasPendingRequest ? (
                <div className="w-full bg-orange-100 text-orange-600 font-bold text-lg py-4 rounded-2xl shadow-none border border-orange-200 flex items-center justify-center gap-2 cursor-default">
                    <Clock className="w-6 h-6" />
                    İstek Gönderildi
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
                        onClick={handleJoin}
                        className="flex-1 bg-primary text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-5 h-5" />
                        Katıl
                    </button>
                </div>
            )}
        </div>

        {/* CHANNEL TUNER MODAL */}
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
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Akışını Özelleştir</h2>
                            <p className="text-gray-500 mb-6 text-sm">Hangi konularla ilgileniyorsun?</p>

                            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2">
                                {org.channels?.map(channel => (
                                    <button 
                                        key={channel.id}
                                        onClick={() => toggleChannel(channel.id)}
                                        className={`p-4 rounded-xl border flex items-center justify-between transition-all text-left ${selectedChannels.includes(channel.id) ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedChannels.includes(channel.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                <Hash className="w-4 h-4" />
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
                                    {isSavingChannels ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kaydet'}
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
