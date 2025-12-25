
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    ExternalLink, ShieldCheck, Building2, 
    ChevronRight, Crown, Eye, ShieldAlert,
    Camera, Trash2, Loader2, Upload, Mail, Check, X,
    UserCheck, Settings2, Lock, UserPlus, Briefcase, Hash, ArrowLeft, ArrowRight, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Organization, PageRole, Channel, FollowStatus } from '../../../types';
import { getOrganizationDetails, getMyMemberships, getUserPendingRequests, sendJoinRequest } from '../../../services/db';
import { updateProfilePhoto, removeProfilePhoto } from '../../../services/userService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { Avatar } from '../../../components/ui/Avatar';
import confetti from 'canvas-confetti';
import { useOrganizationStore } from '../../../stores/useOrganizationStore';
import { checkFollowStatus, followOrganizationSmart, unfollowEntity } from '../../../services/socialService';
import { updateUserSubscriptions } from '../../services/organizationService';

export const OrganizationProfile: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAuthStore();
  
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
  const [showJoinModal, setShowJoinModal] = useState(false); 
  
  // Onboarding State
  const [agreedToRules, setAgreedToRules] = useState(false);
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

  const handleFollow = async () => {
      if (!currentUser || !org || isFollowLoading) return;
      setIsFollowLoading(true);
      
      if (followStatus === 'FOLLOWING') {
           await unfollowEntity(currentUser.id, org.id, 'ORGANIZATION');
           setFollowStatus('NONE');
      } else {
           const res = await followOrganizationSmart(currentUser.id, org.id);
           setFollowStatus(res.status);
           if (res.status === 'FOLLOWING') {
               confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
           }
      }
      setIsFollowLoading(false);
  };

  const handleJoinSubmit = async () => {
      if (!currentUser || !org) return;
      if (!agreedToRules && org.joinConfig?.rules) {
          alert("Lütfen kuralları kabul edin.");
          return;
      }

      setIsJoinSubmitting(true);
      const result = await sendJoinRequest(currentUser.id, org.id);
      
      if (result.success) {
          setHasPendingRequest(true);
          setShowJoinModal(false);
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } else {
          alert(result.message || "Başvuru sırasında hata oluştu.");
      }
      setIsJoinSubmitting(false);
  };

  const toggleChannel = (channel: Channel) => {
      if (channel.isMandatory) return; // Locked
      
      if (selectedChannels.includes(channel.id)) {
          setSelectedChannels(selectedChannels.filter(c => c !== channel.id));
      } else {
          setSelectedChannels([...selectedChannels, channel.id]);
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
          // Optional: Reload logic if needed, but context update is better
          window.location.reload(); 
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!org) return <div className="p-8 text-center text-gray-500">Organizasyon bulunamadı.</div>;

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

        {/* PROFILE INFO & ACTIONS */}
        <div className="px-6 -mt-16 relative z-10">
             {/* Logo */}
             <div className="w-28 h-28 rounded-3xl bg-white p-1 shadow-2xl mb-4">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{org.name[0]}</span>}
                </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{org.name}</h1>
            <p className="text-gray-500 text-sm mb-6">{org.description || 'Bu işletme için henüz bir açıklama girilmemiş.'}</p>

            {/* ACTION BAR */}
            <div className="flex gap-3 mb-6">
                {isMember ? (
                    // MEMBER VIEW: Channel Settings
                    <button 
                        onClick={() => setShowTuner(true)}
                        className="flex-1 p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between group hover:border-primary transition-colors shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                <Hash className="w-5 h-5 text-gray-500 group-hover:text-white" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-gray-900 text-sm">Kanal Ayarları</div>
                                <div className="text-xs text-gray-500 group-hover:text-primary">Bildirimleri yönet</div>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                    </button>
                ) : (
                    // GUEST VIEW: Follow & Join
                    <>
                        {/* JOIN BUTTON */}
                        <button 
                            onClick={() => !hasPendingRequest && setShowJoinModal(true)}
                            disabled={hasPendingRequest}
                            className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                                hasPendingRequest 
                                ? 'bg-orange-50 text-orange-600 border border-orange-200 cursor-default' 
                                : 'bg-primary text-white hover:bg-primary-hover'
                            }`}
                        >
                            {hasPendingRequest ? (
                                <>
                                    <Clock className="w-4 h-4" /> Başvuru Bekleniyor
                                </>
                            ) : (
                                <>
                                    <Briefcase className="w-4 h-4" /> Takıma Katıl
                                </>
                            )}
                        </button>

                        {/* FOLLOW BUTTON */}
                        <button 
                            onClick={handleFollow}
                            disabled={isFollowLoading}
                            className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                                followStatus === 'FOLLOWING'
                                ? 'bg-white text-gray-800 border-gray-200'
                                : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                            }`}
                        >
                            {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                followStatus === 'FOLLOWING' ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
                            )}
                            {followStatus === 'FOLLOWING' ? 'Takiptesin' : 'Takip Et'}
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* JOIN REQUEST MODAL */}
        <AnimatePresence>
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="bg-[#3b5998] p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-sm">Ekibe Katılma İsteği</h3>
                            <button onClick={() => setShowJoinModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-3 flex items-center justify-center border border-gray-200">
                                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover rounded-xl" /> : <Building2 className="w-8 h-8 text-gray-400" />}
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">{org.name}</h2>
                                <p className="text-xs text-gray-500">Resmi Personel Ağı</p>
                            </div>

                            {org.joinConfig?.rules && (
                                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4 text-xs text-blue-800 leading-relaxed max-h-32 overflow-y-auto">
                                    <span className="font-bold block mb-1">Katılım Kuralları:</span>
                                    {org.joinConfig.rules}
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-6" onClick={() => setAgreedToRules(!agreedToRules)}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${agreedToRules ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                    {agreedToRules && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-xs text-gray-600 font-medium cursor-pointer select-none">Kuralları okudum ve kabul ediyorum.</span>
                            </div>

                            <button 
                                onClick={handleJoinSubmit}
                                disabled={!agreedToRules || isJoinSubmitting}
                                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {isJoinSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Başvuruyu Gönder'}
                            </button>
                        </div>
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
                            <p className="text-gray-500 mb-6 text-sm">Zorunlu kanallar otomatik seçilidir.</p>

                            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {org.channels?.map(channel => {
                                    const isLocked = channel.isMandatory;
                                    const isSelected = selectedChannels.includes(channel.id) || isLocked;
                                    
                                    return (
                                        <button 
                                            key={channel.id}
                                            onClick={() => toggleChannel(channel)}
                                            disabled={isLocked}
                                            className={`p-4 rounded-xl border flex items-center justify-between transition-all text-left ${
                                                isSelected 
                                                ? 'border-primary bg-primary/5 shadow-md' 
                                                : 'border-gray-100 hover:bg-gray-50'
                                            } ${isLocked ? 'opacity-80 cursor-default' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                    {channel.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800 block flex items-center gap-2">
                                                        {channel.name}
                                                        {isLocked && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded uppercase">Zorunlu</span>}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{channel.description || 'Genel Kanal'}</span>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="w-5 h-5 text-primary" />}
                                        </button>
                                    );
                                })}
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
