
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, ChevronRight, Upload, CheckCircle2, Save, Loader2, 
    Hash, Target, Globe, MonitorPlay, RefreshCw, Languages,
    FileText, Plus, GripVertical, Trash2, LayoutTemplate, Smartphone,
    Image as ImageIcon, Type, AlertTriangle
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
          title: { en: 'New Slide' },
          content: { en: 'Content goes here...' },
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
          // A. Client-Side Extraction
          const text = await extractTextFromPDF(file);
          
          // B. AI Generation
          const newCards = await generateCardsFromText(text, 3);
          
          // C. Merge
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

      // If editing Base Language (EN), mark others as STALE
      let newStatus = { ...courseData.translationStatus };
      if (activeEditorLang === 'en') {
          targetLangs.forEach(l => newStatus[l] = 'STALE');
      }

      setCourseData({ ...courseData, cards: newCards, translationStatus: newStatus });
  };

  // 5. Smart Sync (Translate Stale Fields)
  const handleSmartSync = async () => {
      if (!courseData || !activeCardId) return;
      setIsProcessingAI(true);
      
      const activeCard = courseData.cards.find(c => c.id === activeCardId);
      if (!activeCard) return;

      const staleLangs = targetLangs.filter(l => courseData.translationStatus?.[l] === 'STALE');
      
      if (staleLangs.length === 0) {
          alert("Tüm çeviriler güncel.");
          setIsProcessingAI(false);
          return;
      }

      // Translate Title & Content
      const newTitle = await translateContent(activeCard.title, staleLangs);
      const newContent = await translateContent(activeCard.content, staleLangs);

      const newCards = courseData.cards.map(c => 
          c.id === activeCardId ? { ...c, title: newTitle, content: newContent } : c
      );

      const newStatus = { ...courseData.translationStatus };
      staleLangs.forEach(l => newStatus[l] = 'SYNCED');

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

  // 8. Delete Course (Full Wipe)
  const handleDeleteCourse = async () => {
      if (!existingCourseId) return;
      if (!window.confirm("DİKKAT: Bu eğitimi ve tüm görsellerini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
      
      setIsDeleting(true);
      try {
          const success = await deleteCourseFully(existingCourseId);
          if (success) {
              navigate('/admin/courses');
          } else {
              alert("Silme işlemi başarısız.");
          }
      } catch (e) {
          console.error("Delete failed", e);
          alert("Bir hata oluştu.");
      } finally {
          setIsDeleting(false);
      }
  };

  // --- RENDER HELPERS ---
  const currentCard = courseData?.cards.find(c => c.id === activeCardId);
  const editorTabs = ['en', ...targetLangs];

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        
        {/* HEADER */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
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
            <div className="w-24 flex justify-end">
                <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">Çıkış</button>
            </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* STEP 1: SETUP */}
            {step === 'SETUP' && (
                <div className="h-full flex flex-col items-center justify-center p-6 animate-in slide-in-from-right-10 fade-in duration-300">
                    <div className="max-w-2xl w-full space-y-8">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">Eğitim Kaynağı</h1>
                            <p className="text-gray-500">İçeriğini gir ve hedef kitleyi belirle.</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1"><Languages className="w-3 h-3"/> Kaynak Dili</label>
                                <select 
                                    className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-2 py-1 font-bold outline-none cursor-pointer hover:bg-gray-100"
                                    value={sourceLang}
                                    onChange={e => setSourceLang(e.target.value)}
                                >
                                    {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>)}
                                </select>
                            </div>
                            <textarea 
                                className="w-full h-32 p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 resize-none text-base font-medium placeholder-gray-400"
                                placeholder="Örn: Otelimizin check-in prosedürü şöyledir..."
                                value={sourceText}
                                onChange={e => setSourceText(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block"><Target className="w-4 h-4 inline mr-1"/> Yayınlanacak Kanal</label>
                                <select 
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 cursor-pointer hover:border-primary/50 transition-colors"
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
                                <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> İngilizce (EN) varsayılan olarak her zaman oluşturulur.</div>
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
                    </div>
                </div>
            )}

            {/* STEP 2: DESIGN */}
            {step === 'DESIGN' && (
                <div className="h-full flex flex-col items-center justify-center p-6 animate-in slide-in-from-right-10 fade-in duration-300">
                    <div className="max-w-3xl w-full space-y-8">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">Öğretim Tasarımı</h1>
                            <p className="text-gray-500">Yapay zeka içeriği nasıl yapılandırmalı?</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block"><LayoutTemplate className="w-4 h-4 inline mr-1"/> Pedagoji Modu</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { id: 'STANDARD', label: 'Standart', desc: 'Klasik bilgi ve test karışımı.' },
                                        { id: 'ACTIVE_RECALL', label: 'Aktif Hatırlama', desc: 'Sık soru sorarak bilgiyi taze tutar.' },
                                        { id: 'SOCRATIC', label: 'Sokratik Yöntem', desc: 'Düşündürücü sorularla öğretir.' },
                                        { id: 'STORYTELLING', label: 'Hikayeleştirme', desc: 'Bir senaryo üzerinden anlatır.' },
                                    ].map(mode => (
                                        <button 
                                            key={mode.id}
                                            onClick={() => setPedagogy(mode.id as PedagogyMode)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${pedagogy === mode.id ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className="font-bold text-gray-800">{mode.label}</div>
                                            <div className="text-xs text-gray-500 mt-1">{mode.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Zorluk</label>
                                <select className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold cursor-pointer" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                                    <option value="BEGINNER">Başlangıç</option>
                                    <option value="INTERMEDIATE">Orta</option>
                                    <option value="ADVANCED">İleri</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Ton</label>
                                <select className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold cursor-pointer" value={tone} onChange={e => setTone(e.target.value as any)}>
                                    <option value="CASUAL">Samimi</option>
                                    <option value="FORMAL">Kurumsal</option>
                                    <option value="FUN">Eğlenceli</option>
                                    <option value="AUTHORITATIVE">Otoriter</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-between pt-8 border-t border-gray-100">
                            <button onClick={() => setStep('SETUP')} className="text-gray-500 font-bold px-6">Geri</button>
                            <button 
                                onClick={handleGenerate}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl flex items-center gap-2 hover:shadow-2xl hover:scale-[1.02] transition-all"
                            >
                                <Wand2 className="w-5 h-5" />
                                Sihirli Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GENERATING */}
            {step === 'GENERATING' && (
                <div className="h-full flex flex-col items-center justify-center">
                    <Loader2 className="w-16 h-16 text-purple-600 animate-spin mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Eğitim Tasarlanıyor...</h2>
                    <p className="text-gray-500 animate-pulse">Master Copy (EN) hazırlanıyor • Çeviriler yapılıyor</p>
                </div>
            )}

            {/* STEP 3: DIRECTOR (3-COLUMN LAYOUT) */}
            {step === 'DIRECTOR' && courseData && (
                <div className="h-full flex flex-col md:flex-row overflow-hidden">
                    
                    {/* COL 1: STORYBOARD (Tighter & Cleaner) */}
                    <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <span className="font-bold text-xs text-gray-500 uppercase tracking-wider">AKIŞ ({courseData.cards.length})</span>
                            <div className="flex gap-1">
                                <button onClick={() => addNewCard()} className="p-1.5 hover:bg-gray-200 rounded-lg text-primary transition-colors"><Plus className="w-4 h-4" /></button>
                                <button onClick={() => pdfInputRef.current?.click()} className="p-1.5 hover:bg-gray-200 rounded-lg text-red-500 transition-colors"><FileText className="w-4 h-4" /></button>
                                <input type="file" ref={pdfInputRef} accept="application/pdf" className="hidden" onChange={handlePdfInject} />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 bg-gray-50/30">
                            <SortableList 
                                items={courseData.cards}
                                onOrderChange={handleOrderChange}
                                className="flex flex-col gap-2"
                                itemClassName=""
                                renderItem={(card, idx) => (
                                    <div 
                                        className={`p-2 rounded-lg border cursor-pointer transition-all flex gap-3 items-center group relative select-none ${
                                            activeCardId === card.id 
                                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20' 
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                        onClick={() => setActiveCardId(card.id)}
                                    >
                                        <div className="text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing"><GripVertical className="w-3 h-3" /></div>
                                        <div className="w-10 h-10 rounded-md bg-gray-100 shrink-0 overflow-hidden border border-gray-100">
                                            {card.mediaUrl && <img src={card.mediaUrl} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-gray-800 truncate mb-0.5">{card.title['en']}</div>
                                            <div className="text-[9px] text-gray-400 uppercase font-semibold bg-gray-100 px-1.5 py-0.5 rounded w-max">{card.type}</div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setCourseData({...courseData, cards: courseData.cards.filter(c => c.id !== card.id)}); }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    {/* COL 2: THE STAGE (Split Pane: Phone vs Editor) */}
                    <div className="flex-1 bg-gray-50 flex flex-row overflow-hidden relative">
                        
                        {/* 2A: PHONE PREVIEW (Left Side of Center) */}
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-100/50 overflow-hidden relative">
                            {/* Grid Pattern Background */}
                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                            
                            {currentCard ? (
                                <div className="w-[320px] h-[640px] bg-black rounded-[2.5rem] border-[8px] border-gray-900 shadow-2xl relative overflow-hidden shrink-0 z-10 ring-1 ring-white/20">
                                    <img src={currentCard.mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
                                    
                                    {/* Phone UI Overlay */}
                                    <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex justify-between items-center opacity-70">
                                        <div className="w-8 h-1 bg-white/50 rounded-full" />
                                        <div className="w-12 h-4 bg-black/50 rounded-full backdrop-blur-md" />
                                        <div className="w-8 h-1 bg-white/50 rounded-full" />
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white pb-12">
                                        <div className="inline-block bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold mb-2 uppercase border border-white/10">{currentCard.type}</div>
                                        <h2 className="text-2xl font-bold mb-2 leading-tight drop-shadow-md">{currentCard.title[activeEditorLang] || currentCard.title['en']}</h2>
                                        <p className="text-sm opacity-90 leading-relaxed font-medium drop-shadow-sm">{currentCard.content[activeEditorLang] || currentCard.content['en']}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-400 flex flex-col items-center">
                                    <Smartphone className="w-12 h-12 mb-2 opacity-20" />
                                    <p>Bir slayt seçin</p>
                                </div>
                            )}
                        </div>

                        {/* 2B: EDITOR FORM (Right Side of Center) */}
                        <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20">
                            {/* Editor Toolbar */}
                            <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
                                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                                    {editorTabs.map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setActiveEditorLang(lang)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border ${activeEditorLang === lang ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            {SUPPORTED_LANGUAGES.find(l => l.code === lang)?.flag} {lang.toUpperCase()}
                                            {courseData.translationStatus?.[lang] === 'STALE' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {currentCard ? (
                                    <>
                                        {/* Image Uploader */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Görsel</label>
                                            <div 
                                                className="aspect-video bg-gray-50 rounded-xl overflow-hidden relative group cursor-pointer border border-gray-200 hover:border-primary/50 transition-all"
                                                onClick={() => cardMediaRef.current?.click()}
                                            >
                                                <img src={currentCard.mediaUrl} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white backdrop-blur-sm">
                                                    <Upload className="w-6 h-6 mb-1" />
                                                    <span className="text-[10px] font-bold uppercase">Değiştir</span>
                                                </div>
                                                <input type="file" ref={cardMediaRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
                                            </div>
                                        </div>

                                        {/* Text Fields */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Type className="w-3 h-3" /> Başlık ({activeEditorLang})</label>
                                                <input 
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:border-primary focus:bg-white outline-none transition-all text-sm"
                                                    value={currentCard.title[activeEditorLang] || ''}
                                                    onChange={e => updateCardField('title', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">İçerik ({activeEditorLang})</label>
                                                <textarea 
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-primary focus:bg-white outline-none h-40 resize-none text-sm leading-relaxed"
                                                    value={currentCard.content[activeEditorLang] || ''}
                                                    onChange={e => updateCardField('content', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Translation Helper */}
                                        {courseData.translationStatus?.[activeEditorLang] === 'STALE' && (
                                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between">
                                                <div className="text-xs text-orange-700 font-medium flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Çeviri güncel değil.
                                                </div>
                                                <button 
                                                    onClick={handleSmartSync}
                                                    disabled={isProcessingAI}
                                                    className="text-[10px] font-bold bg-orange-100 text-orange-800 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1"
                                                >
                                                    {isProcessingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                    Otomatik Düzelt
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                        Düzenlemek için soldan bir slayt seçin.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COL 3: ASSISTANT / ACTIONS */}
                    <div className="w-full md:w-64 bg-white border-l border-gray-200 p-4 flex flex-col shrink-0 z-30 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
                        <h3 className="font-bold text-gray-800 text-xs mb-4 uppercase tracking-wider flex items-center gap-2">
                            <MonitorPlay className="w-4 h-4" /> Prodüksiyon
                        </h3>
                        
                        <div className="space-y-4 flex-1">
                            {/* Language Status */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Dil Durumu</div>
                                {targetLangs.map(l => (
                                    <div key={l} className="flex justify-between items-center mb-1.5 last:mb-0">
                                        <span className="uppercase font-bold text-xs text-gray-600">{l}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${courseData.translationStatus?.[l] === 'STALE' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                            {courseData.translationStatus?.[l] || 'SYNCED'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button onClick={handleSmartSync} disabled={isProcessingAI} className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                                {isProcessingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Tüm Dilleri Eşitle
                            </button>
                        </div>

                        {/* Danger Zone */}
                        {isEditingExisting && existingCourseId && (
                            <div className="mb-4 pt-4 border-t border-gray-100">
                                <button 
                                    onClick={handleDeleteCourse}
                                    disabled={isDeleting}
                                    className="w-full py-3 border-2 border-red-50 text-red-500 font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-100 transition-colors"
                                >
                                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    Eğitimi Tamamen Sil
                                </button>
                            </div>
                        )}

                        <button onClick={handlePublish} disabled={isPublishing} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-primary-light transition-all active:scale-95">
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Yayınla
                        </button>
                    </div>

                </div>
            )}
        </div>
    </div>
  );
};
