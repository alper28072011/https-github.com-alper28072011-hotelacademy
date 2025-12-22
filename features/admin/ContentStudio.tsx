
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, Loader2, ArrowLeft, Save, Plus, Trash2, 
    Image as ImageIcon, Upload, X, ChevronRight, Layout,
    Type, AlignLeft, MoreHorizontal
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
          content: { tr: 'İçerik metnini buraya giriniz...', en: 'Content here...' },
          mediaUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800', // Clean gradient placeholder
          duration: 10
      };
      setCards([...cards, newCard]);
      setActiveCardId(newCard.id);
  };

  const handleDeleteCard = (id: string) => {
      if (!confirm("Bu slaytı silmek istediğinize emin misiniz?")) return;
      
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
    <div className="flex flex-col h-[calc(100vh-60px)] bg-[#eff0f5]">
        
        {/* TOP BAR */}
        <div className="bg-white border-b border-[#d8dfea] h-[60px] flex justify-between items-center px-6 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin/courses')} className="hover:bg-gray-100 p-2 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="font-bold text-lg text-[#333]">{state?.moduleTitle}</h1>
                    <p className="text-xs text-gray-500">{state?.courseTitle} • {cards.length} Slayt</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                    <Save className="w-3 h-3" />
                    Otomatik Kayıt Yok
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={cards.length === 0 || loading} 
                    className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kaydet ve Çık'}
                </button>
            </div>
        </div>

        {/* MAIN WORKSPACE (2 COLUMNS) */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* 1. LEFT SIDEBAR: SLIDE LIST */}
            <div className="w-72 bg-white border-r border-[#d8dfea] flex flex-col z-10">
                <div className="p-4 border-b border-[#d8dfea] bg-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Slayt Listesi</h3>
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600">{cards.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {cards.map((card, idx) => (
                        <div 
                            key={card.id}
                            onClick={() => setActiveCardId(card.id)}
                            className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 border transition-all ${
                                activeCardId === card.id 
                                ? 'bg-[#3b5998] border-[#3b5998] text-white shadow-md' 
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${activeCardId === card.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate">{getLocalizedContent(card.title) || 'Başlıksız'}</div>
                                <div className={`text-[10px] capitalize ${activeCardId === card.id ? 'text-white/70' : 'text-gray-400'}`}>{card.type}</div>
                            </div>
                            {activeCardId === card.id && <ChevronRight className="w-4 h-4 text-white/50" />}
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleAddCard}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-xs font-bold hover:border-[#3b5998] hover:text-[#3b5998] hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        <Plus className="w-4 h-4" /> Manuel Slayt Ekle
                    </button>
                </div>
                
                {/* AI Generator Footer */}
                <div className="p-4 border-t border-[#d8dfea] bg-gray-50">
                    <div className="flex gap-2 mb-2">
                        <select 
                            value={pedagogy}
                            onChange={(e) => setPedagogy(e.target.value as PedagogyMode)}
                            className="flex-1 text-xs border border-gray-300 rounded p-2 bg-white"
                        >
                            <option value="STANDARD">Standart Mod</option>
                            <option value="ACTIVE_RECALL">Soru-Cevap Modu</option>
                            <option value="FEYNMAN">Basitleştirilmiş</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full bg-white border border-[#3b5998] text-[#3b5998] py-2 rounded font-bold text-xs hover:bg-blue-50 flex items-center justify-center gap-2"
                    >
                        <Wand2 className="w-3 h-3" />
                        AI ile İçerik Üret
                    </button>
                </div>
            </div>

            {/* 2. RIGHT SIDEBAR: EDITOR CANVAS */}
            <div className="flex-1 bg-[#eff0f5] p-8 overflow-y-auto flex flex-col items-center">
                {activeCard ? (
                    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* 1. IMAGE SECTION */}
                        <div className="bg-white rounded-t-xl border border-[#d8dfea] border-b-0 p-4 relative group">
                            <div className="relative aspect-video w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                                <img src={activeCard.mediaUrl} className="w-full h-full object-cover" />
                                
                                {/* Image Overlay Controls */}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                    >
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        Görseli Değiştir
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageUpload} 
                                    />
                                </div>
                            </div>
                            <div className="absolute top-6 right-6 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md">
                                16:9 Önerilir
                            </div>
                        </div>

                        {/* 2. FORM SECTION */}
                        <div className="bg-white rounded-b-xl border border-[#d8dfea] p-8 shadow-sm">
                            <div className="space-y-6">
                                {/* Title Input */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Slayt Başlığı</label>
                                    <div className="relative">
                                        <Type className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                        <input 
                                            value={getLocalizedContent(activeCard.title, ['tr'])}
                                            onChange={(e) => updateActiveCardText('title', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 font-bold text-gray-800 focus:bg-white focus:border-[#3b5998] focus:ring-4 focus:ring-blue-50 transition-all outline-none text-lg"
                                            placeholder="Başlık giriniz..."
                                        />
                                    </div>
                                </div>

                                {/* Content Textarea */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">İçerik Metni</label>
                                    <div className="relative">
                                        <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                        <textarea 
                                            rows={6}
                                            value={getLocalizedContent(activeCard.content, ['tr'])}
                                            onChange={(e) => updateActiveCardText('content', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-600 focus:bg-white focus:border-[#3b5998] focus:ring-4 focus:ring-blue-50 transition-all outline-none resize-none leading-relaxed"
                                            placeholder="İçerik detaylarını buraya yazınız..."
                                        />
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                                    <div className="text-xs text-gray-400">
                                        Tip: <span className="font-bold uppercase text-gray-600">{activeCard.type}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteCard(activeCard.id)}
                                        className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Slaytı Sil
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Layout className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-sm font-medium">Düzenlemek için soldaki listeden bir slayt seçin.</p>
                        <p className="text-xs opacity-60 mt-1">veya yeni bir tane ekleyin.</p>
                    </div>
                )}
            </div>

        </div>
    </div>
  );
};
