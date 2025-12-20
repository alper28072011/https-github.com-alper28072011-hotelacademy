
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    Wand2, FileText, ImageIcon, ChevronRight, Upload, 
    CheckCircle2, Save, Loader2, Hash, Target
} from 'lucide-react';
import { generateMagicCourse, translateContent } from '../../services/geminiService';
import { publishContent } from '../../services/courseService';
import { updateCourse } from '../../services/db';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { StoryCard, DifficultyLevel, CourseTone, StoryCardType, Course, LocalizedString } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';

type StudioStep = 'SOURCE' | 'TUNING' | 'GENERATING' | 'DIRECTOR' | 'TARGETING' | 'PUBLISH';

const SUPPORTED_LANGS = [
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const cardMediaRef = useRef<HTMLInputElement>(null);

  // Studio Flow State
  const [step, setStep] = useState<StudioStep>('SOURCE');
  const [error, setError] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [existingCourseId, setExistingCourseId] = useState<string | null>(null);
  
  // Editor Language State
  const [activeLang, setActiveLang] = useState<string>('tr');
  const [isTranslating, setIsTranslating] = useState(false);
  
  // 1. Source State
  const [sourceData, setSourceData] = useState('');
  
  // 2. Tuning State
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('BEGINNER');
  const [tone, setTone] = useState<CourseTone>('CASUAL');
  const [length, setLength] = useState<'SHORT' | 'MEDIUM'>('SHORT');

  // 3. Director State (Localized)
  const [courseData, setCourseData] = useState<{
      title: LocalizedString;
      description: LocalizedString;
      cards: StoryCard[];
      tags: string[];
  } | null>(null);
  
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // 4. Channel Selection (Replaces Targeting)
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [isPublishing, setIsPublishing] = useState(false);

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
          setSelectedChannelId(incoming.channelId || '');
          setStep('DIRECTOR');
      }
  }, [location.state]);

  // AI Translation Handler
  const handleMagicTranslate = async () => {
      if (!courseData) return;
      setIsTranslating(true);
      
      const targetLangs = SUPPORTED_LANGS.filter(l => l.code !== activeLang).map(l => l.code);
      
      const contentToTranslate = {
          courseTitle: courseData.title[activeLang],
          courseDesc: courseData.description[activeLang],
          cards: courseData.cards.map(c => ({
              id: c.id,
              title: c.title[activeLang],
              content: c.content[activeLang],
              question: c.interaction?.question[activeLang],
              explanation: c.interaction?.explanation?.[activeLang],
              options: c.interaction?.options.map(o => o[activeLang])
          }))
      };

      const result = await translateContent(contentToTranslate, activeLang, targetLangs);

      if (result) {
          const newTitle = { ...courseData.title, ...result.courseTitle };
          const newDesc = { ...courseData.description, ...result.courseDesc };
          
          const newCards = courseData.cards.map(c => {
              const translatedCard = result.cards.find((tc: any) => tc.id === c.id);
              if (!translatedCard) return c;

              const mergedTitle = { ...c.title, ...translatedCard.title };
              const mergedContent = { ...c.content, ...translatedCard.content };
              
              let mergedInteraction = undefined;
              if (c.interaction) {
                  mergedInteraction = {
                      ...c.interaction,
                      question: { ...c.interaction.question, ...translatedCard.question },
                      explanation: { ...c.interaction.explanation, ...translatedCard.explanation },
                      options: c.interaction.options.map((opt, idx) => ({
                          ...opt,
                          ...translatedCard.options?.[idx] 
                      }))
                  };
              }

              return { ...c, title: mergedTitle, content: mergedContent, interaction: mergedInteraction };
          });

          setCourseData({ ...courseData, title: newTitle, description: newDesc, cards: newCards });
          alert("Çeviri tamamlandı! Diğer diller dolduruldu.");
      } else {
          alert("Çeviri servisine ulaşılamadı.");
      }
      setIsTranslating(false);
  };

  const handleGenerate = async () => {
      setStep('GENERATING');
      setError(null);
      
      try {
          const result = await generateMagicCourse(sourceData, {
              level: difficulty, tone: tone, length: length,
              language: SUPPORTED_LANGS.find(l => l.code === activeLang)?.label || 'Turkish'
          });

          if (result && result.cards) {
              const localizedTitle = { [activeLang]: result.title };
              const localizedDesc = { [activeLang]: result.description };
              
              const localizedCards = result.cards.map(c => ({
                  ...c,
                  title: { [activeLang]: c.title as unknown as string },
                  content: { [activeLang]: c.content as unknown as string },
                  interaction: c.interaction ? {
                      ...c.interaction,
                      question: { [activeLang]: c.interaction.question as unknown as string },
                      explanation: { [activeLang]: c.interaction.explanation as unknown as string },
                      options: (c.interaction.options as unknown as string[]).map(o => ({ [activeLang]: o }))
                  } : undefined
              }));

              setCourseData({ title: localizedTitle, description: localizedDesc, cards: localizedCards as StoryCard[], tags: result.tags });
              setStep('DIRECTOR');
          }
      } catch (err) {
          setError("Yapay zeka içeriği kurgulayamadı. Lütfen metni değiştirip deneyin.");
          setStep('TUNING');
      }
  };

  const updateActiveCardLocalized = (field: 'title' | 'content', value: string) => {
      if (!courseData) return;
      const newCards = [...courseData.cards];
      const currentCard = newCards[activeCardIndex];
      newCards[activeCardIndex] = {
          ...currentCard,
          [field]: { ...currentCard[field], [activeLang]: value }
      };
      setCourseData({ ...courseData, cards: newCards });
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
          duration: courseData.cards.length,
          xpReward: 100,
          visibility,
          channelId: selectedChannelId, // NEW
          authorType: 'ORGANIZATION',
          organizationId: currentOrganization?.id,
          categoryId: 'cat_genel',
          price: 0,
          priceType: 'FREE',
          steps: courseData.cards
      };

      try {
          if (isEditingExisting && existingCourseId) {
              await updateCourse(existingCourseId, payload);
          } else {
              await publishContent(payload, currentUser);
          }
          navigate('/admin/courses');
      } catch (e) {
          alert("Hata oluştu.");
      } finally {
          setIsPublishing(false);
      }
  };

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-100px)] bg-gray-50 overflow-y-auto md:overflow-hidden rounded-[2.5rem] border border-gray-200 shadow-xl relative">
        
        {/* TOP STATUS BAR */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex justify-between items-center shrink-0 sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <span className="text-xs font-black text-primary uppercase hidden md:inline">{isEditingExisting ? 'Düzenleme' : 'Stüdyo'}</span>
            </div>
            
            {/* LANGUAGE SELECTOR */}
            {step === 'DIRECTOR' && (
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    {SUPPORTED_LANGS.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => setActiveLang(lang.code)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${activeLang === lang.code ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <span>{lang.flag}</span>
                            <span className="hidden md:inline">{lang.label}</span>
                        </button>
                    ))}
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <button 
                        onClick={handleMagicTranslate}
                        disabled={isTranslating}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-md hover:opacity-90 disabled:opacity-50"
                    >
                        {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        <span className="hidden md:inline">Sihirli Çevir</span>
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
            {step === 'SOURCE' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <h1 className="text-3xl font-black text-primary mb-8">İçerik Kaynağı</h1>
                    <div className="w-full max-w-2xl">
                        <textarea 
                            value={sourceData} 
                            onChange={e => setSourceData(e.target.value)} 
                            placeholder="Eğitimin konusunu buraya yaz..." 
                            className="w-full h-40 p-4 rounded-3xl border-2 border-gray-200 outline-none focus:border-primary mb-4" 
                        />
                        <button onClick={() => setStep('TUNING')} className="w-full bg-primary text-white py-4 rounded-2xl font-bold">Devam Et</button>
                    </div>
                </div>
            )}

            {step === 'TUNING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <h2 className="text-2xl font-bold mb-4">Ayarlar</h2>
                    <button onClick={handleGenerate} className="bg-primary text-white px-8 py-3 rounded-xl font-bold">Oluştur</button>
                </div>
            )}

            {step === 'GENERATING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                    <Loader2 className="w-12 h-12 animate-spin text-accent mb-4" />
                    <h2 className="text-2xl font-bold text-primary">Yapay Zeka Çalışıyor...</h2>
                </div>
            )}

            {step === 'DIRECTOR' && courseData && (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* LEFT: CARDS */}
                    <div className="md:w-72 bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
                        <div className="p-4 border-b">
                            <h3 className="text-xs font-bold text-gray-400 uppercase">Akış ({courseData.cards.length})</h3>
                        </div>
                        <div className="flex-1 p-2 space-y-2">
                            {courseData.cards.map((card, idx) => (
                                <div 
                                    key={card.id} onClick={() => setActiveCardIndex(idx)}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${activeCardIndex === idx ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold">{idx + 1}</div>
                                        <span className="text-[10px] font-bold uppercase text-gray-400">{card.type}</span>
                                    </div>
                                    <div className="text-xs font-bold truncate">{card.title[activeLang] || '(Başlıksız)'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CENTER: PREVIEW */}
                    <div className="flex-1 bg-gray-50 flex items-center justify-center p-8 relative">
                        <div className="w-[320px] h-[580px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl relative overflow-hidden">
                            <img src={courseData.cards[activeCardIndex].mediaUrl} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                <h2 className="text-2xl font-bold mb-2">{courseData.cards[activeCardIndex].title[activeLang]}</h2>
                                <p className="text-sm opacity-90">{courseData.cards[activeCardIndex].content[activeLang]}</p>
                            </div>
                        </div>
                        
                        <div className="absolute bottom-8 right-8">
                             <button onClick={() => setStep('TARGETING')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-xl flex items-center gap-2">İleri <ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {/* RIGHT: EDITOR */}
                    <div className="w-80 bg-white border-l border-gray-100 flex flex-col p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-800">Kart Düzenle</h3>
                            <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded uppercase">{activeLang}</span>
                        </div>

                        <div className="space-y-4">
                            <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden relative group cursor-pointer" onClick={() => cardMediaRef.current?.click()}>
                                <img src={courseData.cards[activeCardIndex].mediaUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                                <input type="file" ref={cardMediaRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Başlık ({activeLang})</label>
                                <input 
                                    value={courseData.cards[activeCardIndex].title[activeLang] || ''}
                                    onChange={e => updateActiveCardLocalized('title', e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm mt-1 focus:border-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">İçerik ({activeLang})</label>
                                <textarea 
                                    rows={5}
                                    value={courseData.cards[activeCardIndex].content[activeLang] || ''}
                                    onChange={e => updateActiveCardLocalized('content', e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm mt-1 focus:border-primary outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHANNEL SELECTION */}
            {step === 'TARGETING' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> Hangi Kanalda Yayınlansın?</h2>
                    
                    <div className="w-full max-w-md space-y-3">
                        {currentOrganization?.channels?.map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => setSelectedChannelId(channel.id)}
                                className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${selectedChannelId === channel.id ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                                        <Hash className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-gray-900">{channel.name}</div>
                                        <div className="text-xs text-gray-500">{channel.description || 'Genel Kanal'}</div>
                                    </div>
                                </div>
                                {selectedChannelId === channel.id && <CheckCircle2 className="w-6 h-6 text-primary" />}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button onClick={() => setStep('DIRECTOR')} className="px-6 py-3 border rounded-xl font-bold">Geri</button>
                        <button onClick={() => setStep('PUBLISH')} disabled={!selectedChannelId} className="px-6 py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-50">Sonraki</button>
                    </div>
                </div>
            )}

            {step === 'PUBLISH' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                    <h2 className="text-3xl font-bold text-primary mb-2">Hazırız!</h2>
                    <p className="text-gray-500 mb-8">İçerik {activeLang === 'tr' ? 'Türkçe' : activeLang} dahil olmak üzere {Object.keys(courseData?.title || {}).length} dilde yayınlanacak.</p>
                    
                    <button 
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-2"
                    >
                        {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Yayınla
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
