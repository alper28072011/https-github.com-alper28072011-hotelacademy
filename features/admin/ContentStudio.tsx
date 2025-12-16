
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Upload, Loader2, Send, Trash2, 
    BarChart2, Zap, Heart, 
    Users, Globe, Lock, DollarSign, BookOpen, Award, Star, Building2, User, CheckCircle2
} from 'lucide-react';
import { DepartmentType, FeedPost, Interaction, InteractionType, AssignmentType, ContentPriority, KudosType, User as UserType, Course, CourseVisibility, CourseStep, OwnerType } from '../../types';
import { uploadFile } from '../../services/storage';
import { createInteractivePost, getUsersByDepartment, sendKudos, createCourse } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  // --- IDENTITY SWITCHER STATE ---
  const [postingAs, setPostingAs] = useState<OwnerType>('USER');

  // State
  const [activeTab, setActiveTab] = useState<'feed' | 'course' | 'kudos'>('feed');
  
  // Feed/Story State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  
  // Course State
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseVisibility, setCourseVisibility] = useState<CourseVisibility>('PUBLIC');
  const [coursePrice, setCoursePrice] = useState(0);
  const [steps, setSteps] = useState<CourseStep[]>([]);
  const [currentStepFile, setCurrentStepFile] = useState<File | null>(null);
  const [currentStepTitle, setCurrentStepTitle] = useState('');
  
  // Targeting
  const [showWizard, setShowWizard] = useState(false);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('DEPARTMENT');
  const [targetDepts, setTargetDepts] = useState<DepartmentType[]>(['housekeeping']);
  const [priority, setPriority] = useState<ContentPriority>('NORMAL');
  
  // Kudos
  const [kudosDept, setKudosDept] = useState<DepartmentType>('housekeeping');
  const [deptUsers, setDeptUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
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

  // Effect: Reset visibility defaults when switching identity
  useEffect(() => {
      if (postingAs === 'USER') {
          setCourseVisibility('PUBLIC');
      } else {
          setCourseVisibility('PRIVATE');
      }
  }, [postingAs]);

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const f = e.target.files[0];
          setFile(f);
          setPreviewUrl(URL.createObjectURL(f));
      }
  };

  const handleStepFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          setCurrentStepFile(e.target.files[0]);
      }
  };

  const addStep = async () => {
      if(!currentStepFile || !currentStepTitle) return;
      
      const newStep: CourseStep = {
          id: Date.now().toString(),
          type: currentStepFile.type.startsWith('video') ? 'video' : 'quiz', // Simplified
          title: currentStepTitle,
          description: '',
      };
      
      setSteps([...steps, newStep]);
      setCurrentStepTitle('');
      setCurrentStepFile(null);
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
          setTimeout(() => { setIsSuccess(false); setCaption(''); setSelectedUser(null); }, 2000);
      }
      setIsPublishing(false);
  };

  const handlePublishCourse = async () => {
      if (!currentUser) return;
      if (postingAs === 'ORGANIZATION' && !currentUser.currentOrganizationId) return;

      setIsPublishing(true);

      try {
          // Upload Thumbnail (using `file` state for cover)
          let thumbUrl = '';
          if (file) thumbUrl = await uploadFile(file, 'course_covers');

          const newCourse: Omit<Course, 'id'> = {
              organizationId: postingAs === 'ORGANIZATION' ? currentUser.currentOrganizationId! : undefined,
              authorId: currentUser.id,
              ownerType: postingAs,
              visibility: courseVisibility,
              price: courseVisibility === 'PUBLIC' ? coursePrice : 0,
              categoryId: 'cat_onboarding', // Default for now
              title: courseTitle,
              description: courseDesc,
              thumbnailUrl: thumbUrl || 'https://via.placeholder.com/400',
              duration: steps.length * 5, // Estimate
              xpReward: 500,
              // Only apply targeting if Corporate Private
              assignmentType: (postingAs === 'ORGANIZATION' && courseVisibility === 'PRIVATE') ? 'DEPARTMENT' : 'OPTIONAL',
              targetDepartments: (postingAs === 'ORGANIZATION' && courseVisibility === 'PRIVATE') ? ['housekeeping'] : [],
              priority: priority,
              steps: steps,
              discussionBoardId: `discuss_${Date.now()}` // Auto-create ID
          };

          await createCourse(newCourse);
          setIsSuccess(true);
          setTimeout(() => {
              setIsSuccess(false);
              setCourseTitle('');
              setCourseDesc('');
              setSteps([]);
              setFile(null);
          }, 2000);

      } catch (e) {
          console.error(e);
          alert("Kurs oluşturulamadı.");
      } finally {
          setIsPublishing(false);
      }
  };

  const handlePublishFeed = async () => {
      if (!file || !currentUser || !currentUser.currentOrganizationId) return;
      setIsPublishing(true);
      try {
          const url = await uploadFile(file, 'feed_posts');
          const newPost: Omit<FeedPost, 'id'> = {
              organizationId: currentUser.currentOrganizationId,
              authorId: currentUser.id,
              authorName: currentUser.name,
              authorAvatar: currentUser.avatar,
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
          }, 2000);
      } catch (error) { console.error(error); alert("Yayınlama hatası"); } finally { setIsPublishing(false); }
  };

  // --- BADGE CONFIG ---
  const badges = [
      { id: 'STAR_PERFORMER', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'Yıldız Performans' },
      { id: 'TEAM_PLAYER', icon: Users, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Takım Oyuncusu' },
      { id: 'GUEST_HERO', icon: Heart, color: 'text-red-500', bg: 'bg-red-100', label: 'Misafir Kahramanı' },
      { id: 'FAST_LEARNER', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-100', label: 'Hızlı Öğrenen' },
  ];

  if (isSuccess) {
      return (
          <div className="flex flex-col items-center justify-center h-[70vh] animate-in zoom-in">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                  <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Yayında!</h2>
              <p className="text-gray-500 mt-2">İçerik başarıyla paylaşıldı.</p>
          </div>
      );
  }

  // --- IDENTITY SWITCHER UI ---
  const renderIdentitySwitcher = () => (
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setPostingAs('USER')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${postingAs === 'USER' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
          >
              <User className="w-4 h-4" /> Bireysel
          </button>
          {currentOrganization && (currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
              <button 
                onClick={() => setPostingAs('ORGANIZATION')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${postingAs === 'ORGANIZATION' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
              >
                  <Building2 className="w-4 h-4" /> {currentOrganization.name}
              </button>
          )}
      </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-8 h-[calc(100vh-100px)] relative">
        
        {/* LEFT PANEL: EDITOR & TOOLS */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
            
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">İçerik Stüdyosu</h1>
                <p className="text-gray-500 text-sm">İçeriği tasarla, etkileşim ekle ve yayınla.</p>
            </div>

            {/* IDENTITY SWITCHER */}
            {renderIdentitySwitcher()}

            {/* Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-max">
                {postingAs === 'ORGANIZATION' && (
                    <button onClick={() => setActiveTab('feed')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'feed' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Haber Akışı</button>
                )}
                <button onClick={() => setActiveTab('course')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'course' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <BookOpen className="w-4 h-4" /> Kurs
                </button>
                {postingAs === 'ORGANIZATION' && (
                    <button onClick={() => setActiveTab('kudos')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'kudos' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Award className="w-4 h-4" /> Takdir
                    </button>
                )}
            </div>

            {/* --- COURSE MODE --- */}
            {activeTab === 'course' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* 1. Visibility Logic */}
                    {postingAs === 'USER' ? (
                        <div className="p-4 bg-blue-50 border-blue-100 border rounded-xl flex items-center gap-3 text-blue-700">
                            <Globe className="w-5 h-5" />
                            <div className="text-xs">
                                <span className="font-bold block">Herkese Açık Kanal</span>
                                Bu kurs profilinizde "Kanalım" altında listelenir ve tüm dünyaya açılır.
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => { setCourseVisibility('PRIVATE'); setCoursePrice(0); }}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${courseVisibility === 'PRIVATE' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                            >
                                <div className="flex items-center gap-2 mb-2 font-bold text-gray-800">
                                    <Lock className="w-5 h-5 text-gray-600" />
                                    Şirket İçi
                                </div>
                                <p className="text-xs text-gray-500">Sadece personel görür. Zorunlu atama yapılabilir.</p>
                            </button>
                            
                            <button 
                                onClick={() => setCourseVisibility('PUBLIC')}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${courseVisibility === 'PUBLIC' ? 'border-accent bg-accent/5 ring-2 ring-accent/20' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                            >
                                <div className="flex items-center gap-2 mb-2 font-bold text-gray-800">
                                    <Globe className="w-5 h-5 text-accent" />
                                    Marketplace
                                </div>
                                <p className="text-xs text-gray-500">Şirket adına satılabilir içerik.</p>
                            </button>
                        </div>
                    )}

                    {courseVisibility === 'PUBLIC' && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-4 animate-in fade-in">
                            <div className="p-2 bg-green-100 rounded-full text-green-600"><DollarSign className="w-5 h-5" /></div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-green-800 uppercase">Kurs Ücreti ($)</label>
                                <input 
                                    type="number" 
                                    value={coursePrice} 
                                    onChange={e => setCoursePrice(Number(e.target.value))}
                                    className="w-full bg-transparent border-none text-xl font-bold text-green-900 outline-none p-0"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    )}

                    {/* 2. Course Details */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Kurs Başlığı</label>
                            <input 
                                value={courseTitle} 
                                onChange={e => setCourseTitle(e.target.value)}
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl" 
                                placeholder="Örn: Mükemmel Kahve Yapımı"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Kapak Görseli</label>
                            <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" onChange={handleFileSelect} />
                        </div>
                    </div>

                    <button 
                        onClick={handlePublishCourse}
                        disabled={isPublishing || !courseTitle}
                        className="w-full bg-primary hover:bg-primary-light text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                    >
                        {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        Kursu Yayınla
                    </button>
                </div>
            )}

            {/* --- KUDOS MODE (Org Only) --- */}
            {activeTab === 'kudos' && postingAs === 'ORGANIZATION' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* ... Kudos Logic Same as Before ... */}
                    <div className="mt-auto border-t border-gray-100 pt-4">
                        <button 
                            onClick={handlePublishKudos}
                            disabled={!selectedUser || isPublishing}
                            className="w-full bg-primary hover:bg-primary-light disabled:bg-gray-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                        >
                            {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            Takdir Gönder & Yayınla
                        </button>
                    </div>
                </div>
            )}

            {/* --- FEED MODE (Org Only) --- */}
            {activeTab === 'feed' && postingAs === 'ORGANIZATION' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* ... Feed Logic Same as Before ... */}
                    <div className="mt-auto border-t border-gray-100 pt-4">
                        <button 
                            onClick={() => setShowWizard(true)}
                            disabled={!file}
                            className="w-full bg-primary hover:bg-primary-light disabled:bg-gray-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                        >
                            Devam Et
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT PANEL PREVIEW */}
        <div className="flex-1 bg-gray-100 rounded-[2.5rem] p-8 flex items-center justify-center relative overflow-hidden border border-gray-200 shadow-inner">
             <div className="text-center text-gray-400">Canlı Önizleme</div>
        </div>
    </div>
  );
};
