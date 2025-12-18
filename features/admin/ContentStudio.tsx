
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, FileText, Link, Type, Loader2, Play, 
    CheckCircle2, Save, Smartphone, ImageIcon,
    Settings, Globe, Lock, ChevronRight, Upload, Edit, 
    FileType, User, Building2, Search, Trash2, Plus, 
    MousePointer2, Sparkles, MessageSquare, Award, AlertCircle,
    RefreshCw, Image as LucideImage, Copy, Target, ArrowDown
} from 'lucide-react';
import { generateMagicCourse } from '../../services/geminiService';
import { publishContent } from '../../services/courseService';
import { updateCourse } from '../../services/db';
import { uploadFile } from '../../services/storage';
import { getTargetableAudiences } from '../../services/organizationService';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { StoryCard, DifficultyLevel, CourseTone, StoryCardType, Course, TargetingConfig } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';

type StudioStep = 'SOURCE' | 'TUNING' | 'GENERATING' | 'DIRECTOR' | 'TARGETING' | 'PUBLISH';

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardMediaRef = useRef<HTMLInputElement>(null);
  const textInputAreaRef = useRef<HTMLDivElement>(null); // Ref for auto-scroll

  // Studio Flow State
  const [step, setStep] = useState<StudioStep>('SOURCE');
  const [error, setError] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [existingCourseId, setExistingCourseId] = useState<string | null>(null);
  
  // 1. Source State
  const [sourceType, setSourceType] = useState<'TEXT' | 'PDF' | 'URL'>('TEXT');
  const [sourceData, setSourceData] = useState('');
  
  // 2. Tuning State
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('BEGINNER');
  const [tone, setTone] = useState<CourseTone>('CASUAL');
  const [length, setLength] = useState<'SHORT' | 'MEDIUM'>('SHORT');

  // 3. Director State
  const [courseData, setCourseData] = useState<{
      title: string;
      description: string;
      cards: StoryCard[];
      tags: string[];
  } | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // 4. Targeting & Settings
  const [targeting, setTargeting] = useState<TargetingConfig>({ type: 'ALL', targetIds: [] });
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [ownerType, setOwnerType] = useState<'USER' | 'ORGANIZATION'>('ORGANIZATION');
  const [isPublishing, setIsPublishing] = useState(false);

  // Targeting Logic State
  const [availableTargets, setAvailableTargets] = useState<{
      scope: 'GLOBAL' | 'LIMITED' | 'NONE';
      allowedDeptIds: string[];
      allowedPositionIds: string[];
  }>({ scope: 'NONE', allowedDeptIds: [], allowedPositionIds: [] });

  useEffect(() => {
      const incoming = location.state?.courseData as Course;
      if (incoming) {
          setIsEditingExisting(true);
          setExistingCourseId(incoming.id);
          setCourseData({
              title: incoming.title,
              description: incoming.description,
              cards: incoming.steps || [],
              tags: incoming.tags || []
          });
          setVisibility(incoming.visibility);
          setOwnerType(incoming.authorType);
          setTargeting(incoming.targeting || { type: 'ALL', targetIds: [] });
          setStep('DIRECTOR');
      }
  }, [location.state]);

  // Load Targeting Permissions
  useEffect(() => {
      if (step === 'TARGETING' && currentUser && currentOrganization) {
          getTargetableAudiences(currentUser, currentOrganization.id).then(setAvailableTargets);
      }
  }, [step, currentUser, currentOrganization]);

  // AUTO SCROLL EFFECT FOR MOBILE TEXT INPUT
  useEffect(() => {
      if (step === 'SOURCE' && sourceType === 'TEXT' && textInputAreaRef.current) {
          setTimeout(() => {
              textInputAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
      }
  }, [sourceType, step]);

  const handleGenerate = async () => {
      setStep('GENERATING');
      setError(null);
      
      const timeoutId = setTimeout(() => {
          if (step === 'GENERATING') {
              setError("İşlem beklenenden uzun sürdü. Lütfen tekrar deneyin.");
              setStep('TUNING');
          }
      }, 45000); 

      try {
          const result = await generateMagicCourse(sourceData, {
              level: difficulty,
              tone: tone,
              length: length,
              language: 'Turkish'
          });

          clearTimeout(timeoutId);

          if (result && result.cards && result.cards.length > 0) {
              setCourseData(result);
              setStep('DIRECTOR');
          } else {
              throw new Error("Boş yanıt alındı.");
          }
      } catch (err: any) {
          clearTimeout(timeoutId);
          setError("Yapay zeka içeriği kurgulayamadı. Lütfen metni değiştirip deneyin.");
          setStep('TUNING');
      }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !courseData) return;
      
      setIsUploadingMedia(true);
      try {
          const url = await uploadFile(file, 'course_media');
          updateActiveCard({ mediaUrl: url });
      } catch (err) {
          alert("Görsel yüklenemedi.");
      } finally {
          setIsUploadingMedia(false);
      }
  };

  const applyImageToAll = () => {
      if (!courseData) return;
      const currentUrl = courseData.cards[activeCardIndex].mediaUrl;
      const newCards = courseData.cards.map(c => ({ ...c, mediaUrl: currentUrl }));
      setCourseData({ ...courseData, cards: newCards });
      alert("Bu görsel tüm kartlara uygulandı.");
  };

  const updateActiveCard = (updates: Partial<StoryCard>) => {
      if (!courseData) return;
      const newCards = [...courseData.cards];
      newCards[activeCardIndex] = { ...newCards[activeCardIndex], ...updates };
      setCourseData({ ...courseData, cards: newCards });
  };

  const deleteActiveCard = () => {
      if (!courseData || courseData.cards.length <= 1) return;
      const newCards = courseData.cards.filter((_, i) => i !== activeCardIndex);
      setCourseData({ ...courseData, cards: newCards });
      setActiveCardIndex(Math.max(0, activeCardIndex - 1));
  };

  const handlePublish = async () => {
      if (!courseData || !currentUser) return;
      setIsPublishing(true);
      
      const payload: any = {
          ...courseData,
          thumbnailUrl: courseData.cards[0].mediaUrl,
          duration: courseData.cards.length,
          xpReward: 100,
          visibility,
          targeting,
          authorType: ownerType,
          organizationId: currentOrganization?.id,
          categoryId: 'cat_genel',
          price: 0,
          priceType: 'FREE',
          steps: courseData.cards
      };

      try {
          let success = false;
          if (isEditingExisting && existingCourseId) {
              success = await updateCourse(existingCourseId, payload);
          } else {
              success = await publishContent(payload, currentUser);
          }
          if (success) navigate('/admin/courses');
      } catch (e) {
          alert("Hata oluştu.");
      } finally {
          setIsPublishing(false);
      }
  };

  const toggleTargetId = (id: string) => {
      const current = targeting.targetIds;
      if (current.includes(id)) {
          setTargeting({ ...targeting, targetIds: current.filter(x => x !== id) });
      } else {
          setTargeting({ ...targeting, targetIds: [...current, id] });
      }
  };

  const renderCardIcon = (type: StoryCardType) => {
      switch(type) {
          case 'COVER': return <ImageIcon className="w-4 h-4" />;
          case 'QUIZ': return <MessageSquare className="w-4 h-4 text-orange-500" />;
          case 'REWARD': return <Award className="w-4 h-4 text-yellow-500" />;
          default: return <FileType className="w-4 h-4 text-blue-500" />;
      }
  };

  return (
    // Changed to min-h-screen for mobile scrolling, fixed height only on md+
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-100px)] bg-gray-50 overflow-y-auto md:overflow-hidden rounded-[2.5rem] border border-gray-200 shadow-xl relative">
        
        {/* TOP STATUS BAR */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex justify-between items-center shrink-0 sticky top-0 z-50">
            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar">
                {[
                    { id: 'SOURCE', label: '1' }, 
                    { id: 'TUNING', label: '2' }, 
                    { id: 'DIRECTOR', label: '3' }, 
                    { id: 'TARGETING', label: '4' }
                ].map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 md:gap-4 shrink-0">
                        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs transition-colors ${step === s.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {s.label}
                        </div>
                        {i < 3 && <div className="w-4 md:w-8 h-0.5 bg-gray-100" />}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-black text-primary uppercase hidden md:inline">{isEditingExisting ? 'Düzenleme' : 'Stüdyo'}</span>
                <button onClick={() => navigate('/admin/courses')} className="p-2 bg-gray-100 rounded-full md:hidden">
                    <Trash2 className="w-4 h-4 text-gray-500" />
                </button>
            </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
            {step === 'SOURCE' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto text-center w-full overflow-y-auto">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8 mt-4 md:mt-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-accent" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-primary mb-2">Nasıl Başlamak İstersin?</h1>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full mb-8">
                        <button onClick={() => setSourceType('TEXT')} className={`p-6 md:p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${sourceType === 'TEXT' ? 'border-primary bg-primary/5 shadow-xl' : 'border-gray-100 bg-white hover:border-accent'}`}>
                            <div className={`p-4 rounded-2xl ${sourceType === 'TEXT' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}><Type className="w-6 h-6 md:w-8 md:h-8" /></div>
                            <span className="font-bold text-gray-800">AI ile Konuş</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-6 md:p-8 rounded-[2rem] border-2 border-gray-100 bg-white hover:border-accent transition-all flex flex-col items-center gap-4 group">
                            <div className="p-4 rounded-2xl bg-gray-50 text-gray-400 group-hover:bg-red-50 group-hover:text-red-500"><FileType className="w-6 h-6 md:w-8 md:h-8" /></div>
                            <span className="font-bold text-gray-800">PDF'den Üret</span>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" />
                        </button>
                        <button onClick={() => setSourceType('URL')} className={`p-6 md:p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${sourceType === 'URL' ? 'border-primary bg-primary/5 shadow-xl' : 'border-gray-100 bg-white hover:border-accent'}`}>
                            <div className={`p-4 rounded-2xl ${sourceType === 'URL' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}><Link className="w-6 h-6 md:w-8 md:h-8" /></div>
                            <span className="font-bold text-gray-800">Link Yapıştır</span>
                        </button>
                    </div>

                    <div className="w-full max-w-2xl pb-20">
                        {sourceType === 'TEXT' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }}
                                ref={textInputAreaRef} // Scroll target
                                className="bg-white p-2 rounded-3xl border-2 border-gray-100 shadow-sm"
                            >
                                <textarea 
                                    value={sourceData} 
                                    onChange={e => setSourceData(e.target.value)} 
                                    placeholder="Eğitimin konusunu, hedef kitlesini ve ana mesajlarını buraya detaylıca yaz..." 
                                    className="w-full h-48 md:h-40 p-4 md:p-6 bg-transparent outline-none font-medium resize-none text-lg text-gray-900 placeholder-gray-400" 
                                />
                                <button 
                                    onClick={() => setStep('TUNING')} 
                                    disabled={!sourceData.trim()} 
                                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    İleri Git <ArrowDown className="w-5 h-5 md:hidden animate-bounce" />
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            )}

            {step === 'TUNING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-2xl mx-auto w-full overflow-y-auto">
                    <h1 className="text-2xl md:text-3xl font-black text-primary mb-8 text-center">İnce Ayarlar</h1>
                    <div className="w-full space-y-8">
                        {error && <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"><AlertCircle className="w-5 h-5" /> {error}</div>}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Zorluk</label>
                            <div className="flex gap-2">
                                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as DifficultyLevel[]).map(l => (
                                    <button key={l} onClick={() => setDifficulty(l)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${difficulty === l ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}>
                                        {l === 'BEGINNER' ? 'Başlangıç' : l === 'INTERMEDIATE' ? 'Orta' : 'İleri'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ton</label>
                            <div className="flex gap-2">
                                {(['FORMAL', 'CASUAL', 'FUN'] as CourseTone[]).map(t => (
                                    <button key={t} onClick={() => setTone(t)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${tone === t ? 'bg-accent text-primary shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-12 w-full pb-10">
                        <button onClick={() => setStep('SOURCE')} className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600 bg-white border border-gray-200 rounded-2xl">Geri</button>
                        <button onClick={handleGenerate} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98]"><Wand2 className="w-5 h-5 text-accent" /> Sihirli Oluştur</button>
                    </div>
                </div>
            )}

            {step === 'GENERATING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                    <div className="relative mb-8">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-24 h-24 rounded-full border-t-4 border-accent border-r-4 border-r-transparent" />
                        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-accent animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-primary text-center">Eğitim Kurgulanıyor...</h2>
                    <p className="text-gray-400 text-sm mt-2 text-center">Bu işlem içeriğin uzunluğuna göre 1 dakika sürebilir.</p>
                </div>
            )}

            {step === 'DIRECTOR' && courseData && (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* LEFT PANEL: CARD LIST (Desktop: Sidebar, Mobile: Horizontal Top Scroll) */}
                    <div className="md:w-72 border-r border-gray-100 flex flex-row md:flex-col bg-white shrink-0 overflow-x-auto md:overflow-y-auto no-scrollbar order-1 md:order-1 border-b md:border-b-0">
                        <div className="hidden md:flex p-4 border-b border-gray-50 justify-between items-center">
                            <span className="text-xs font-black text-gray-400 uppercase">Akış</span>
                            <button className="p-1 text-gray-400 hover:text-primary"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="flex md:flex-col p-2 md:p-3 gap-2">
                            {courseData.cards.map((card, idx) => (
                                <div 
                                    key={card.id} onClick={() => setActiveCardIndex(idx)}
                                    className={`p-2 md:p-3 rounded-xl md:rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-2 md:gap-3 min-w-[140px] md:min-w-0 ${activeCardIndex === idx ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-50 hover:border-gray-200'}`}
                                >
                                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">{idx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase truncate">{card.type}</div>
                                        <div className="text-[10px] md:text-xs font-bold text-gray-800 truncate">{card.title}</div>
                                    </div>
                                    {renderCardIcon(card.type)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CENTER PANEL: PREVIEW */}
                    <div className="flex-1 bg-gray-50 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden order-2 md:order-2">
                        <div className="w-[280px] h-[520px] md:w-[340px] md:h-[640px] bg-black rounded-[2.5rem] md:rounded-[3rem] border-[8px] md:border-[10px] border-gray-900 shadow-2xl relative overflow-hidden flex flex-col">
                            <div className="flex-1 relative flex flex-col">
                                <img src={courseData.cards[activeCardIndex].mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                <div className="relative z-10 p-6 md:p-8 mt-auto text-white">
                                    <span className="text-[9px] md:text-[10px] font-black bg-accent text-primary px-2 py-0.5 rounded uppercase mb-2 inline-block">{courseData.cards[activeCardIndex].type}</span>
                                    <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 leading-tight">{courseData.cards[activeCardIndex].title}</h3>
                                    <p className="text-xs md:text-sm opacity-80 leading-relaxed line-clamp-4">{courseData.cards[activeCardIndex].content}</p>
                                </div>
                            </div>
                        </div>
                        {/* Mobile Next Button */}
                        <button onClick={() => setStep('TARGETING')} className="md:hidden absolute bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-xl z-20">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                        <div className="hidden md:flex absolute bottom-8 right-8 gap-4">
                             <button onClick={() => setStep('TARGETING')} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-xl flex items-center gap-2">Sonraki Adım <ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: EDITOR (Desktop: Sidebar, Mobile: Bottom Panel) */}
                    <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-gray-100 flex flex-col p-4 md:p-6 overflow-y-auto no-scrollbar order-3 md:order-3 h-64 md:h-auto shrink-0">
                        <h3 className="text-xs md:text-sm font-black text-gray-800 uppercase mb-4 md:mb-6 flex items-center gap-2"><Edit className="w-4 h-4" /> Kart Özellikleri</h3>
                        
                        <div className="space-y-4 md:space-y-6">
                            <div className="space-y-2 md:space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase block">Görsel Yönetimi</label>
                                <div className="relative aspect-video rounded-xl bg-gray-100 overflow-hidden border border-gray-200 group">
                                    <img src={courseData.cards[activeCardIndex].mediaUrl} className="w-full h-full object-cover" />
                                    {isUploadingMedia && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => cardMediaRef.current?.click()} className="p-2 bg-white rounded-full text-primary shadow-lg"><Upload className="w-4 h-4" /></button>
                                        <button onClick={applyImageToAll} title="Tümüne Uygula" className="p-2 bg-accent rounded-full text-primary shadow-lg"><Copy className="w-4 h-4" /></button>
                                    </div>
                                    <input type="file" ref={cardMediaRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
                                </div>
                            </div>
                            <div className="h-px bg-gray-50" />
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Başlık</label>
                                <input value={courseData.cards[activeCardIndex].title} onChange={e => updateActiveCard({ title: e.target.value })} className="w-full p-2 md:p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold focus:border-primary outline-none text-gray-900" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">İçerik</label>
                                <textarea value={courseData.cards[activeCardIndex].content} onChange={e => updateActiveCard({ content: e.target.value })} rows={3} className="w-full p-2 md:p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium focus:border-primary outline-none resize-none text-gray-900" />
                            </div>
                            <button onClick={deleteActiveCard} className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Kartı Sil</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TARGETING ENGINE */}
            {step === 'TARGETING' && (
                <div className="flex-1 flex flex-col p-6 md:p-12 max-w-4xl mx-auto w-full overflow-y-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full">
                        <div className="text-center mb-6 md:mb-10">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Target className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Kime Yayınlansın?</h2>
                            <p className="text-gray-500 mt-2 text-sm md:text-base">
                                {availableTargets.scope === 'GLOBAL' ? 'Tüm kurum genelinde eğitim atayabilirsiniz.' : 
                                 availableTargets.scope === 'LIMITED' ? 'Sadece hiyerarşik olarak size bağlı ekibe atayabilirsiniz.' : 
                                 'Eğitim atama yetkiniz bulunmuyor.'}
                            </p>
                        </div>

                        {/* If No Permission */}
                        {availableTargets.scope === 'NONE' ? (
                            <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-8 text-center text-red-600 font-bold">
                                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                                Bu işlem için yetkiniz yok. Yöneticinize başvurun.
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    {availableTargets.scope === 'GLOBAL' && (
                                        <button 
                                            onClick={() => setTargeting({ type: 'ALL', targetIds: [] })}
                                            className={`p-4 md:p-6 rounded-2xl border-2 text-center transition-all ${targeting.type === 'ALL' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:bg-gray-50'}`}
                                        >
                                            <Globe className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2" />
                                            <span className="font-bold text-sm md:text-base">Tüm İşletme</span>
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setTargeting({ type: 'DEPARTMENT', targetIds: [] })}
                                        className={`p-4 md:p-6 rounded-2xl border-2 text-center transition-all ${targeting.type === 'DEPARTMENT' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        <Building2 className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2" />
                                        <span className="font-bold text-sm md:text-base">Departman Seçimi</span>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto border border-gray-100 rounded-3xl p-4 md:p-6 bg-gray-50 min-h-[200px]">
                                    {targeting.type === 'ALL' && (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            <p className="text-sm">Bu içerik kurumdaki herkese açık olacak.</p>
                                        </div>
                                    )}

                                    {targeting.type === 'DEPARTMENT' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                            {currentOrganization?.definitions?.departments
                                                .filter(dept => availableTargets.scope === 'GLOBAL' || availableTargets.allowedDeptIds.includes(dept.id))
                                                .map(dept => (
                                                    <button 
                                                        key={dept.id}
                                                        onClick={() => toggleTargetId(dept.id)}
                                                        className={`p-3 md:p-4 rounded-xl border flex items-center justify-between transition-all ${targeting.targetIds.includes(dept.id) ? 'bg-blue-500 text-white border-blue-600' : 'bg-white border-gray-200'}`}
                                                    >
                                                        <span className="font-bold text-sm">{dept.name}</span>
                                                        {targeting.targetIds.includes(dept.id) && <CheckCircle2 className="w-4 h-4" />}
                                                    </button>
                                                ))
                                            }
                                            {availableTargets.allowedDeptIds.length === 0 && availableTargets.scope !== 'GLOBAL' && (
                                                <div className="col-span-2 text-center text-gray-400 py-10 text-sm">Size bağlı departman bulunamadı.</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 mt-8 pb-10">
                                    <button onClick={() => setStep('DIRECTOR')} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl bg-white border border-gray-200">Geri</button>
                                    <button onClick={() => setStep('PUBLISH')} className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold shadow-lg">Sonraki: Yayınla</button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}

            {step === 'PUBLISH' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-lg mx-auto text-center w-full">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="w-8 h-8" /></div>
                    <h1 className="text-2xl md:text-3xl font-black text-primary mb-2">Harika İş!</h1>
                    <p className="text-gray-500 text-sm mb-10">Eğitim tamamlandı, şimdi yayınla.</p>
                    <div className="w-full space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setVisibility('PRIVATE')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${visibility === 'PRIVATE' ? 'border-primary bg-primary/5' : 'border-gray-100'}`}><Lock className="w-5 h-5 text-gray-400" /><span className="font-bold text-xs">Kurum İçi</span></button>
                            <button onClick={() => setVisibility('PUBLIC')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${visibility === 'PUBLIC' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}><Globe className="w-5 h-5 text-blue-500" /><span className="font-bold text-xs">Herkese Açık</span></button>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-12 w-full pb-10">
                        <button onClick={() => setStep('TARGETING')} className="flex-1 py-4 text-gray-400 font-bold bg-white border border-gray-200 rounded-2xl">Geri</button>
                        <button onClick={handlePublish} disabled={isPublishing} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-2">
                            {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Yayınla & Bitir</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
