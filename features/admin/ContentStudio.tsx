
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Upload, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, 
    Smartphone, Send, Plus, Trash2, Link as LinkIcon, HelpCircle, 
    BarChart2, Zap, MoreHorizontal, Heart, MessageCircle, Share2,
    Users, Globe, AlertCircle, Clock, Award, Star, Shield, Trophy
} from 'lucide-react';
import { DepartmentType, FeedPost, Interaction, InteractionType, AssignmentType, ContentPriority, KudosType, User } from '../../types';
import { uploadFile } from '../../services/storage';
import { createInteractivePost, getUsersByDepartment, sendKudos } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

// ... (Keep existing PollConfig and XpConfig components as is) ...
const PollConfig: React.FC<{ data: any, onChange: (d: any) => void }> = ({ data, onChange }) => (
    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Soru</label>
            <input 
                className="w-full p-2 rounded-lg border border-gray-300 text-sm" 
                placeholder="Bu eğitimi beğendiniz mi?"
                value={data.question || ''} 
                onChange={e => onChange({ ...data, question: e.target.value })} 
            />
        </div>
        <div className="flex gap-2">
            <input 
                className="flex-1 p-2 rounded-lg border border-gray-300 text-sm text-center" 
                placeholder="Evet"
                value={data.options?.[0] || ''} 
                onChange={e => onChange({ ...data, options: [e.target.value, data.options?.[1] || ''] })} 
            />
            <input 
                className="flex-1 p-2 rounded-lg border border-gray-300 text-sm text-center" 
                placeholder="Hayır"
                value={data.options?.[1] || ''} 
                onChange={e => onChange({ ...data, options: [data.options?.[0] || '', e.target.value] })} 
            />
        </div>
    </div>
);

