
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, FileText, Link, Type, Loader2, Play, 
    CheckCircle2, Save, RotateCcw, Smartphone, Image as ImageIcon
} from 'lucide-react';
import { generateMicroCourse } from '../../services/geminiService';
import { publishContent } from '../../services/courseService';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { StoryCard, Course } from '../../types';

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();

  // STAGE: 'INPUT' -> 'GENERATING' -> 'PREVIEW' -> 'PUBLISHED'
  const [stage, setStage] = useState<'INPUT' | 'GENERATING' | 'PREVIEW' | 'PUBLISHED'>('INPUT');
  
  // INPUT STATE
  const [inputType, setInputType] = useState<'TEXT' | 'URL'>('TEXT');
  const [sourceText, setSourceText] = useState('');
  const [topic, setTopic] = useState('');
  
  // GENERATED DATA
  const [generatedCourse, setGeneratedCourse] = useState<{
      title: string;
      description: string;
      cards: StoryCard[];
      tags: string[];
  } | null>(null);

  // SETTINGS
  const [targetAudience, setTargetAudience] = useState('New Staff');
  const [tone, setTone] = useState<'PROFESSIONAL' | 'FUN'>('FUN');

  // PREVIEW STATE
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handleMagicGenerate = async () => {
      if (!sourceText && !topic) return;
      setStage('GENERATING');

      // Combine Topic + Source for context
      const fullContext = `TOPIC: ${topic}\n\nCONTENT:\n${sourceText}`;

      const result = await generateMicroCourse(fullContext, {
          targetAudience,
          tone,
          language: 'Turkish' // Hardcoded for demo, can be dynamic
      });

      if (result) {
          setGeneratedCourse(result);
          setStage('PREVIEW');
      } else {
          alert("AI Üretimi Başarısız Oldu. Lütfen tekrar deneyin.");
          setStage('INPUT');
      }
  };

  const handlePublish = async () => {
      if (!generatedCourse || !currentUser) return;
      
      const newCourse: any = {
          organizationId: currentOrganization?.id,
          authorId: currentUser.id,
          ownerType: currentOrganization ? 'ORGANIZATION' : 'USER',
          visibility: 'PUBLIC', // Default
          title: generatedCourse.title,
          description: generatedCourse.description,
          thumbnailUrl: generatedCourse.cards[0].mediaUrl || 'https://via.placeholder.com/400',
          duration: Math.ceil(generatedCourse.cards.reduce((acc, c) => acc + c.duration, 0) / 60),
          xpReward: 500,
          steps: generatedCourse.cards, // Map StoryCards to Steps
          tags: generatedCourse.tags,
          priority: 'NORMAL',
          price: 0,
          priceType: 'FREE'
      };

      const success = await publishContent(newCourse, currentUser);
      if (success) {
          setStage('PUBLISHED');
      }
  };

  // --- RENDER STAGES ---

  if (stage === 'PUBLISHED') {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] animate-in zoom-in">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                  <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Harika İş!</h2>
              <p className="text-gray-500 mt-2">Mikro-Eğitim başarıyla yayınlandı.</p>
              <button onClick={() => window.location.reload()} className="mt-8 bg-gray-100 px-6 py-3 rounded-xl font-bold text-gray-700">Yeni Oluştur</button>
          </div>
      );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] gap-8">
        
        {/* LEFT PANEL: CONTROLS */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
            
            <div className="mb-2">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-accent" />
                    Sihirli Stüdyo
                </h1>
                <p className="text-gray-500 text-sm">Ham içeriği saniyeler içinde etkileşimli bir Story serisine dönüştürün.</p>
            </div>

            {stage === 'INPUT' && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-left-4">
                    {/* Source Selector */}
                    <div className="bg-gray-50 p-1 rounded-xl flex">
                        <button onClick={() => setInputType('TEXT')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${inputType === 'TEXT' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>
                            <Type className="w-4 h-4" /> Metin / Konu
                        </button>
                        <button onClick={() => setInputType('URL')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${inputType === 'URL' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>
                            <Link className="w-4 h-4" /> Link / PDF
                        </button>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1">Eğitim Konusu</label>
                            <input 
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="Örn: Müşteri Karşılama Teknikleri"
                                className="w-full p-4 bg-white border-2 border-gray-100 rounded-xl font-bold text-gray-800 focus:border-accent outline-none"
                            />
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1">Kaynak İçerik</label>
                            <textarea 
                                value={sourceText}
                                onChange={e => setSourceText(e.target.value)}
                                placeholder={inputType === 'TEXT' ? "Eğitim metnini buraya yapıştırın veya anahtar noktaları yazın..." : "Web sitesi linkini veya PDF metnini buraya yapıştırın..."}
                                className="w-full p-4 bg-white border-2 border-gray-100 rounded-xl font-medium text-gray-600 focus:border-accent outline-none h-40 resize-none"
                            />
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1">Hedef Kitle</label>
                            <select value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700">
                                <option>Yeni Başlayanlar</option>
                                <option>Uzman Personel</option>
                                <option>Yöneticiler</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1">Ton</label>
                            <select value={tone} onChange={e => setTone(e.target.value as any)} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700">
                                <option value="FUN">Eğlenceli & Samimi</option>
                                <option value="PROFESSIONAL">Kurumsal & Ciddi</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleMagicGenerate}
                        disabled={!topic}
                        className="w-full bg-gradient-to-r from-accent to-accent-dark text-primary py-4 rounded-xl font-bold text-lg shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        <Wand2 className="w-6 h-6" /> Sihirli Oluştur
                    </button>
                </div>
            )}

            {stage === 'GENERATING' && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 border-4 border-gray-100 rounded-full animate-spin border-t-accent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Wand2 className="w-8 h-8 text-accent animate-pulse" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Yapay Zeka Çalışıyor...</h3>
                    <p className="text-gray-500 max-w-xs">İçeriğiniz analiz ediliyor, sorular hazırlanıyor ve story kartları oluşturuluyor.</p>
                </div>
            )}

            {stage === 'PREVIEW' && generatedCourse && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-8">
                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                        <div>
                            <h3 className="font-bold text-green-800">Hazır!</h3>
                            <p className="text-green-700 text-sm">AI, {generatedCourse.cards.length} kartlık bir seri oluşturdu. Sağ taraftan önizleyebilirsiniz.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Kart Listesi</label>
                        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                            {generatedCourse.cards.map((card, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setActiveCardIndex(idx)}
                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${activeCardIndex === idx ? 'bg-primary text-white border-primary shadow-md' : 'bg-white border-gray-100 hover:border-gray-300'}`}
                                >
                                    <div className="font-mono text-xs opacity-50">{idx + 1}</div>
                                    <div className="flex-1 font-bold text-sm truncate">{card.title}</div>
                                    <div className="text-[10px] uppercase font-bold opacity-70 border border-current px-1 rounded">{card.type}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-auto">
                        <button onClick={() => setStage('INPUT')} className="flex-1 py-3 border-2 border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Vazgeç
                        </button>
                        <button onClick={handlePublish} className="flex-[2] bg-primary text-white py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-primary-light">
                            <Save className="w-4 h-4" /> Yayınla
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT PANEL: PHONE SIMULATOR */}
        <div className="flex-1 bg-gray-100 rounded-[2.5rem] p-8 flex items-center justify-center relative overflow-hidden border border-gray-200 shadow-inner">
             {stage === 'PREVIEW' && generatedCourse ? (
                 <div className="w-[300px] h-[600px] bg-black rounded-[2rem] border-8 border-gray-800 shadow-2xl overflow-hidden relative">
                     {/* Header Bar */}
                     <div className="absolute top-0 left-0 right-0 h-1 z-20 flex gap-1 px-2 pt-2">
                         {generatedCourse.cards.map((_, i) => (
                             <div key={i} className={`h-1 flex-1 rounded-full ${i === activeCardIndex ? 'bg-white' : i < activeCardIndex ? 'bg-white' : 'bg-white/30'}`} />
                         ))}
                     </div>

                     {/* Content */}
                     <div className="relative w-full h-full">
                         <img 
                            src={generatedCourse.cards[activeCardIndex].mediaUrl} 
                            className="w-full h-full object-cover opacity-60" 
                         />
                         <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
                         
                         <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 text-white">
                             <div className="inline-block px-2 py-1 rounded bg-accent text-primary text-[10px] font-bold mb-2 uppercase">{generatedCourse.cards[activeCardIndex].type}</div>
                             <h2 className="text-2xl font-bold mb-2 leading-tight">{generatedCourse.cards[activeCardIndex].title}</h2>
                             <p className="text-sm opacity-90 leading-relaxed">{generatedCourse.cards[activeCardIndex].content}</p>
                             
                             {generatedCourse.cards[activeCardIndex].interaction && (
                                 <div className="mt-4 flex flex-col gap-2">
                                     {generatedCourse.cards[activeCardIndex].interaction?.options.map((opt, i) => (
                                         <div key={i} className="bg-white/20 backdrop-blur-sm p-3 rounded-lg text-xs font-bold border border-white/10">
                                             {opt}
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             ) : (
                 <div className="flex flex-col items-center text-gray-400">
                     <Smartphone className="w-16 h-16 mb-4 opacity-20" />
                     <p>Önizleme burada görünecek</p>
                 </div>
             )}
        </div>
    </div>
  );
};
