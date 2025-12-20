
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, ChevronRight, Upload, CheckCircle2, Save, Loader2, 
    Hash, Target, Globe, BookOpen, Layers, MonitorPlay, RefreshCw
} from 'lucide-react';
import { generateMagicCourse } from '../../services/geminiService';
import { publishContent } from '../../services/courseService';
import { updateCourse } from '../../services/db';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { StoryCard, DifficultyLevel, CourseTone, PedagogyMode, Course, LocalizedString } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';

type StudioStep = 'SETUP' | 'DESIGN' | 'GENERATING' | 'DIRECTOR' | 'PUBLISH';

const AVAILABLE_LANGS = [
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cardMediaRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [step, setStep] = useState<StudioStep>('SETUP');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [existingCourseId, setExistingCourseId] = useState<string | null>(null);
  
  // Setup State
  const [sourceText, setSourceText] = useState('');
  const [targetLangs, setTargetLangs] = useState<string[]>(['tr']); // Default TR
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
  } | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [activeEditorLang, setActiveEditorLang] = useState<string>('tr'); // Which lang tab is open
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // --- INIT ---
  useEffect(() => {
      const incoming = location.state?.courseData as Course;
      if (incoming) {
          setIsEditingExisting(true);
          setExistingCourseId(incoming.id);
          // Auto-detect available languages from the title object
          const availableKeys = Object.keys(incoming.title);
          setTargetLangs(availableKeys);
          setActiveEditorLang(availableKeys[0] || 'tr');
          
          setCourseData({
              title: incoming.title,
              description: incoming.description,
              cards: incoming.steps || [],
              tags: incoming.tags || []
          });
          setSelectedChannelId(incoming.channelId || '');
          setStep('DIRECTOR');
      }
  }, [location.state]);

  // --- ACTIONS ---

  const toggleLang = (code: string) => {
      if (targetLangs.includes(code)) {
          if (targetLangs.length > 1) setTargetLangs(prev => prev.filter(l => l !== code));
      } else {
          setTargetLangs(prev => [...prev, code]);
      }
  };

  const handleGenerate = async () => {
      setStep('GENERATING');
      try {
          const result = await generateMagicCourse(sourceText, {
              level: difficulty,
              tone: tone,
              length: 'SHORT', // Hardcoded for demo
              targetLanguages: targetLangs,
              pedagogyMode: pedagogy
          });

          if (result) {
              setCourseData(result);
              setActiveEditorLang(targetLangs[0]); // Set editor to first selected lang
              setStep('DIRECTOR');
          } else {
              alert("İçerik oluşturulamadı. Lütfen tekrar deneyin.");
              setStep('DESIGN');
          }
      } catch (e) {
          console.error(e);
          setStep('DESIGN');
      }
  };

  const updateCardField = (field: 'title' | 'content', value: string) => {
      if (!courseData) return;
      const newCards = [...courseData.cards];
      const card = newCards[activeCardIndex];
      
      // Update specific language key in LocalizedString
      newCards[activeCardIndex] = {
          ...card,
          [field]: { ...card[field], [activeEditorLang]: value }
      };
      setCourseData({ ...courseData, cards: newCards });
  };

  const updateQuizOption = (optIndex: number, value: string) => {
      if (!courseData) return;
      const newCards = [...courseData.cards];
      const card = newCards[activeCardIndex];
      if (card.interaction && card.interaction.options) {
          const newOptions = [...card.interaction.options];
          newOptions[optIndex] = { ...newOptions[optIndex], [activeEditorLang]: value };
          card.interaction.options = newOptions;
          setCourseData({ ...courseData, cards: newCards });
      }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !courseData) return;
      setIsUploadingMedia(true);
      try {
          const url = await uploadFile(file, 'course_media');
          const newCards = [...courseData.cards];
          newCards[activeCardIndex] = { ...newCards[activeCardIndex], mediaUrl: url };
          setCourseData({ ...courseData, cards: newCards });
      } catch (err) { alert("Hata"); } finally { setIsUploadingMedia(false); }
  };

  const handlePublish = async () => {
      if (!courseData || !currentUser || !selectedChannelId) return;
      setIsPublishing(true);
      
      const payload: any = {
          ...courseData,
          thumbnailUrl: courseData.cards[0].mediaUrl,
          duration: courseData.cards.length, // rough calc
          xpReward: 100,
          visibility: 'PRIVATE',
          channelId: selectedChannelId,
          authorType: 'ORGANIZATION',
          organizationId: currentOrganization?.id,
          categoryId: 'cat_genel',
          price: 0,
          priceType: 'FREE',
          steps: courseData.cards,
          // New Config Fields
          config: {
              pedagogyMode: pedagogy,
              targetLanguages: targetLangs,
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

  // --- RENDER HELPERS ---
  const currentCard = courseData?.cards[activeCardIndex];

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        
        {/* HEADER */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-20">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white">
                    <Wand2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-gray-800">AI Studio</span>
            </div>
            
            {/* PROGRESS STEPS */}
            <div className="flex items-center gap-2">
                {['SETUP', 'DESIGN', 'DIRECTOR', 'PUBLISH'].map((s, idx) => (
                    <div key={s} className={`flex items-center gap-2 ${step === s ? 'opacity-100' : 'opacity-40'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {idx + 1}
                        </div>
                        <span className="text-xs font-bold hidden md:block">{s}</span>
                        {idx < 3 && <div className="w-4 h-px bg-gray-300 mx-2" />}
                    </div>
                ))}
            </div>

            <div className="w-20" /> {/* Spacer */}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* STEP 1: SETUP */}
            {step === 'SETUP' && (
                <div className="h-full flex flex-col items-center justify-center p-6 animate-in slide-in-from-right-10 fade-in duration-300">
                    <div className="max-w-2xl w-full space-y-8">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">Eğitim Kaynağı</h1>
                            <p className="text-gray-500">Neyi öğretmek istiyorsun? Metni buraya yapıştır veya dosya yükle.</p>
                        </div>

                        <textarea 
                            className="w-full h-40 p-4 rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-0 resize-none text-lg font-medium"
                            placeholder="Örn: Otelimizin yangın güvenlik prosedürü şöyledir..."
                            value={sourceText}
                            onChange={e => setSourceText(e.target.value)}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block"><Target className="w-4 h-4 inline mr-1"/> Yayınlanacak Kanal</label>
                                <select 
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700"
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
                                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block"><Globe className="w-4 h-4 inline mr-1"/> Hedef Diller</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_LANGS.map(lang => (
                                        <button 
                                            key={lang.code}
                                            onClick={() => toggleLang(lang.code)}
                                            className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${targetLangs.includes(lang.code) ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-lg">{lang.flag}</span>
                                            <span className="text-sm font-bold">{lang.code.toUpperCase()}</span>
                                            {targetLangs.includes(lang.code) && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={() => setStep('DESIGN')} 
                                disabled={!sourceText || !selectedChannelId || targetLangs.length === 0}
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
                                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block"><Layers className="w-4 h-4 inline mr-1"/> Pedagoji Modu</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { id: 'STANDARD', label: 'Standart', desc: 'Klasik bilgi ve test karışımı.' },
                                        { id: 'ACTIVE_RECALL', label: 'Aktif Hatırlama (Pekiştirme)', desc: 'Sık sık soru sorarak bilgiyi taze tutar.' },
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
                                <select className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                                    <option value="BEGINNER">Başlangıç</option>
                                    <option value="INTERMEDIATE">Orta</option>
                                    <option value="ADVANCED">İleri</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Ton</label>
                                <select className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold" value={tone} onChange={e => setTone(e.target.value as any)}>
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
                    <p className="text-gray-500 animate-pulse">Pedagoji uygulanıyor • İçerik çevriliyor • Görseller hazırlanıyor</p>
                </div>
            )}

            {/* STEP 3: DIRECTOR (EDITOR) */}
            {step === 'DIRECTOR' && courseData && (
                <div className="h-full flex flex-col md:flex-row">
                    
                    {/* LEFT: TIMELINE */}
                    <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-500 uppercase tracking-wider">
                            Akış ({courseData.cards.length})
                        </div>
                        <div className="flex-1 p-2 space-y-2">
                            {courseData.cards.map((card, idx) => (
                                <div 
                                    key={card.id}
                                    onClick={() => setActiveCardIndex(idx)}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex gap-3 items-center ${activeCardIndex === idx ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'}`}
                                >
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-gray-800 truncate">{card.title[activeEditorLang] || '(Başlıksız)'}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">{card.type}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CENTER: PREVIEW & EDITOR */}
                    <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden relative">
                        
                        {/* EDITOR TOOLBAR (LANG TABS) */}
                        <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between shrink-0">
                            <div className="flex gap-1">
                                {targetLangs.map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setActiveEditorLang(lang)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeEditorLang === lang ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {AVAILABLE_LANGS.find(l => l.code === lang)?.flag} {lang.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                {pedagogy} MODU
                            </div>
                        </div>

                        {/* WORKSPACE */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                
                                {/* PREVIEW PHONE */}
                                <div className="flex justify-center sticky top-0">
                                    <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl relative overflow-hidden shrink-0">
                                        <img src={currentCard?.mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
                                        
                                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white pb-12">
                                            <div className="inline-block bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold mb-2 uppercase">{currentCard?.type}</div>
                                            <h2 className="text-2xl font-bold mb-2 leading-tight drop-shadow-md">
                                                {currentCard?.title[activeEditorLang]}
                                            </h2>
                                            <p className="text-sm opacity-90 leading-relaxed drop-shadow-md">
                                                {currentCard?.content[activeEditorLang]}
                                            </p>
                                            
                                            {/* Quiz Preview */}
                                            {currentCard?.type === 'QUIZ' && currentCard.interaction && (
                                                <div className="mt-4 space-y-2">
                                                    <p className="text-xs font-bold text-yellow-400 uppercase">{currentCard.interaction.question[activeEditorLang]}</p>
                                                    {currentCard.interaction.options.map((opt, i) => (
                                                        <div key={i} className="bg-white/10 p-2 rounded-lg text-xs font-bold border border-white/10">
                                                            {opt[activeEditorLang]}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* EDIT FORM */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <MonitorPlay className="w-5 h-5 text-blue-500" /> 
                                        Kart Düzenle ({activeEditorLang.toUpperCase()})
                                    </h3>

                                    {/* MEDIA */}
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Görsel</label>
                                        <div 
                                            className="aspect-video bg-gray-100 rounded-xl overflow-hidden relative group cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors"
                                            onClick={() => cardMediaRef.current?.click()}
                                        >
                                            <img src={currentCard?.mediaUrl} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                                <Upload className="w-8 h-8 mb-2" />
                                                <span className="text-xs font-bold">Görseli Değiştir</span>
                                            </div>
                                            <input type="file" ref={cardMediaRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
                                        </div>
                                        <div className="mt-2 text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100">
                                            <b>AI Prompt:</b> {currentCard?.mediaPrompt}
                                        </div>
                                    </div>

                                    {/* TEXT FIELDS */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Başlık</label>
                                            <input 
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:border-blue-500 outline-none"
                                                value={currentCard?.title[activeEditorLang] || ''}
                                                onChange={e => updateCardField('title', e.target.value)}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">İçerik Metni</label>
                                            <textarea 
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-blue-500 outline-none h-32 resize-none"
                                                value={currentCard?.content[activeEditorLang] || ''}
                                                onChange={e => updateCardField('content', e.target.value)}
                                            />
                                        </div>

                                        {/* QUIZ EDITOR */}
                                        {currentCard?.type === 'QUIZ' && currentCard.interaction && (
                                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mt-4">
                                                <label className="text-xs font-bold text-yellow-700 uppercase mb-2 block">Soru</label>
                                                <input 
                                                    className="w-full p-2 bg-white border border-yellow-300 rounded-lg text-sm mb-3"
                                                    value={currentCard.interaction.question[activeEditorLang] || ''}
                                                    onChange={e => {
                                                        // Complex nested update needed for quiz question in localized object
                                                        // For simplicity in this view, assuming direct update via similar pattern
                                                    }}
                                                />
                                                <label className="text-xs font-bold text-yellow-700 uppercase mb-2 block">Seçenekler</label>
                                                <div className="space-y-2">
                                                    {currentCard.interaction.options.map((opt, i) => (
                                                        <div key={i} className="flex gap-2 items-center">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === currentCard.interaction?.correctOptionIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                                {['A','B','C','D'][i]}
                                                            </div>
                                                            <input 
                                                                className="flex-1 p-2 bg-white border border-yellow-300 rounded-lg text-sm"
                                                                value={opt[activeEditorLang]}
                                                                onChange={e => updateQuizOption(i, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* BOTTOM ACTION BAR */}
                        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-4 shrink-0">
                            <button onClick={() => handlePublish()} disabled={isPublishing} className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-primary-light transition-colors">
                                {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Yayınla
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
