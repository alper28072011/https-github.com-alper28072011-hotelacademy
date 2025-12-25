
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Wand2, Loader2, ArrowLeft, Save, Plus, Trash2, 
    Upload, X, ChevronRight, Layout,
    Type, AlignLeft, Hash, Check, Building2, User, AlertCircle
} from 'lucide-react';
import { generateModuleContent } from '../../services/geminiService';
import { StoryCard, PedagogyMode, LearningModule, Channel } from '../../types';
import { getLocalizedContent } from '../../i18n/config';
import { getModule, updateModuleContent, updateCourse } from '../../services/courseService';
import { uploadFile } from '../../services/storage';
import { useContextStore } from '../../stores/useContextStore'; // Context Store
import { getCourse, getOrganizationDetails } from '../../services/db';

export const ContentStudio: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { contextType, activeEntityId, activeEntityName, activeEntityAvatar } = useContextStore();

  // Data State
  const [moduleData, setModuleData] = useState<LearningModule | null>(null);
  const [cards, setCards] = useState<StoryCard[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  
  // Publishing State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pedagogy, setPedagogy] = useState<PedagogyMode>('STANDARD');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (moduleId) {
          loadData();
      }
  }, [moduleId]);

  // Determine authorized channels based on ACTIVE CONTEXT
  useEffect(() => {
      const loadChannels = async () => {
          if (!activeEntityId) return;

          // If Context is ORGANIZATION -> Fetch Org Channels
          if (contextType === 'ORGANIZATION') {
              const org = await getOrganizationDetails(activeEntityId);
              if (org) {
                  setAvailableChannels(org.channels || []);
              }
          } else {
              setAvailableChannels([]); 
          }
      };
      loadChannels();
  }, [contextType, activeEntityId]);

  const loadData = async () => {
      if(!moduleId) return;
      setLoading(true);
      const m = await getModule(moduleId);
      if(m) {
          setModuleData(m);
          setCards(m.content || []);
          if(m.content?.length > 0) setActiveCardId(m.content[0].id);
          
          // Pre-load existing targets
          const course = await getCourse(m.courseId);
          if (course?.targetChannelIds) {
              setSelectedChannels(course.targetChannelIds);
          }
      }
      setLoading(false);
  };

  // --- ACTIONS ---

  const handleSave = async () => {
      if(!moduleId) return;
      setIsSaving(true);
      await updateModuleContent(moduleId, cards);
      
      // If modal is open, also save channels
      if (showPublishModal && moduleData) {
          await updateCourse(moduleData.courseId, { targetChannelIds: selectedChannels });
      }
      
      setIsSaving(false);
      if (showPublishModal) {
          setShowPublishModal(false);
          alert("Yayınlandı!");
      }
  };

  const toggleChannel = (id: string) => {
      if (selectedChannels.includes(id)) {
          setSelectedChannels(selectedChannels.filter(c => c !== id));
      } else {
          setSelectedChannels([...selectedChannels, id]);
      }
  };

  // ... (Existing AI and Card CRUD handlers) ...
  const handleAddCard = () => {
      const newCard: StoryCard = {
          id: `card_${Date.now()}`,
          type: 'INFO',
          title: { tr: 'Yeni Başlık', en: 'New Title' },
          content: { tr: 'İçerik metnini buraya giriniz...', en: 'Content here...' },
          mediaUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800', 
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

  const updateActiveCardText = (field: 'title' | 'content', value: string) => {
      const currentCard = cards.find(c => c.id === activeCardId);
      if (!currentCard) return;
      const newLocalized = { ...currentCard[field], tr: value };
      setCards(prev => prev.map(c => c.id === activeCardId ? { ...c, [field]: newLocalized } : c));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && activeCardId) {
          setIsUploading(true);
          try {
              const url = await uploadFile(e.target.files[0], 'story_assets');
              setCards(prev => prev.map(c => c.id === activeCardId ? { ...c, mediaUrl: url } : c));
          } catch (error) {
              alert("Resim yüklenemedi.");
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handleGenerate = async () => {
      if(!moduleData) return;
      setLoading(true);
      try {
          const generatedCards = await generateModuleContent(
              getLocalizedContent(moduleData.title),
              "Hotel Course", 
              "Hospitality", 
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

  const activeCard = cards.find(c => c.id === activeCardId);

  if(loading && !moduleData) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#3b5998]" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-[#eff0f5] relative">
        
        {/* AUTHOR CARD (CONTEXT REMINDER) */}
        <div className={`px-6 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-inner border-b border-black/10 ${contextType === 'ORGANIZATION' ? 'bg-[#333] text-white' : 'bg-gray-200 text-gray-700'}`}>
            <span className="opacity-70 uppercase tracking-wider">Yayıncı Kimliği:</span>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                {contextType === 'ORGANIZATION' ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                <span className="text-sm">{activeEntityName}</span>
                <span className="ml-2 text-[9px] opacity-50 border-l border-white/20 pl-2">Değiştirilemez</span>
            </div>
        </div>

        {/* TOP BAR */}
        <div className="bg-white border-b border-[#d8dfea] h-[60px] flex justify-between items-center px-6 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="hover:bg-gray-100 p-2 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="font-bold text-lg text-[#333]">{getLocalizedContent(moduleData?.title)}</h1>
                    <p className="text-xs text-gray-500">{cards.length} Slayt • {moduleData?.type}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className="bg-white border border-[#ccc] text-[#333] px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Taslağı Kaydet'}
                </button>
                <button 
                    onClick={() => setShowPublishModal(true)} 
                    className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                    Yayınla
                </button>
            </div>
        </div>

        {/* WORKSPACE */}
        <div className="flex flex-1 overflow-hidden">
            {/* LIST */}
            <div className="w-72 bg-white border-r border-[#d8dfea] flex flex-col z-10">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {cards.map((card, idx) => (
                        <div 
                            key={card.id}
                            onClick={() => setActiveCardId(card.id)}
                            className={`p-2 rounded-sm cursor-pointer flex items-center gap-3 border transition-all ${
                                activeCardId === card.id 
                                ? 'bg-[#d8dfea] border-[#bdc7d8] text-[#3b5998] font-bold' 
                                : 'bg-white border-white hover:bg-[#eff0f5] text-[#333]'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${activeCardId === card.id ? 'bg-white text-[#3b5998] border border-[#ccc]' : 'bg-gray-100 text-gray-500'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs truncate">{getLocalizedContent(card.title) || 'Başlıksız'}</div>
                                <div className={`text-[10px] capitalize font-normal ${activeCardId === card.id ? 'text-[#3b5998]/70' : 'text-gray-400'}`}>{card.type}</div>
                            </div>
                            {activeCardId === card.id && <ChevronRight className="w-4 h-4 text-[#3b5998]" />}
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleAddCard}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-xs font-bold hover:border-[#3b5998] hover:text-[#3b5998] hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        <Plus className="w-4 h-4" /> Manuel Slayt Ekle
                    </button>
                </div>
                
                {/* AI Footer */}
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

            {/* EDITOR */}
            <div className="flex-1 bg-[#eff0f5] p-8 overflow-y-auto flex flex-col items-center">
                {activeCard ? (
                    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Image */}
                        <div className="bg-white rounded-t-xl border border-[#d8dfea] border-b-0 p-4 relative group">
                            <div className="relative aspect-video w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                                <img src={activeCard.mediaUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2"
                                    >
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        Görseli Değiştir
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
                            </div>
                        </div>

                        {/* Text */}
                        <div className="bg-white rounded-b-xl border border-[#d8dfea] p-8 shadow-sm">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Slayt Başlığı</label>
                                    <div className="relative">
                                        <Type className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                        <input 
                                            value={getLocalizedContent(activeCard.title, ['tr'])}
                                            onChange={(e) => updateActiveCardText('title', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 font-bold text-gray-800 focus:bg-white focus:border-[#3b5998] transition-all outline-none text-lg"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">İçerik Metni</label>
                                    <div className="relative">
                                        <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                        <textarea 
                                            rows={6}
                                            value={getLocalizedContent(activeCard.content, ['tr'])}
                                            onChange={(e) => updateActiveCardText('content', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-600 focus:bg-white focus:border-[#3b5998] transition-all outline-none resize-none leading-relaxed"
                                        />
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
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
                        <p className="text-sm font-medium">Düzenlemek için slayt seçin.</p>
                    </div>
                )}
            </div>
        </div>

        {/* PUBLISH MODAL */}
        {showPublishModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-[#3b5998]">Yayınla: Hedef Kitle Seçimi</h3>
                        <button onClick={() => setShowPublishModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    
                    {/* CONTEXT CONFIRMATION */}
                    <div className="bg-blue-50 border-b border-blue-100 p-3 flex items-center gap-2 text-xs text-blue-900">
                        <Building2 className="w-4 h-4" />
                        <span className="font-bold">{activeEntityName}</span> olarak yayınlanacak.
                    </div>

                    <div className="p-6">
                        {contextType === 'ORGANIZATION' ? (
                            <>
                                <p className="text-sm text-gray-600 mb-4">Bu eğitimi hangi kanallara (departmanlara) göndermek istiyorsunuz?</p>
                                
                                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                                    {availableChannels.map(channel => (
                                        <div 
                                            key={channel.id}
                                            onClick={() => toggleChannel(channel.id)}
                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${
                                                selectedChannels.includes(channel.id) 
                                                ? 'bg-white border-primary shadow-sm' 
                                                : 'bg-transparent border-transparent hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded flex items-center justify-center ${selectedChannels.includes(channel.id) ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                    <Hash className="w-4 h-4" />
                                                </div>
                                                <span className={`text-sm font-bold ${selectedChannels.includes(channel.id) ? 'text-primary' : 'text-gray-600'}`}>
                                                    {channel.name}
                                                </span>
                                            </div>
                                            {selectedChannels.includes(channel.id) && <Check className="w-5 h-5 text-primary" />}
                                        </div>
                                    ))}
                                    {availableChannels.length === 0 && (
                                        <div className="text-center p-4 text-xs text-gray-400">Yönetici olduğunuz kanal bulunamadı.</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                Kişisel profilinizde yayınlanacak ve takipçilerinizle paylaşılacak.
                            </div>
                        )}

                        <button 
                            onClick={handleSave}
                            disabled={isSaving || (contextType === 'ORGANIZATION' && selectedChannels.length === 0)}
                            className="w-full mt-6 bg-[#3b5998] hover:bg-[#2d4373] text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yayınla'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