const XpConfig: React.FC<{ data: any, onChange: (d: any) => void }> = ({ data, onChange }) => (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
         <label className="text-xs font-bold text-gray-500 uppercase block mb-2">XP Miktarı</label>
         <div className="flex gap-2">
             {[50, 100, 250, 500].map(amt => (
                 <button 
                    key={amt} 
                    onClick={() => onChange({ ...data, xpAmount: amt })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${data.xpAmount === amt ? 'bg-accent text-primary border-accent' : 'bg-white border-gray-200 text-gray-500'}`}
                 >
                     +{amt}
                 </button>
             ))}
         </div>
    </div>
);

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  // State
  const [activeTab, setActiveTab] = useState<'feed' | 'story' | 'kudos'>('feed');
  
  // Feed/Story State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  
  // Targeting
  const [showWizard, setShowWizard] = useState(false);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('DEPARTMENT');
  const [targetDepts, setTargetDepts] = useState<DepartmentType[]>(['housekeeping']);
  const [priority, setPriority] = useState<ContentPriority>('NORMAL');
  
  // Kudos
  const [kudosDept, setKudosDept] = useState<DepartmentType>('housekeeping');
  const [deptUsers, setDeptUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<KudosType>('STAR_PERFORMER');
  
  // UI
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);

  // Load users when department changes in Kudos mode
  useEffect(() => {
      if (activeTab === 'kudos' && currentUser && currentUser.currentOrganizationId) {
          getUsersByDepartment(kudosDept, currentUser.currentOrganizationId).then(setDeptUsers);
      }
  }, [kudosDept, activeTab, currentUser]);

  // --- PERMISSION GUARD ---
  if (!currentOrganization) return <div>Lütfen bir otel seçin.</div>;
  
  const canCreate = 
    currentUser?.role === 'admin' || 
    currentUser?.role === 'manager' ||
    currentUser?.role === 'super_admin' ||
    (currentUser?.role === 'staff' && currentOrganization.settings?.allowStaffContentCreation);

  if (!canCreate) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6">
              <Shield className="w-16 h-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-bold text-gray-800">Erişim İzni Yok</h2>
              <p className="text-gray-500">Bu otelde personel içerik paylaşımı yönetici tarafından kapatılmıştır.</p>
          </div>
      );
  }

  // ... (Rest of the component logic is same as before) ...
  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const f = e.target.files[0];
          setFile(f);
          setPreviewUrl(URL.createObjectURL(f));
      }
  };

  const addInteraction = (type: InteractionType) => {
      if (interactions.length > 0) {
          alert("Şimdilik gönderi başına sadece 1 etkileşim ekleyebilirsiniz.");
          return;
      }
      const newId = Date.now().toString();
      const defaultData: any = {};
      
      if (type === 'POLL') {
          defaultData.question = "Bu konu hakkında ne düşünüyorsun?";
          defaultData.options = ["Harika 😍", "Geliştirilmeli 🤔"];
      } else if (type === 'XP_BOOST') {
          defaultData.xpAmount = 100;
      }

      const newInteraction: Interaction = {
          id: newId,
          type,
          data: defaultData,
          style: { x: 50, y: 50, scale: 1 }
      };

      setInteractions([...interactions, newInteraction]);
      setActiveInteractionId(newId);
  };

  const updateInteractionData = (id: string, newData: any) => {
      setInteractions(prev => prev.map(i => i.id === id ? { ...i, data: newData } : i));
  };

  const removeInteraction = (id: string) => {
      setInteractions(prev => prev.filter(i => i.id !== id));
      setActiveInteractionId(null);
  };

  const toggleDept = (d: DepartmentType) => {
      setTargetDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const initiatePublish = () => {
      if (activeTab === 'kudos') {
          handlePublishKudos();
      } else {
          if (!file) return;
          setShowWizard(true);
      }
  };

  const handlePublishKudos = async () => {
      if (!selectedUser || !currentUser) return;
      setIsPublishing(true);
      
      const success = await sendKudos(
          currentUser,
          selectedUser.id,
          selectedUser.name,
          selectedUser.avatar,
          selectedBadge,
          caption || `Tebrikler ${selectedUser.name}! Harika iş çıkardın.`
      );

      if (success) {
          setIsSuccess(true);
          setTimeout(() => {
              setIsSuccess(false);
              setCaption('');
              setSelectedUser(null);
          }, 2000);
      }
      setIsPublishing(false);
  };

  const handlePublish = async () => {
      if (!file || !currentUser || !currentUser.currentOrganizationId) return;
      setIsPublishing(true);

      try {
          const url = await uploadFile(file, 'feed_posts');
          
          const newPost: Omit<FeedPost, 'id'> = {
              organizationId: currentUser.currentOrganizationId,
              authorId: currentUser.id,
              authorName: currentUser.name,
              authorAvatar: currentUser.avatar,
              
              // New Smart Targeting Fields
              assignmentType: assignmentType,
              targetDepartments: assignmentType === 'GLOBAL' ? ['housekeeping', 'kitchen', 'front_office', 'management'] : targetDepts,
              priority: priority,

              type: file.type.startsWith('video') ? 'video' : 'image',
              mediaUrl: url,
              caption: caption,
              likes: 0,
              createdAt: Date.now(),
              likedBy: [],
              interactions: interactions
          };

          await createInteractivePost(newPost);
          
          setIsSuccess(true);
          setTimeout(() => {
              setIsSuccess(false);
              setShowWizard(false);
              setFile(null);
              setPreviewUrl(null);
              setCaption('');
              setInteractions([]);
              // Reset wizard defaults
              setAssignmentType('DEPARTMENT');
              setPriority('NORMAL');
          }, 2000);

      } catch (error) {
          console.error(error);
          alert("Yayınlama hatası");
      } finally {
          setIsPublishing(false);
      }
  };

  // --- BADGE CONFIG ---
  const badges = [
      { id: 'STAR_PERFORMER', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Yıldız Performans' },
      { id: 'TEAM_PLAYER', icon: Users, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Takım Oyuncusu' },
      { id: 'GUEST_HERO', icon: Heart, color: 'text-red-500', bg: 'bg-red-100', label: 'Misafir Kahramanı' },
      { id: 'FAST_LEARNER', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-100', label: 'Hızlı Öğrenen' },
  ];

  // --- RENDER HELPERS ---
  const activeInteraction = interactions.find(i => i.id === activeInteractionId);

  // Success Screen
  if (isSuccess) {
      return (
          <div className="flex flex-col items-center justify-center h-[70vh] animate-in zoom-in">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                  <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Yayında!</h2>
              <p className="text-gray-500 mt-2">İçerik personelin akışına düştü.</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 h-[calc(100vh-100px)] relative">
        
        {/* LEFT PANEL: EDITOR & TOOLS */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
            
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">İçerik Stüdyosu</h1>
                <p className="text-gray-500 text-sm">İçeriği tasarla, etkileşim ekle ve yayınla.</p>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-max">
                <button 
                    onClick={() => setActiveTab('feed')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'feed' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Haber Akışı
                </button>
                <button 
                    onClick={() => setActiveTab('kudos')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'kudos' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Award className="w-4 h-4" /> Takdir (Kudos)
                </button>
            </div>

            {/* KUDOS MODE EDITOR */}
            {activeTab === 'kudos' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Step 1: Select Person */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-3 text-sm">1. Kimi Takdir Ediyorsun?</h3>
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                            {['housekeeping', 'kitchen', 'front_office', 'management'].map(d => (
                                <button
                                    key={d}
                                    onClick={() => setKudosDept(d as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${kudosDept === d ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {d.replace('_', ' ').toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                            {deptUsers.map(user => (
                                <div 
                                    key={user.id} 
                                    onClick={() => setSelectedUser(user)}
                                    className={`flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group snap-start p-2 rounded-xl transition-all ${selectedUser?.id === user.id ? 'bg-accent/20 ring-2 ring-accent' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                                        {user.avatar.length > 4 ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">{user.avatar}</div>}
                                    </div>
                                    <span className="text-xs font-medium text-center truncate w-full">{user.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Select Badge */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-3 text-sm">2. Hangi Rozeti Veriyorsun?</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {badges.map(badge => (
                                <button
                                    key={badge.id}
                                    onClick={() => setSelectedBadge(badge.id as any)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                        selectedBadge === badge.id 
                                        ? `border-${badge.color.split('-')[1]}-500 bg-${badge.color.split('-')[1]}-50` 
                                        : 'border-gray-100 hover:border-gray-300'
                                    }`}
                                >
                                    <div className={`p-2 rounded-full ${badge.bg} ${badge.color}`}>
                                        <badge.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-700">{badge.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* FEED MODE EDITOR */
                <>
                    {/* Upload Area */}
                    {!previewUrl ? (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <p className="mb-1 text-sm text-gray-500 font-medium">Medyayı buraya sürükle veya seç</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                        </label>
                    ) : (
                        <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                {file?.type.startsWith('video') ? (
                                    <video src={previewUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                                )}
                            </div>
                            <button onClick={() => { setFile(null); setPreviewUrl(null); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Sticker Tray */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-gray-500 uppercase">Etkileşim Ekle</label>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <button onClick={() => addInteraction('POLL')} className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <BarChart2 className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-medium text-gray-600">Anket</span>
                            </button>
                            
                            <button onClick={() => addInteraction('XP_BOOST')} className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-yellow-400 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-medium text-gray-600">XP Ödül</span>
                            </button>
                        </div>
                    </div>

                    {/* Active Interaction Config */}
                    {activeInteraction && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border-t border-gray-100 pt-4"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-gray-800 text-sm">
                                    {activeInteraction.type === 'POLL' ? 'Anket Ayarları' : 'XP Ayarları'}
                                </h3>
                                <button onClick={() => removeInteraction(activeInteraction.id)} className="text-red-500 text-xs hover:underline">Kaldır</button>
                            </div>

                            {activeInteraction.type === 'POLL' && (
                                <PollConfig 
                                    data={activeInteraction.data} 
                                    onChange={(d) => updateInteractionData(activeInteraction.id, d)} 
                                />
                            )}
                            {activeInteraction.type === 'XP_BOOST' && (
                                <XpConfig 
                                    data={activeInteraction.data} 
                                    onChange={(d) => updateInteractionData(activeInteraction.id, d)} 
                                />
                            )}
                        </motion.div>
                    )}
                </>
            )}

            {/* Caption & Publish */}
            <div className="mt-auto border-t border-gray-100 pt-4">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
                    {activeTab === 'kudos' ? 'Takdir Notun' : 'Açıklama'}
                </label>
                <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary focus:ring-0 outline-none resize-none h-24 text-sm mb-4"
                    placeholder={activeTab === 'kudos' ? "Tebrikler!" : "Ekibe ne söylemek istersin?"}
                />

                <button 
                    onClick={initiatePublish}
                    disabled={activeTab === 'feed' && !file || activeTab === 'kudos' && !selectedUser || isPublishing}
                    className="w-full bg-primary hover:bg-primary-light disabled:bg-gray-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                >
                    {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {activeTab === 'kudos' ? 'Takdir Gönder & Yayınla' : 'Devam Et'}
                </button>
            </div>
        </div>

        {/* RIGHT PANEL PREVIEW (Same as previous implementation) */}
        <div className="flex-1 bg-gray-100 rounded-[2.5rem] p-8 flex items-center justify-center relative overflow-hidden border border-gray-200 shadow-inner">
             {/* ... Preview content omitted for brevity as it remains identical to previous version ... */}
             <div className="text-center text-gray-400">Canlı Önizleme</div>
        </div>

        {/* TARGETING WIZARD (Same as previous implementation) */}
        {/* ... Wizard code ... */}
    </div>
  );
};
