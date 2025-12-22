
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, Loader2, ArrowLeft, Save, Plus, Trash2, 
    Image as ImageIcon, Upload, X, ChevronRight, Smartphone,
    Type, AlignLeft
} from 'lucide-react';
import { createAiModuleContent } from '../../services/careerService';
import { StoryCard, PedagogyMode } from '../../types';
import { getLocalizedContent } from '../../i18n/config';
import { updateCourse, getCourse } from '../../services/db';
import { uploadFile } from '../../services/storage';

export const ContentStudio: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { courseId: string; moduleIndex: number; moduleTitle: string; courseTitle: string; existingCards?: StoryCard[] };

  // Data State
  const [cards, setCards] = useState<StoryCard[]>(state?.existingCards || []);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pedagogy, setPedagogy] = useState<PedagogyMode>('STANDARD');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safety Redirect
  useEffect(() => {
      if (!state?.courseId) navigate('/admin/courses');
      if (cards.length > 0 && !activeCardId) setActiveCardId(cards[0].id);
  }, [state, cards]);

  // --- CRUD ACTIONS ---

  const handleAddCard = () => {
      const newCard: StoryCard = {
          id: `card_${Date.now()}`,
          type: 'INFO',
          title: { tr: 'Yeni Başlık', en: 'New Title' },
          content: { tr: 'İçerik buraya...', en: 'Content here...' },
          mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
          duration: 10
      };
      setCards([...cards, newCard]);
      setActiveCardId(newCard.id);
  };

  const handleDeleteCard = (id: string) => {
      const newCards = cards.filter(c => c.id !== id);
      setCards(newCards);
      if (activeCardId === id && newCards.length > 0) {
          setActiveCardId(newCards[Math.max(0, newCards.length - 1)].id);
      } else if (newCards.length === 0) {
          setActiveCardId(null);
      }
  };

  const updateActiveCard = (updates: Partial<StoryCard>) => {
      setCards(prev => prev.map(c => c.id === activeCardId ? { ...c, ...updates } : c));
  };

  const updateActiveCardText = (field: 'title' | 'content', value: string) => {
      const currentCard = cards.find(c => c.id === activeCardId);
      if (!currentCard) return;
      
      // Update Turkish by default for this editor, preserve other langs
      const newLocalized = { ...currentCard[field], tr: value };
      updateActiveCard({ [field]: newLocalized });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && activeCardId) {
          setIsUploading(true);
          try {
              const url = await uploadFile(e.target.files[0], 'story_assets');
              updateActiveCard({ mediaUrl: url });
          } catch (error) {
              alert("Resim yüklenemedi.");
          } finally {
              setIsUploading(false);
          }
      }
  };

  // --- AI GENERATION ---

  const handleGenerate = async () => {
      setLoading(true);
      try {
          const generatedCards = await createAiModuleContent(
              state.courseId,
              state.moduleIndex,
              state.moduleTitle,
              state.courseTitle,
              "Hotel Career Path", 
              pedagogy
          );
          setCards(generatedCards);
          if (generatedCards.length > 0) setActiveCardId(generatedCards[0].id);
      } catch (e) {
          alert("İçerik üretilemedi.");
      } finally {
          setLoading(false);
      }
  };

  const handleSave = async () => {
      setLoading(true);
      try {
          const course = await getCourse(state.courseId);
          if (course && course.modules) {
              const updatedModules = [...course.modules];
              updatedModules[state.moduleIndex] = {
                  ...updatedModules[state.moduleIndex],
                  cards: cards,
                  status: 'PUBLISHED'
              };
              await updateCourse(state.courseId, { modules: updatedModules });
              alert("Modül başarıyla kaydedildi!");
              navigate('/admin/courses');
          }
      } catch (e) {
          console.error(e);
          alert("Kaydedilemedi.");
      } finally {
          setLoading(false);
      }
  };

  const activeCard = cards.find(c => c.id === activeCardId);

  return (
    <div className="flex flex-col h-screen bg-[#eff0f5] overflow-hidden">
        
        {/* TOP BAR */}
        <div className="bg-[#3b5998] text-white h-[50px] flex justify-between items-center px-4 shadow-md shrink-0 z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/admin/courses')} className="hover:bg-white/10 p-1.5 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                <div className="border-l border-white/20 pl-3">
                    <h1 className="font-bold text-sm leading-tight">{state?.moduleTitle}</h1>
                    <p className="text-[10px] opacity-70 leading-tight">{state?.courseTitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded">{cards.length} Slayt</span>
                <button 
                    onClick={handleSave} 
                    disabled={cards.length === 0 || loading} 
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Kaydet & Çık
                </button>
            </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* 1. LEFT SIDEBAR: SLIDE LIST */}
            <div className="w-64 bg-white border-r border-[#d8dfea] flex flex-col z-10">
                <div className="p-3 border-b border-[#d8dfea] bg-[#f7f7f7]">
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase">Slayt Akışı</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cards.map((card, idx) => (
                        <div 
                            key={card.id}
                            onClick={() => setActiveCardId(card.id)}
                            className={`p-2 rounded-lg cursor-pointer flex items-center gap-3 border transition-all group ${
                                activeCardId === card.id 
                                ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' 
                                : 'bg-white border-gray-100 hover:border-gray-300'
                            }`}
                        >
                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-gray-800 truncate">{getLocalizedContent(card.title)}</div>
                                <div className="text-[9px] text-gray-400 capitalize">{card.type.toLowerCase()}</div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleAddCard}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-xs font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Yeni Slayt
                    </button>
                </div>
                
                {/* AI Generator Mini-Panel */}
                <div className="p-4 border-t border-[#d8dfea] bg-gray-50">
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">AI Asistanı</div>
                    <div className="flex gap-1 mb-2">
                        <select 
                            value={pedagogy}
                            onChange={(e) => setPedagogy(e.target.value as PedagogyMode)}
                            className="w-full text-xs border border-gray-300 rounded p-1"
                        >
                            <option value="STANDARD">Standart</option>
                            <option value="ACTIVE_RECALL">Quiz Odaklı</option>
                            <option value="SOCRATIC">Sokratik</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full bg-[#3b5998] text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#2d4373]"
                    >
                        <Wand2 className="w-3 h-3" />
                        {cards.length > 0 ? 'Yeniden Üret' : 'Otomatik Oluştur'}
                    </button>
                </div>
            </div>

            {/* 2. CENTER STAGE: PHONE PREVIEW */}
            <div className="flex-1 bg-[#eff0f5] flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-[40px_40px] opacity-[0.03]" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)' }} />
                
                {activeCard ? (
                    <div className="relative z-10 scale-[0.85] md:scale-100 transition-transform duration-300">
                        {/* PHONE FRAME */}
                        <div className="w-[375px] h-[812px] bg-black rounded-[3rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-[8px] border-gray-900 relative overflow-hidden ring-4 ring-gray-900/50">
                            
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[30px] w-[120px] bg-black rounded-b-2xl z-30 flex justify-center items-center">
                                <div className="w-16 h-1.5 bg-gray-800 rounded-full" />
                            </div>

                            {/* SCREEN CONTENT */}
                            <div className="w-full h-full bg-gray-900 relative">
                                <img src={activeCard.mediaUrl} className="w-full h-full object-cover opacity-90" alt="Slide" />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />
                                
                                {/* UI Elements Simulation */}
                                <div className="absolute top-2 left-0 right-0 h-1 flex gap-1 px-2 z-20">
                                    {cards.map((_, i) => (
                                        <div key={i} className={`h-full flex-1 rounded-full ${i <= cards.findIndex(c => c.id === activeCard.id) ? 'bg-white' : 'bg-white/30'}`} />
                                    ))}
                                </div>

                                <div className="absolute top-12 right-4 z-20">
                                    <button className="bg-white/10 backdrop-blur-md p-2 rounded-full text-white"><X className="w-5 h-5" /></button>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 text-white z-20">
                                    <div className="inline-block px-2 py-0.5 rounded bg-yellow-500 text-black text-[10px] font-black mb-3 uppercase tracking-widest">
                                        {activeCard.type}
                                    </div>
                                    <h2 className="text-3xl font-black mb-4 leading-tight drop-shadow-lg">
                                        {getLocalizedContent(activeCard.title)}
                                    </h2>
                                    <p className="text-lg font-medium leading-relaxed text-gray-100 drop-shadow-md line-clamp-6">
                                        {getLocalizedContent(activeCard.content)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Device Reflection */}
                        <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none bg-gradient-to-tr from-white/10 to-transparent z-40" />
                    </div>
                ) : (
                    <div className="text-center text-gray-400">
                        <Smartphone className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>Düzenlemek için soldan bir slayt seçin.</p>
                    </div>
                )}
            </div>

            {/* 3. RIGHT SIDEBAR: PROPERTY EDITOR */}
            <div className="w-80 bg-white border-l border-[#d8dfea] flex flex-col z-10 shadow-xl">
                {activeCard ? (
                    <>
                        <div className="p-4 border-b border-[#d8dfea] bg-[#f7f7f7] flex justify-between items-center">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Özellikler</h3>
                            <button onClick={() => handleDeleteCard(activeCard.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Slaytı Sil">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            
                            {/* Image Editor */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                    <ImageIcon className="w-3.5 h-3.5" /> Görsel
                                </label>
                                <div className="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                                    <img src={activeCard.mediaUrl} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-100"
                                        >
                                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                            Değiştir
                                        </button>
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleImageUpload} 
                                />
                                <p className="text-[10px] text-gray-400">Önerilen: 1080x1920px (Dikey)</p>
                            </div>

                            <div className="h-px bg-gray-100" />

                            {/* Text Editor */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                        <Type className="w-3.5 h-3.5" /> Başlık (TR)
                                    </label>
                                    <textarea 
                                        rows={2}
                                        value={getLocalizedContent(activeCard.title, ['tr'])}
                                        onChange={(e) => updateActiveCardText('title', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#3b5998] focus:border-transparent outline-none resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                        <AlignLeft className="w-3.5 h-3.5" /> İçerik Metni (TR)
                                    </label>
                                    <textarea 
                                        rows={6}
                                        value={getLocalizedContent(activeCard.content, ['tr'])}
                                        onChange={(e) => updateActiveCardText('content', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 focus:ring-2 focus:ring-[#3b5998] focus:border-transparent outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-gray-100" />

                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                <p className="text-[10px] text-yellow-700 leading-relaxed">
                                    <b>İpucu:</b> İçeriklerinizi kısa ve öz tutun. Kullanıcılar mobilde uzun metinleri okumakta zorlanabilir.
                                </p>
                            </div>

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 p-8 text-center text-xs">
                        Bir slayt seçerek düzenlemeye başlayın.
                    </div>
                )}
            </div>

        </div>
    </div>
  );
};
