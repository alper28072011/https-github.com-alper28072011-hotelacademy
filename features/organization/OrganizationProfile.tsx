
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    ExternalLink, ShieldCheck, Building2, 
    ChevronRight, Crown, Eye, ShieldAlert,
    Camera, Trash2, Loader2, Upload, Mail, Check, X,
    UserCheck, Settings2, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Organization, PageRole, Channel } from '../../../types';
import { getOrganizationDetails, getPendingInvites, acceptOrgInvite, declineOrgInvite, getMyMemberships, getUserPendingRequests } from '../../../services/db';
import { updateProfilePhoto, removeProfilePhoto } from '../../../services/userService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { Avatar } from '../../../components/ui/Avatar';
import confetti from 'canvas-confetti';
import { useOrganizationStore } from '../../../stores/useOrganizationStore';
import { checkFollowStatus, followOrganizationSmart, unfollowUserSmart } from '../../../services/socialService';
import { updateUserSubscriptions } from '../../services/organizationService';
import { ArrowLeft, MapPin, Globe, UserPlus, Bell, Briefcase, GraduationCap, Laptop, Heart, ShoppingBag, Landmark, BellOff, ArrowRight, Clock, Hash, FileText } from 'lucide-react';
import { OrganizationSector, FollowStatus } from '../../../types';
import { addDoc, collection } from 'firebase/firestore'; 
import { db } from '../../services/firebase';
import { useTelemetry } from '../../hooks/useTelemetry';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  onEditClick?: () => void;
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
}

// ... (ProfileHeader component logic remains mostly same, focusing on OrganizationProfile export below)

export const OrganizationProfile: React.FC = () => {
  // ... (Existing state and imports)
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAuthStore();
  const { switchOrganization } = useOrganizationStore(); 
  const { logEvent } = useTelemetry();
  
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
  const [selectedRole, setSelectedRole] = useState('');
  const [isJoinSubmitting, setIsJoinSubmitting] = useState(false);

  // Channel Tuner
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isSavingChannels, setIsSavingChannels] = useState(false);

  // ... (useEffect for init remains same) ...
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

  // ... (Actions: handleJoinClick, submitJoinRequest, handleFollowToggle, handleEnterWorkspace remains same) ...
  // ... (getRole, canManage, getSectorIcon helper remains same) ...

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
          alert("Kanal tercihlerin güncellendi!");
          // Reload to reflect feed changes
          window.location.reload();
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!org) return <div>Organization not found</div>;

  return (
    <div className="min-h-screen bg-white pb-24 relative">
        {/* ... (Hero, Owner Panel, Profile Info, Action Buttons, About Section - same as before) ... */}
        
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

        {/* OWNER PANEL - Simplified for brevity in this response */}
        
        {/* PROFILE INFO & ACTIONS - Simplified */}
        <div className="px-6 -mt-16 relative z-10">
             {/* ... Avatar & Title ... */}
             <div className="w-28 h-28 rounded-3xl bg-white p-1 shadow-2xl mb-4">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{org.name[0]}</span>}
                </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-6">{org.name}</h1>

            {/* CHANNEL TUNER BUTTON */}
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

        {/* ... (Join Modal - Same) ... */}

        {/* CHANNEL MODAL - UPDATED */}
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
