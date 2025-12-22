
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, ArrowLeft, Save, Layout, CheckCircle2 } from 'lucide-react';
import { createAiModuleContent } from '../../services/careerService';
import { StoryCard, PedagogyMode } from '../../types';
import { SortableList } from '../../components/ui/SortableList';
import { getLocalizedContent } from '../../i18n/config';
import { updateCourse, getCourse } from '../../services/db';

export const ContentStudio: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { courseId: string; moduleIndex: number; moduleTitle: string; courseTitle: string; existingCards?: StoryCard[] };

  const [cards, setCards] = useState<StoryCard[]>(state?.existingCards || []);
  const [loading, setLoading] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  // Generation Config
  const [pedagogy, setPedagogy] = useState<PedagogyMode>('STANDARD');

  // Safety Redirect
  useEffect(() => {
      if (!state?.courseId) navigate('/admin/courses');
  }, [state]);

  const handleGenerate = async () => {
      setLoading(true);
      try {
          const generatedCards = await createAiModuleContent(
              state.courseId,
              state.moduleIndex,
              state.moduleTitle,
              state.courseTitle,
              "Hotel Career Path", // Generic context fallback
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
          // Fetch fresh course data
          const course = await getCourse(state.courseId);
          if (course && course.modules) {
              // Update specific module
              const updatedModules = [...course.modules];
              updatedModules[state.moduleIndex] = {
                  ...updatedModules[state.moduleIndex],
                  cards: cards,
                  status: 'PUBLISHED'
              };
              
              // Also flatten cards to course.steps for backward compatibility if needed
              // For now, we update modules.
              await updateCourse(state.courseId, { modules: updatedModules });
              alert("Modül kaydedildi!");
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
        {/* Header */}
        <div className="bg-[#3b5998] text-white p-3 flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/admin/courses')} className="hover:bg-white/10 p-1 rounded"><ArrowLeft className="w-5 h-5" /></button>
                <div>
                    <h1 className="font-bold text-sm">{state?.moduleTitle}</h1>
                    <p className="text-[10px] opacity-70">{state?.courseTitle}</p>
                </div>
            </div>
            <button onClick={handleSave} disabled={cards.length === 0} className="bg-green-600 px-4 py-1.5 rounded font-bold text-xs hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                <Save className="w-3 h-3" /> Kaydet
            </button>
        </div>

        {/* Workspace */}
        {cards.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="bg-white p-8 rounded-lg shadow border border-[#d8dfea] max-w-lg w-full text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wand2 className="w-8 h-8 text-[#3b5998]" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">İçerik Sihirbazı</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        "{state?.moduleTitle}" konusu için yapay zeka destekli içerik üretmek üzeresiniz.
                        Öğretim metodunu seçin ve başlatın.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {[
                            { id: 'STANDARD', label: 'Standart Anlatım' },
                            { id: 'ACTIVE_RECALL', label: 'Aktif Hatırlama (Quiz)' },
                            { id: 'FEYNMAN', label: 'Feynman (Basitleştirilmiş)' },
                            { id: 'SOCRATIC', label: 'Sokratik (Soru-Cevap)' },
                        ].map((m: any) => (
                            <button 
                                key={m.id}
                                onClick={() => setPedagogy(m.id)}
                                className={`p-3 rounded border text-xs font-bold transition-all ${pedagogy === m.id ? 'bg-[#3b5998] text-white border-[#3b5998]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-white'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full bg-[#3b5998] text-white py-3 rounded font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'İçeriği Üret'}
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Cards */}
                <div className="w-64 bg-white border-r border-[#d8dfea] flex flex-col">
                    <div className="p-2 border-b border-[#d8dfea] bg-[#f7f7f7] text-[10px] font-bold uppercase text-gray-500">Slayt Akışı</div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {cards.map((card, idx) => (
                            <div 
                                key={card.id}
                                onClick={() => setActiveCardId(card.id)}
                                className={`p-2 mb-2 rounded border cursor-pointer flex items-center gap-2 ${activeCardId === card.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                            >
                                <span className="text-[10px] font-bold text-gray-400 w-4">{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold truncate">{getLocalizedContent(card.title)}</div>
                                    <div className="text-[9px] text-gray-400">{card.type}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor / Preview */}
                <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center">
                    {activeCard && (
                        <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="aspect-video bg-black relative">
                                <img src={activeCard.mediaUrl} className="w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 p-8 flex flex-col justify-end text-white bg-gradient-to-t from-black/80 to-transparent">
                                    <h2 className="text-3xl font-bold mb-2">{getLocalizedContent(activeCard.title)}</h2>
                                    <p className="text-lg opacity-90">{getLocalizedContent(activeCard.content)}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-[#f7f7f7] border-t border-[#d8dfea]">
                                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Editör Notu</div>
                                <p className="text-sm text-gray-700">Bu içerik yapay zeka tarafından oluşturulmuştur. Medya ve metinler otomatik yerleştirilmiştir.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
