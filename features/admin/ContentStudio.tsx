
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, FileText, Link, Type, Loader2, Play, 
    CheckCircle2, Save, Smartphone, ImageIcon,
    Settings, Globe, Lock, ChevronRight, Upload, Edit, 
    FileType, User, Building2, Search, Trash2, Plus, 
    MousePointer2, Sparkles, MessageSquare, Award
} from 'lucide-react';
import { generateMagicCourse } from '../../services/geminiService';
import { publishContent } from '../../services/courseService';
import { updateCourse } from '../../services/db';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { StoryCard, Course, DifficultyLevel, CourseTone, StoryCardType } from '../../types';
import { useLocation, useNavigate } from 'react-router-dom';

type StudioStep = 'SOURCE' | 'TUNING' | 'GENERATING' | 'DIRECTOR' | 'PUBLISH';

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Studio Flow State
  const [step, setStep] = useState<StudioStep>('SOURCE');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  
  // 1. Source State
  const [sourceType, setSourceType] = useState<'TEXT' | 'PDF' | 'URL'>('TEXT');
  const [sourceData, setSourceData] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // 2. Tuning State
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('BEGINNER');
  const [tone, setTone] = useState<CourseTone>('CASUAL');
  const [length, setLength] = useState<'SHORT' | 'MEDIUM'>('SHORT');

  // 3. Director State (The Editor)
  const [courseData, setCourseData] = useState<{
      title: string;
      description: string;
      cards: StoryCard[];
      tags: string[];
  } | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);

  // 4. Final Settings
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [ownerType, setOwnerType] = useState<'USER' | 'ORGANIZATION'>('ORGANIZATION');
  const [isPublishing, setIsPublishing] = useState(false);

  // --- SOURCE ACTIONS ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsExtracting(true);
      // Mocking PDF extraction (In real app, use pdfjs-dist)
      setTimeout(() => {
          setSourceData("Bu PDF'den çıkarılan metindir. Otel temizlik prosedürleri: 1. Havalandır, 2. Toz al, 3. Dezenfekte et...");
          setIsExtracting(false);
          setStep('TUNING');
      }, 1500);
  };

  // --- GENERATION ACTION ---
  const handleGenerate = async () => {
      setStep('GENERATING');
      const result = await generateMagicCourse(sourceData, {
          level: difficulty,
          tone: tone,
          length: length,
          language: 'Turkish'
      });
      if (result) {
          setCourseData(result);
          setStep('DIRECTOR');
      } else {
          alert("Üretim sırasında hata oluştu.");
          setStep('SOURCE');
      }
  };

  // --- EDITOR ACTIONS ---
  const updateActiveCard = (updates: Partial<StoryCard>) => {
      if (!courseData) return;
      const newCards = [...courseData.cards];
      newCards[activeCardIndex] = { ...newCards[activeCardIndex], ...updates };
      setCourseData({ ...courseData, cards: newCards });
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
          authorType: ownerType,
          organizationId: currentOrganization?.id,
          categoryId: 'cat_genel',
          price: 0,
          priceType: 'FREE'
      };

      const success = await publishContent(payload, currentUser);
      if (success) {
          alert("Eğitim başarıyla yayınlandı!");
          navigate('/admin/courses');
      }
      setIsPublishing(false);
  };

  // --- RENDERERS ---
  const renderCardIcon = (type: StoryCardType) => {
      switch(type) {
          case 'COVER': return <ImageIcon className="w-4 h-4" />;
          case 'QUIZ': return <MessageSquare className="w-4 h-4 text-orange-500" />;
          case 'REWARD': return <Award className="w-4 h-4 text-yellow-500" />;
          default: return <FileType className="w-4 h-4 text-blue-500" />;
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-50 overflow-hidden rounded-[2.5rem] border border-gray-200 shadow-xl">
        
        {/* TOP STATUS BAR */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step === 'SOURCE' ? 'bg-primary text-white' : 'bg-green-100 text-green-600'}`}>
                    {step === 'SOURCE' ? '1' : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div className="w-12 h-0.5 bg-gray-100" />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step === 'TUNING' ? 'bg-primary text-white' : step === 'SOURCE' ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-600'}`}>
                    2
                </div>
                <div className="w-12 h-0.5 bg-gray-100" />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step === 'DIRECTOR' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                    3
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stüdyo Durumu:</span>
                <span className="text-xs font-black text-primary uppercase">{step}</span>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            
            {/* --- STEP 1: SOURCE --- */}
            {step === 'SOURCE' && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 max-w-4xl mx-auto text-center">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8">
                        <div className="w-20 h-20 bg-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10 text-accent" />
                        </div>
                        <h1 className="text-4xl font-black text-primary mb-2">Nasıl Başlamak İstersin?</h1>
                        <p className="text-gray-500">Sıkıcı dokümanları personelin bayılacağı "Story"lere dönüştürelim.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        <button onClick={() => setSourceType('TEXT')} className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${sourceType === 'TEXT' ? 'border-primary bg-primary/5 shadow-xl' : 'border-gray-100 bg-white hover:border-accent'}`}>
                            <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${sourceType === 'TEXT' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}>
                                <Type className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-gray-800">AI ile Konuş</span>
                        </button>

                        <button onClick={() => fileInputRef.current?.click()} className="p-8 rounded-[2rem] border-2 border-gray-100 bg-white hover:border-accent transition-all flex flex-col items-center gap-4 group">
                            <div className="p-4 rounded-2xl bg-gray-50 text-gray-400 group-hover:scale-110 group-hover:bg-red-50 group-hover:text-red-500 transition-all">
                                <FileType className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-gray-800">PDF'den Üret</span>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handlePdfUpload} />
                        </button>

                        <button onClick={() => setSourceType('URL')} className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${sourceType === 'URL' ? 'border-primary bg-primary/5 shadow-xl' : 'border-gray-100 bg-white hover:border-accent'}`}>
                            <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${sourceType === 'URL' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}>
                                <Link className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-gray-800">Link Yapıştır</span>
                        </button>
                    </div>

                    <div className="mt-12 w-full max-w-2xl">
                        {sourceType === 'TEXT' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <textarea 
                                    value={sourceData}
                                    onChange={e => setSourceData(e.target.value)}
                                    placeholder="Eğitimin konusunu veya ham içeriği buraya yaz..."
                                    className="w-full h-40 p-6 bg-white border-2 border-gray-100 rounded-3xl outline-none focus:border-accent transition-colors font-medium"
                                />
                                <button 
                                    onClick={() => setStep('TUNING')}
                                    disabled={!sourceData.trim()}
                                    className="mt-6 bg-primary text-white px-12 py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all disabled:opacity-50"
                                >
                                    İleri Git
                                </button>
                            </motion.div>
                        )}
                        {sourceType === 'URL' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                                <input placeholder="https://..." className="flex-1 p-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-accent" />
                                <button onClick={() => setStep('TUNING')} className="bg-primary text-white px-8 rounded-2xl font-bold">Çek</button>
                            </motion.div>
                        )}
                    </div>
                </div>
            )}

            {/* --- STEP 2: TUNING --- */}
            {step === 'TUNING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 max-w-2xl mx-auto">
                    <h1 className="text-3xl font-black text-primary mb-8">İnce Ayarlar</h1>
                    
                    <div className="w-full space-y-8">
                        {/* Difficulty */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Eğitim Zorluğu</label>
                            <div className="flex gap-2">
                                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as DifficultyLevel[]).map(l => (
                                    <button key={l} onClick={() => setDifficulty(l)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${difficulty === l ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}>
                                        {l === 'BEGINNER' ? 'Başlangıç' : l === 'INTERMEDIATE' ? 'Orta' : 'İleri'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tone */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">İletişim Tonu</label>
                            <div className="flex gap-2">
                                {(['FORMAL', 'CASUAL', 'FUN'] as CourseTone[]).map(t => (
                                    <button key={t} onClick={() => setTone(t)} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${tone === t ? 'bg-accent text-primary shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}>
                                        {t === 'FORMAL' ? '🤵 Kurumsal' : t === 'CASUAL' ? '👋 Samimi' : '🥳 Eğlenceli'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Length */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kurs Süresi</label>
                            <div className="flex gap-2">
                                <button onClick={() => setLength('SHORT')} className={`flex-1 py-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 ${length === 'SHORT' ? 'bg-primary text-white' : 'bg-white border border-gray-100'}`}>
                                    ☕ Kahve Molası (5 Kart)
                                </button>
                                <button onClick={() => setLength('MEDIUM')} className={`flex-1 py-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 ${length === 'MEDIUM' ? 'bg-primary text-white' : 'bg-white border border-gray-100'}`}>
                                    🍽️ Öğle Arası (10 Kart)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-12 w-full">
                        <button onClick={() => setStep('SOURCE')} className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600">Geri Dön</button>
                        <button onClick={handleGenerate} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-3">
                            <Wand2 className="w-5 h-5 text-accent" /> Sihirli Oluştur
                        </button>
                    </div>
                </div>
            )}

            {/* --- STEP 3: GENERATING --- */}
            {step === 'GENERATING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-24 h-24 rounded-full border-t-4 border-r-4 border-accent border-l-4 border-l-transparent border-b-4 border-b-transparent mb-8" />
                    <h2 className="text-2xl font-black text-primary">Eğitim Kurgulanıyor...</h2>
                    <p className="text-gray-400 mt-2 animate-pulse">Gemini sizin için en iyi senaryoyu yazıyor.</p>
                </div>
            )}

            {/* --- STEP 4: DIRECTOR (The Editor) --- */}
            {step === 'DIRECTOR' && courseData && (
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left: Card Flow */}
                    <div className="w-72 border-r border-gray-100 flex flex-col bg-white shrink-0">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                            <span className="text-xs font-black text-gray-400 uppercase">Akış (Flow)</span>
                            <button className="p-1 text-gray-400 hover:text-primary"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                            {courseData.cards.map((card, idx) => (
                                <div 
                                    key={card.id} 
                                    onClick={() => setActiveCardIndex(idx)}
                                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${activeCardIndex === idx ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-50 hover:border-gray-200'}`}
                                >
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">{idx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase truncate">{card.type}</div>
                                        <div className="text-xs font-bold text-gray-800 truncate">{card.title}</div>
                                    </div>
                                    {renderCardIcon(card.type)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle: Canvas / Preview */}
                    <div className="flex-1 bg-gray-50 p-8 flex items-center justify-center relative overflow-hidden">
                        
                        {/* PHONE MOCKUP */}
                        <div className="w-[340px] h-[640px] bg-black rounded-[3rem] border-[10px] border-gray-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden flex flex-col">
                            {/* Inner Screen */}
                            <div className="flex-1 relative flex flex-col">
                                <img src={courseData.cards[activeCardIndex].mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                
                                <div className="relative z-10 p-8 mt-auto text-white">
                                    <span className="text-[10px] font-black bg-accent text-primary px-2 py-0.5 rounded uppercase mb-2 inline-block">{courseData.cards[activeCardIndex].type}</span>
                                    <h3 className="text-2xl font-black mb-3">{courseData.cards[activeCardIndex].title}</h3>
                                    <p className="text-sm opacity-80 leading-relaxed">{courseData.cards[activeCardIndex].content}</p>
                                    
                                    {courseData.cards[activeCardIndex].type === 'QUIZ' && (
                                        <div className="mt-6 space-y-2">
                                            {courseData.cards[activeCardIndex].interaction?.options.map((opt, i) => (
                                                <div key={i} className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-xs font-bold">{opt}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Floating Action (Save/Next) */}
                        <div className="absolute bottom-8 right-8 flex gap-4">
                             <button onClick={() => setStep('PUBLISH')} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-xl flex items-center gap-2">
                                Yayınla <ChevronRight className="w-5 h-5" />
                             </button>
                        </div>
                    </div>

                    {/* Right: Card Property Editor */}
                    <div className="w-80 bg-white border-l border-gray-100 flex flex-col p-6 overflow-y-auto no-scrollbar">
                        <h3 className="text-sm font-black text-gray-800 uppercase mb-6 flex items-center gap-2">
                            <Edit className="w-4 h-4" /> Kart Özellikleri
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Görsel Seçimi</label>
                                <div className="relative aspect-video rounded-2xl bg-gray-100 overflow-hidden border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 group cursor-pointer">
                                    <img src={courseData.cards[activeCardIndex].mediaUrl} className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Değiştir</div>
                                </div>
                                <div className="mt-2 p-3 bg-blue-50 rounded-xl flex items-start gap-2 border border-blue-100">
                                    <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                                    <p className="text-[10px] text-blue-800 italic">AI Önerisi: "{courseData.cards[activeCardIndex].mediaPrompt}"</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Başlık</label>
                                <input 
                                    value={courseData.cards[activeCardIndex].title}
                                    onChange={e => updateActiveCard({ title: e.target.value })}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold focus:border-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">İçerik Metni</label>
                                <textarea 
                                    value={courseData.cards[activeCardIndex].content}
                                    onChange={e => updateActiveCard({ content: e.target.value })}
                                    rows={4}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium focus:border-primary outline-none resize-none"
                                />
                            </div>

                            {courseData.cards[activeCardIndex].type === 'QUIZ' && (
                                <div className="pt-4 border-t border-gray-100 space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Soru Seçenekleri</label>
                                    {courseData.cards[activeCardIndex].interaction?.options.map((opt, i) => (
                                        <input key={i} value={opt} className="w-full p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs font-bold" />
                                    ))}
                                </div>
                            )}

                            <button className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                <Trash2 className="w-4 h-4" /> Kartı Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- STEP 5: PUBLISH --- */}
            {step === 'PUBLISH' && courseData && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 max-w-lg mx-auto">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="w-8 h-8" /></div>
                    <h1 className="text-3xl font-black text-primary mb-2">Harika İş!</h1>
                    <p className="text-gray-500 text-center mb-10">Eğitim tasarımı tamamlandı. Şimdi nasıl yayınlamak istersin?</p>
                    
                    <div className="w-full space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setVisibility('PRIVATE')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${visibility === 'PRIVATE' ? 'border-primary bg-primary/5' : 'border-gray-100'}`}>
                                <Lock className="w-5 h-5 text-gray-400" />
                                <span className="font-bold text-xs text-gray-800">Kurum İçi</span>
                            </button>
                            <button onClick={() => setVisibility('PUBLIC')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${visibility === 'PUBLIC' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}>
                                <Globe className="w-5 h-5 text-blue-500" />
                                <span className="font-bold text-xs text-gray-800">Herkese Açık</span>
                            </button>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Paylaşan Kimlik</label>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button onClick={() => setOwnerType('ORGANIZATION')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${ownerType === 'ORGANIZATION' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>🏢 KURUMSAL</button>
                                <button onClick={() => setOwnerType('USER')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${ownerType === 'USER' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>👤 ŞAHSİ PROFİL</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-12 w-full">
                        <button onClick={() => setStep('DIRECTOR')} className="flex-1 py-4 text-gray-400 font-bold">Geri Dön</button>
                        <button 
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-2"
                        >
                            {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Yayınla & Bitir</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
