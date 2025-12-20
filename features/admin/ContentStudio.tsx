
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, ChevronRight, Upload, CheckCircle2, Save, Loader2, 
    Hash, Target, Globe, MonitorPlay, RefreshCw, Languages,
    FileText, Plus, GripVertical, Trash2, LayoutTemplate, Smartphone,
    Image as ImageIcon, Type, AlertTriangle, MoreHorizontal, Settings2,
    Eye, Play
} from 'lucide-react';
import { generateMagicCourse, generateCardsFromText, translateContent } from '../../services/geminiService';
import { publishContent, deleteCourseFully } from '../../services/courseService';
import { updateCourse } from '../../services/db';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { StoryCard, DifficultyLevel, CourseTone, PedagogyMode, Course, LocalizedString, StoryCardType, TranslationStatus } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { SUPPORTED_LANGUAGES } from '../../i18n/config';
import { SortableList } from '../../components/ui/SortableList';
import { extractTextFromPDF } from '../../utils/fileHelpers';

type StudioStep = 'SETUP' | 'DESIGN' | 'GENERATING' | 'DIRECTOR' | 'PUBLISH';

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cardMediaRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [step, setStep] = useState<StudioStep>('SETUP');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [existingCourseId, setExistingCourseId] = useState<string | null>(null);
  
  // Setup State
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('tr'); 
  const [targetLangs, setTargetLangs] = useState<string[]>(['tr']); // EN is implicit base
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  
  // Design State
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('BEGINNER');
  const [tone, setTone] = useState<CourseTone>('CASUAL');
  const [pedagogy, setPedagogy] = useState<PedagogyMode>('STANDARD');
  
  // Director State
  const [courseData, setCourseData] = useState<{
      title: LocalizedString;
      description: LocalizedString;
      cards: StoryCard[];
      tags: string[];
      translationStatus?: Record<string, TranslationStatus>;
  } | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeEditorLang, setActiveEditorLang] = useState<string>('en'); 
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- INIT ---
  useEffect(() => {
      const incoming = location.state?.courseData as Course;
      if (incoming) {
          setIsEditingExisting(true);
          setExistingCourseId(incoming.id);
          const availableKeys = Object.keys(incoming.title);
          setTargetLangs(availableKeys.filter(k => k !== 'en'));
          setActiveEditorLang('en');
          
          setCourseData({
              title: incoming.title,
              description: incoming.description,
              cards: incoming.steps || [],
              tags: incoming.tags || [],
              translationStatus: incoming.translationStatus || {}
          });
          if(incoming.steps.length > 0) setActiveCardId(incoming.steps[0].id);
          setSelectedChannelId(incoming.channelId || '');
          setStep('DIRECTOR');
      }
  }, [location.state]);

  // --- SETUP ACTIONS ---
  const toggleTargetLang = (code: string) => {
      if (code === 'en') return; 
      if (targetLangs.includes(code)) {
          setTargetLangs(prev => prev.filter(l => l !== code));
      } else {
          setTargetLangs(prev => [...prev, code]);
      }
  };

  const handleGenerate = async () => {
      setStep('GENERATING');
      try {
          const result = await generateMagicCourse(sourceText, {
              sourceLanguage: SUPPORTED_LANGUAGES.find(l => l.code === sourceLang)?.name || 'Turkish',
              level: difficulty,
              tone: tone,
              length: 'SHORT',
              targetLanguages: targetLangs, 
              pedagogyMode: pedagogy
          });

          if (result) {
              setCourseData({
                  ...result,
                  translationStatus: targetLangs.reduce((acc, lang) => ({...acc, [lang]: 'SYNCED'}), {})
              });
              if(result.cards.length > 0) setActiveCardId(result.cards[0].id);
              setActiveEditorLang('en'); 
              setStep('DIRECTOR');
          } else {
              alert("İçerik oluşturulamadı.");
              setStep('DESIGN');
          }
      } catch (e) {
          console.error(e);
          setStep('DESIGN');
      }
  };

  // --- DIRECTOR ACTIONS ---

  // 1. Drag & Drop Reordering
  const handleOrderChange = (newCards: StoryCard[]) => {
      if (!courseData) return;
      setCourseData({ ...courseData, cards: newCards });
  };

  // 2. Add New Card (Manual or AI)
  const addNewCard = (type: StoryCardType = 'INFO') => {
      if (!courseData) return;
      const newCard: StoryCard = {
          id: `card-new-${Date.now()}`,
          type,
          title: { en: 'Yeni Sayfa' },
          content: { en: 'İçerik buraya...' },
          mediaUrl: 'https://via.placeholder.com/400',
          duration: 5,
          source: { type: 'MANUAL' }
      };
      setCourseData({ ...courseData, cards: [...courseData.cards, newCard] });
      setActiveCardId(newCard.id);
  };

  // 3. Inject from PDF
  const handlePdfInject = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !courseData) return;
      
      setIsProcessingAI(true);
      try {
          const text = await extractTextFromPDF(file);
          const newCards = await generateCardsFromText(text, 3);
          setCourseData({ 
              ...courseData, 
              cards: [...courseData.cards, ...newCards] 
          });
          alert(`${newCards.length} yeni slayt eklendi!`);
      } catch (err) {
          console.error(err);
          alert("PDF işlenemedi.");
      } finally {
          setIsProcessingAI(false);
          if(pdfInputRef.current) pdfInputRef.current.value = '';
      }
  };

  // 4. Update Field (Triggers Stale Status)
  const updateCardField = (field: 'title' | 'content', value: string) => {
      if (!courseData || !activeCardId) return;
      
      const newCards = courseData.cards.map(card => {
          if (card.id === activeCardId) {
              return {
                  ...card,
                  [field]: { ...card[field], [activeEditorLang]: value }
              };
          }
          return card;
      });

      let newStatus = { ...courseData.translationStatus };
      if (activeEditorLang === 'en') {
          targetLangs.forEach(l => newStatus[l] = 'STALE');
      }

      setCourseData({ ...courseData, cards: newCards, translationStatus: newStatus });
  };

  // 5. Smart Sync
  const handleSmartSync = async () => {
      if (!courseData || !activeCardId) return;
      setIsProcessingAI(true);
      
      const activeCard = courseData.cards.find(c => c.id === activeCardId);
      if (!activeCard) return;

      const staleLangs = targetLangs.filter(l => courseData.translationStatus?.[l] === 'STALE');
      
      if (staleLangs.length === 0) {
          // If no specific stale found, maybe force translate empty ones
          // For now just translate all target langs to ensure sync
      }

      const newTitle = await translateContent(activeCard.title, targetLangs);
      const newContent = await translateContent(activeCard.content, targetLangs);

      const newCards = courseData.cards.map(c => 
          c.id === activeCardId ? { ...c, title: newTitle, content: newContent } : c
      );

      const newStatus = { ...courseData.translationStatus };
      targetLangs.forEach(l => newStatus[l] = 'SYNCED');

      setCourseData({ ...courseData, cards: newCards, translationStatus: newStatus });
      setIsProcessingAI(false);
  };

  // 6. Media Upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !courseData || !activeCardId) return;
      setIsUploadingMedia(true);
      try {
          const url = await uploadFile(file, 'course_media');
          const newCards = courseData.cards.map(c => c.id === activeCardId ? { ...c, mediaUrl: url } : c);
          setCourseData({ ...courseData, cards: newCards });
      } catch (err) { alert("Hata"); } finally { setIsUploadingMedia(false); }
  };

  // 7. Publish
  const handlePublish = async () => {
      if (!courseData || !currentUser || !selectedChannelId) return;
      setIsPublishing(true);
      
      const payload: any = {
          ...courseData,
          thumbnailUrl: courseData.cards[0]?.mediaUrl || '',
          duration: courseData.cards.length, 
          xpReward: 100,
          visibility: 'PRIVATE',
          channelId: selectedChannelId,
          authorType: 'ORGANIZATION',
          organizationId: currentOrganization?.id,
          categoryId: 'cat_genel',
          price: 0,
          priceType: 'FREE',
          steps: courseData.cards,
          config: {
              pedagogyMode: pedagogy,
              targetLanguages: ['en', ...targetLangs],
              sourceType: 'TEXT',
              level: difficulty,
              tone: tone
          }
      };

      try {
          if (isEditingExisting && existingCourseId) {
              await updateCourse(existingCourseId, payload);
          } else {
              await publishContent(payload, currentUser);
          }
          navigate('/admin/courses');
      } catch (e) {
          alert("Yayınlama hatası.");
      } finally {
          setIsPublishing(false);
      }
  };

  // 8. Delete Course
  const handleDeleteCourse = async () => {
      if (!existingCourseId) return;
      if (!window.confirm("DİKKAT: Bu eğitimi ve tüm görsellerini kalıcı olarak silmek istediğinize emin misiniz?")) return;
      
      setIsDeleting(true);
      try {
          await deleteCourseFully(existingCourseId);
          navigate('/admin/courses');
      } catch (e) {
          alert("Silme işlemi başarısız.");
      } finally {
          setIsDeleting(false);
      }
  };

  // --- RENDER HELPERS ---
  const currentCard = courseData?.cards.find(c => c.id === activeCardId);
  const editorTabs = ['en', ...targetLangs];

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        
        {/* HEADER */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-50 relative shadow-sm">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
                    <Wand2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-gray-800 text-lg">AI Studio Pro</span>
            </div>
            
            <div className="flex items-center gap-2">
                {['SETUP', 'DESIGN', 'DIRECTOR'].map((s, idx) => (
                    <div key={s} className={`flex items-center gap-2 ${step === s ? 'opacity-100' : 'opacity-40'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm transition-all ${step === s ? 'bg-primary text-white scale-110' : 'bg-gray-100 text-gray-600'}`}>
                            {idx + 1}
                        </div>
                        <span className="text-xs font-bold hidden md:block">{s}</span>
                        {idx < 2 && <div className="w-4 h-px bg-gray-300 mx-2" />}
                    </div>
                ))}
            </div>
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">Çıkış</button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* SETUP & DESIGN STEPS (Full Screen) */}
            {(step === 'SETUP' || step === 'DESIGN') && (
                <div className="h-full flex flex-col items-center justify-center p-6 animate-in slide-in-from-right-10 fade-in duration-300 bg-white">
                    <div className="max-w-2xl w-full space-y-8">
                        {step === 'SETUP' ? (
                            <>
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 mb-2">Eğitim Kaynağı</h1>
                                    <p className="text-gray-500">İçeriğini gir ve hedef kitleyi belirle.</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Languages className="w-3 h-3"/> Kaynak Dili</label>
                                        <select 
                                            className="bg-white border border-gray-200 rounded-lg text-sm px-2 py-1 font-bold outline-none cursor-pointer"
                                            value={sourceLang}
                                            onChange={e => setSourceLang(e.target.value)}
                                        >
                                            {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>)}
                                        </select>
                                    </div>
                                    <textarea 
                                        className="w-full h-32 p-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 resize-none text-base font-medium placeholder-gray-400 focus:outline-none"
                                        placeholder="Örn: Otelimizin check-in prosedürü şöyledir..."
                                        value={sourceText}
                                        onChange={e => setSourceText(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-3 block"><Target className="w-4 h-4 inline mr-1"/> Yayınlanacak Kanal</label>
                                        <select 
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 cursor-pointer"
                                            value={selectedChannelId}
                                            onChange={e => setSelectedChannelId(e.target.value)}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {currentOrganization?.channels?.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-3 block"><Globe className="w-4 h-4 inline mr-1"/> Ek Diller (EN Hariç)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {SUPPORTED_LANGUAGES.filter(l => !l.isBase).map(lang => (
                                                <button 
                                                    key={lang.code}
                                                    onClick={() => toggleTargetLang(lang.code)}
                                                    className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all active:scale-95 ${targetLangs.includes(lang.code) ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm font-bold' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    <span className="text-lg">{lang.flag}</span>
                                                    <span className="text-sm">{lang.code.toUpperCase()}</span>
                                                    {targetLangs.includes(lang.code) && <CheckCircle2 className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button 
                                        onClick={() => setStep('DESIGN')} 
                                        disabled={!sourceText || !selectedChannelId}
                                        className="bg-primary text-white px-8 py-4 rounded-xl font-bold shadow-xl flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
                                    >
                                        Devam Et <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* DESIGN STEP CONTENT (Simplified for brevity) */}
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 mb-2">Öğretim Tasarımı</h1>
                                    <p className="text-gray-500">Yapay zeka içeriği nasıl yapılandırmalı?</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {/* ... Design Controls ... */}
                                    <div className="flex justify-between pt-8 border-t border-gray-100">
                                        <button onClick={() => setStep('SETUP')} className="text-gray-500 font-bold px-6">Geri</button>
                                        <button onClick={handleGenerate} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl flex items-center gap-2 hover:scale-[1.02] transition-all"><Wand2 className="w-5 h-5" /> Sihirli Oluştur</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* GENERATING LOADER */}
            {step === 'GENERATING' && (
                <div className="h-full flex flex-col items-center justify-center bg-white">
                    <Loader2 className="w-16 h-16 text-purple-600 animate-spin mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Eğitim Tasarlanıyor...</h2>
                    <p className="text-gray-500 animate-pulse">Master Copy (EN) hazırlanıyor • Çeviriler yapılıyor</p>
                </div>
            )}

            {/* STEP 3: DIRECTOR (3-COLUMN LAYOUT) */}
            {step === 'DIRECTOR' && courseData && (
                <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-gray-50">
                    
                    {/* COLUMN 1: MANAGEMENT HUB (Left Panel) */}
                    <div className="w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col h-full z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                        {/* Top: Flow Header */}
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <span className="font-bold text-xs text-gray-500 uppercase tracking-wider">AKIŞ ({courseData.cards.length})</span>
                            <div className="flex gap-1">
                                <button onClick={() => addNewCard()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-primary transition-all"><Plus className="w-4 h-4" /></button>
                                <button onClick={() => pdfInputRef.current?.click()} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-red-500 transition-all"><FileText className="w-4 h-4" /></button>
                                <input type="file" ref={pdfInputRef} accept="application/pdf" className="hidden" onChange={handlePdfInject} />
                            </div>
                        </div>

                        {/* Middle: Sortable List */}
                        <div className="flex-1 overflow-y-auto p-3 bg-gray-50/30">
                            <SortableList 
                                items={courseData.cards}
                                onOrderChange={handleOrderChange}
                                className="flex flex-col gap-2"
                                renderItem={(card, idx) => (
                                    <div 
                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex gap-3 items-center group relative select-none ${
                                            activeCardId === card.id 
                                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20 shadow-sm' 
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                        onClick={() => setActiveCardId(card.id)}
                                    >
                                        <div className="text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing"><GripVertical className="w-4 h-4" /></div>
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 overflow-hidden border border-gray-100">
                                            {card.mediaUrl && <img src={card.mediaUrl} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-gray-800 truncate mb-0.5">{card.title['en']}</div>
                                            <div className="text-[9px] text-gray-400 uppercase font-semibold bg-gray-100 px-1.5 py-0.5 rounded w-max">{card.type}</div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setCourseData({...courseData, cards: courseData.cards.filter(c => c.id !== card.id)}); }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1.5 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            />
                        </div>

                        {/* Bottom: Production Controls (Fixed) */}
                        <div className="p-4 border-t border-gray-200 bg-white flex flex-col gap-3 shrink-0">
                            <div className="flex items-center gap-2 mb-1">
                                <MonitorPlay className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">PRODÜKSİYON</span>
                            </div>
                            
                            {/* Lang Status Grid */}
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase font-bold mb-2">Dil Durumu</div>
                                <div className="space-y-1.5">
                                    {targetLangs.map(l => (
                                        <div key={l} className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-600 uppercase">{l}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${courseData.translationStatus?.[l] === 'STALE' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                {courseData.translationStatus?.[l] || 'SYNCED'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleSmartSync} disabled={isProcessingAI} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
                                {isProcessingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                Tüm Dilleri Eşitle
                            </button>

                            <div className="h-px bg-gray-100 my-1" />

                            <div className="flex flex-col gap-2">
                                <button onClick={handlePublish} disabled={isPublishing} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-light active:scale-95 transition-all text-sm">
                                    {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Yayınla
                                </button>
                                {isEditingExisting && existingCourseId && (
                                    <button 
                                        onClick={handleDeleteCourse}
                                        disabled={isDeleting}
                                        className="w-full py-2.5 border border-red-100 text-red-500 hover:bg-red-50 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        Eğitimi Tamamen Sil
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: THE WORKBENCH (Center Panel) */}
                    <div className="flex-1 flex flex-col bg-white relative z-10 overflow-hidden">
                        {/* Editor Toolbar */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                {editorTabs.map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setActiveEditorLang(lang)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${activeEditorLang === lang ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        {SUPPORTED_LANGUAGES.find(l => l.code === lang)?.flag} {lang.toUpperCase()}
                                        {courseData.translationStatus?.[lang] === 'STALE' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Editor Canvas */}
                        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                            {currentCard ? (
                                <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {/* Media Section */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Görsel</label>
                                            <div className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-mono">1080x1920 (9:16)</div>
                                        </div>
                                        <div 
                                            className="w-full aspect-video bg-gray-50 rounded-2xl overflow-hidden relative group cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary/50 transition-all shadow-inner"
                                            onClick={() => cardMediaRef.current?.click()}
                                        >
                                            <img src={currentCard.mediaUrl} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white backdrop-blur-sm">
                                                <Upload className="w-8 h-8 mb-2" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Değiştir</span>
                                            </div>
                                            <input type="file" ref={cardMediaRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
                                        </div>
                                    </div>

                                    {/* Text Fields */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Type className="w-3 h-3" /> Başlık ({activeEditorLang})</label>
                                            <input 
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 text-lg focus:border-primary focus:bg-white focus:shadow-lg focus:shadow-primary/5 outline-none transition-all placeholder-gray-300"
                                                value={currentCard.title[activeEditorLang] || ''}
                                                onChange={e => updateCardField('title', e.target.value)}
                                                placeholder="Başlık giriniz..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">İçerik ({activeEditorLang})</label>
                                            <textarea 
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-gray-700 text-base leading-relaxed focus:border-primary focus:bg-white focus:shadow-lg focus:shadow-primary/5 outline-none h-48 resize-none transition-all placeholder-gray-300"
                                                value={currentCard.content[activeEditorLang] || ''}
                                                onChange={e => updateCardField('content', e.target.value)}
                                                placeholder="İçerik metni..."
                                            />
                                        </div>
                                    </div>

                                    {/* Smart Fix Notification */}
                                    {courseData.translationStatus?.[activeEditorLang] === 'STALE' && (
                                        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg text-orange-500 shadow-sm"><AlertTriangle className="w-5 h-5" /></div>
                                                <div className="text-sm text-orange-800 font-medium">Bu dilin içeriği ana metinle (EN) uyumlu değil.</div>
                                            </div>
                                            <button 
                                                onClick={handleSmartSync}
                                                disabled={isProcessingAI}
                                                className="text-xs font-bold bg-white text-orange-700 px-4 py-2 rounded-xl hover:bg-orange-100 transition-colors shadow-sm flex items-center gap-2"
                                            >
                                                {isProcessingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                Otomatik Düzelt
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="font-medium">Düzenlemek için soldan bir slayt seçin.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMN 3: THE STAGE (Right Panel / Preview) */}
                    <div className="hidden lg:flex w-[400px] bg-gray-100 border-l border-gray-200 flex-col shrink-0 items-center justify-center relative overflow-hidden">
                        {/* Background Grid Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                        
                        <h3 className="absolute top-6 text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Canlı Önizleme
                        </h3>

                        {/* Phone Frame */}
                        {currentCard ? (
                            <div className="w-[300px] h-[600px] bg-black rounded-[2.5rem] border-[8px] border-gray-900 shadow-2xl relative overflow-hidden shrink-0 z-10 ring-1 ring-black/10 transform transition-transform hover:scale-[1.02] duration-500">
                                <img src={currentCard.mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
                                
                                {/* Phone UI Header */}
                                <div className="absolute top-0 left-0 right-0 p-5 pt-6 flex justify-between items-center opacity-80 z-20">
                                    <div className="w-8 h-1 bg-white/50 rounded-full backdrop-blur-md" />
                                    <div className="w-12 h-4 bg-black/50 rounded-full backdrop-blur-md" />
                                    <div className="w-8 h-1 bg-white/50 rounded-full backdrop-blur-md" />
                                </div>

                                {/* Phone Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white pb-12 z-20">
                                    <div className="inline-block bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold mb-3 uppercase border border-white/10 shadow-lg">
                                        {currentCard.type}
                                    </div>
                                    <h2 className="text-2xl font-black mb-3 leading-tight drop-shadow-lg">
                                        {currentCard.title[activeEditorLang] || currentCard.title['en']}
                                    </h2>
                                    <p className="text-sm opacity-90 leading-relaxed font-medium drop-shadow-md">
                                        {currentCard.content[activeEditorLang] || currentCard.content['en']}
                                    </p>
                                </div>

                                {/* Interactive Mock */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px] cursor-pointer">
                                    <Play className="w-12 h-12 text-white fill-white drop-shadow-xl" />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center opacity-30">
                                <Smartphone className="w-20 h-20 mx-auto mb-4" />
                                <p className="font-bold">Önizleme Yok</p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    </div>
  );
};
