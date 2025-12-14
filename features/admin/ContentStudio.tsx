
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Upload, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, 
    Smartphone, Send, Plus, Trash2, Link as LinkIcon, HelpCircle, 
    BarChart2, Zap, MoreHorizontal, Heart, MessageCircle, Share2
} from 'lucide-react';
import { DepartmentType, FeedPost, Interaction, InteractionType } from '../../types';
import { uploadFile } from '../../services/storage';
import { createInteractivePost } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';

// --- STICKER CONFIGURATION COMPONENTS ---

const PollConfig: React.FC<{ data: any, onChange: (d: any) => void }> = ({ data, onChange }) => (
    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Soru</label>
            <input 
                className="w-full p-2 rounded-lg border border-gray-300 text-sm" 
                placeholder="Bu eğitimi beğendiniz mi?"
                value={data.question || ''} 
                onChange={e => onChange({ ...data, question: e.target.value })} 
            />
        </div>
        <div className="flex gap-2">
            <input 
                className="flex-1 p-2 rounded-lg border border-gray-300 text-sm text-center" 
                placeholder="Evet"
                value={data.options?.[0] || ''} 
                onChange={e => onChange({ ...data, options: [e.target.value, data.options?.[1] || ''] })} 
            />
            <input 
                className="flex-1 p-2 rounded-lg border border-gray-300 text-sm text-center" 
                placeholder="Hayır"
                value={data.options?.[1] || ''} 
                onChange={e => onChange({ ...data, options: [data.options?.[0] || '', e.target.value] })} 
            />
        </div>
    </div>
);

const XpConfig: React.FC<{ data: any, onChange: (d: any) => void }> = ({ data, onChange }) => (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
         <label className="text-xs font-bold text-gray-500 uppercase block mb-2">XP Miktarı</label>
         <div className="flex gap-2">
             {[50, 100, 250, 500].map(amt => (
                 <button 
                    key={amt} 
                    onClick={() => onChange({ ...data, xpAmount: amt })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${data.xpAmount === amt ? 'bg-accent text-primary border-accent' : 'bg-white border-gray-200 text-gray-500'}`}
                 >
                     +{amt}
                 </button>
             ))}
         </div>
    </div>
);

// --- MAIN STUDIO COMPONENT ---

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  
  // State
  const [activeTab, setActiveTab] = useState<'feed' | 'story'>('feed');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [targetDepts, setTargetDepts] = useState<DepartmentType[]>(['housekeeping']);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  
  // UI State
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const f = e.target.files[0];
          setFile(f);
          setPreviewUrl(URL.createObjectURL(f));
      }
  };

  const addInteraction = (type: InteractionType) => {
      // Limit: Only 1 interaction for Feed posts to keep it clean for now
      if (interactions.length > 0) {
          alert("Şimdilik gönderi başına sadece 1 etkileşim ekleyebilirsiniz.");
          return;
      }

      const newId = Date.now().toString();
      const defaultData: any = {};
      
      if (type === 'POLL') {
          defaultData.question = "Bu konu hakkında ne düşünüyorsun?";
          defaultData.options = ["Harika 😍", "Geliştirilmeli 🤔"];
      } else if (type === 'XP_BOOST') {
          defaultData.xpAmount = 100;
      }

      const newInteraction: Interaction = {
          id: newId,
          type,
          data: defaultData,
          style: { x: 50, y: 50, scale: 1 }
      };

      setInteractions([...interactions, newInteraction]);
      setActiveInteractionId(newId);
  };

  const updateInteractionData = (id: string, newData: any) => {
      setInteractions(prev => prev.map(i => i.id === id ? { ...i, data: newData } : i));
  };

  const removeInteraction = (id: string) => {
      setInteractions(prev => prev.filter(i => i.id !== id));
      setActiveInteractionId(null);
  };

  const handlePublish = async () => {
      if (!file || !currentUser) return;
      setIsPublishing(true);

      try {
          const url = await uploadFile(file, 'feed_posts');
          
          const newPost: Omit<FeedPost, 'id'> = {
              authorId: currentUser.id,
              authorName: currentUser.name,
              authorAvatar: currentUser.avatar,
              targetDepartments: targetDepts,
              type: file.type.startsWith('video') ? 'video' : 'image',
              mediaUrl: url,
              caption: caption,
              likes: 0,
              createdAt: Date.now(),
              likedBy: [],
              interactions: interactions
          };

          await createInteractivePost(newPost);
          
          setIsSuccess(true);
          setTimeout(() => {
              setIsSuccess(false);
              setFile(null);
              setPreviewUrl(null);
              setCaption('');
              setInteractions([]);
          }, 2000);

      } catch (error) {
          console.error(error);
          alert("Yayınlama hatası");
      } finally {
          setIsPublishing(false);
      }
  };

  const toggleDept = (d: DepartmentType) => {
      setTargetDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  // --- RENDER HELPERS ---
  const activeInteraction = interactions.find(i => i.id === activeInteractionId);

  // Success Screen
  if (isSuccess) {
      return (
          <div className="flex flex-col items-center justify-center h-[70vh] animate-in zoom-in">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                  <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Yayında!</h2>
              <p className="text-gray-500 mt-2">İçerik personelin akışına düştü.</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 h-[calc(100vh-100px)]">
        
        {/* LEFT PANEL: EDITOR & TOOLS */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
            
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">İçerik Stüdyosu</h1>
                <p className="text-gray-500 text-sm">İçeriği tasarla, etkileşim ekle ve yayınla.</p>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-max">
                <button 
                    onClick={() => setActiveTab('feed')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'feed' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Haber Akışı (Feed)
                </button>
                <button 
                    onClick={() => setActiveTab('story')}
                    disabled 
                    className="px-6 py-2 rounded-lg text-sm font-bold text-gray-400 cursor-not-allowed flex items-center gap-2"
                >
                    Hikaye (Yakında) <Sparkles className="w-3 h-3" />
                </button>
            </div>

            {/* Upload Area */}
            {!previewUrl ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6" />
                        </div>
                        <p className="mb-1 text-sm text-gray-500 font-medium">Medyayı buraya sürükle veya seç</p>
                        <p className="text-xs text-gray-400">MP4, JPG, PNG (Max 50MB)</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                </label>
            ) : (
                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                         {file?.type.startsWith('video') ? (
                             <video src={previewUrl} className="w-full h-full object-cover" />
                         ) : (
                             <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                         )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{file?.name}</p>
                        <p className="text-xs text-gray-500">Hazır</p>
                    </div>
                    <button onClick={() => { setFile(null); setPreviewUrl(null); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Caption */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Açıklama</label>
                <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary focus:ring-0 outline-none resize-none h-24 text-sm"
                    placeholder="Ekibe ne söylemek istersin?"
                />
            </div>

            {/* Sticker Tray */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Etkileşim Ekle</label>
                    <span className="text-[10px] bg-accent/20 text-accent-dark px-2 py-0.5 rounded-full font-bold">Yeni</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    <button onClick={() => addInteraction('POLL')} className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">Anket</span>
                    </button>
                    
                    <button onClick={() => addInteraction('XP_BOOST')} className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-yellow-400 hover:shadow-md transition-all group">
                        <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">XP Ödül</span>
                    </button>

                    <button disabled className="flex flex-col items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl opacity-50 cursor-not-allowed">
                        <div className="w-10 h-10 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-400">Test</span>
                    </button>

                    <button disabled className="flex flex-col items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl opacity-50 cursor-not-allowed">
                        <div className="w-10 h-10 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center">
                            <LinkIcon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-400">Link</span>
                    </button>
                </div>
            </div>

            {/* Active Interaction Config */}
            {activeInteraction && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-gray-100 pt-4"
                >
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800 text-sm">
                            {activeInteraction.type === 'POLL' ? 'Anket Ayarları' : 'XP Ayarları'}
                        </h3>
                        <button onClick={() => removeInteraction(activeInteraction.id)} className="text-red-500 text-xs hover:underline">Kaldır</button>
                    </div>

                    {activeInteraction.type === 'POLL' && (
                        <PollConfig 
                            data={activeInteraction.data} 
                            onChange={(d) => updateInteractionData(activeInteraction.id, d)} 
                        />
                    )}
                    {activeInteraction.type === 'XP_BOOST' && (
                        <XpConfig 
                            data={activeInteraction.data} 
                            onChange={(d) => updateInteractionData(activeInteraction.id, d)} 
                        />
                    )}
                </motion.div>
            )}

            {/* Targeting */}
            <div className="mt-auto pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Hedef Kitle</label>
                <div className="flex flex-wrap gap-2 mb-6">
                    {['housekeeping', 'kitchen', 'front_office', 'management'].map(d => (
                        <button
                          key={d}
                          onClick={() => toggleDept(d as any)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors border ${
                              targetDepts.includes(d as any)
                              ? 'bg-gray-800 text-white border-gray-800'
                              : 'bg-white text-gray-500 border-gray-200'
                          }`}
                        >
                            {d.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={handlePublish}
                    disabled={!file || isPublishing}
                    className="w-full bg-primary hover:bg-primary-light disabled:bg-gray-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                >
                    {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Yayınla
                </button>
            </div>
        </div>

        {/* RIGHT PANEL: LIVE PREVIEW (THE PHONE) */}
        <div className="flex-1 bg-gray-100 rounded-[2.5rem] p-8 flex items-center justify-center relative overflow-hidden border border-gray-200 shadow-inner">
             {/* Grid Pattern Background */}
             <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>

             <div className="relative w-[340px] h-[700px] bg-white rounded-[3rem] shadow-2xl border-[8px] border-gray-900 overflow-hidden flex flex-col">
                 {/* Dynamic Island / Notch */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-black rounded-b-2xl z-50"></div>
                 
                 {/* Status Bar Mock */}
                 <div className="flex justify-between px-6 pt-3 pb-2 text-[10px] font-bold text-gray-900">
                     <span>09:41</span>
                     <div className="flex gap-1">
                         <div className="w-4 h-2.5 bg-gray-900 rounded-sm"></div>
                         <div className="w-0.5 h-2.5 bg-gray-900 rounded-sm"></div>
                     </div>
                 </div>

                 {/* APP UI PREVIEW */}
                 <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
                     {/* Preview: Feed Post Style */}
                     <div className="pb-4">
                         {/* Header */}
                         <div className="flex items-center justify-between p-3">
                             <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-primary text-xs border border-gray-300">
                                     {currentUser?.avatar || 'ME'}
                                 </div>
                                 <div>
                                     <div className="text-xs font-bold text-gray-900">{currentUser?.name || 'Sen'}</div>
                                     <div className="text-[10px] text-gray-500">Az önce</div>
                                 </div>
                             </div>
                             <MoreHorizontal className="w-4 h-4 text-gray-400" />
                         </div>

                         {/* MEDIA AREA - THIS IS THE WYSIWYG CANVAS */}
                         <div className="relative w-full bg-gray-100 aspect-[4/5] flex items-center justify-center overflow-hidden">
                             {previewUrl ? (
                                 file?.type.startsWith('video') ? (
                                     <video src={previewUrl} className="w-full h-full object-cover" muted loop autoPlay />
                                 ) : (
                                     <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                 )
                             ) : (
                                 <div className="text-gray-400 flex flex-col items-center">
                                     <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                     <span className="text-xs">Medya Önizleme</span>
                                 </div>
                             )}

                             {/* --- INTERACTION LAYER --- */}
                             {/* This renders the stickers ON TOP of the image */}
                             <div className="absolute inset-0 p-8 flex items-center justify-center pointer-events-none">
                                 {interactions.map(interaction => (
                                     <motion.div 
                                        key={interaction.id}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="pointer-events-auto"
                                     >
                                         {interaction.type === 'POLL' && (
                                             <div className="bg-white rounded-xl shadow-xl p-4 w-64 text-center">
                                                 <h4 className="font-bold text-gray-800 mb-3 text-sm leading-tight">
                                                     {interaction.data.question || "Soru..."}
                                                 </h4>
                                                 <div className="flex gap-2">
                                                     <button className="flex-1 bg-gray-100 py-2 rounded-lg text-xs font-bold text-gray-600">
                                                         {interaction.data.options?.[0] || 'Evet'}
                                                     </button>
                                                     <button className="flex-1 bg-gray-100 py-2 rounded-lg text-xs font-bold text-gray-600">
                                                         {interaction.data.options?.[1] || 'Hayır'}
                                                     </button>
                                                 </div>
                                             </div>
                                         )}

                                         {interaction.type === 'XP_BOOST' && (
                                             <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-lg shadow-orange-500/30 flex items-center gap-2 animate-pulse">
                                                 <Zap className="w-4 h-4 fill-white" />
                                                 +{interaction.data.xpAmount} XP
                                             </div>
                                         )}
                                     </motion.div>
                                 ))}
                             </div>

                         </div>

                         {/* Action Bar */}
                         <div className="p-3">
                             <div className="flex items-center gap-4 mb-2">
                                 <Heart className="w-6 h-6 text-gray-800" />
                                 <MessageCircle className="w-6 h-6 text-gray-800" />
                                 <Share2 className="w-6 h-6 text-gray-800 ml-auto" />
                             </div>
                             <div className="text-xs font-bold text-gray-900 mb-1">0 beğeni</div>
                             <div className="text-xs text-gray-800">
                                 <span className="font-bold mr-1">{currentUser?.name || 'Sen'}</span>
                                 {caption || <span className="text-gray-400 italic">Açıklama buraya gelecek...</span>}
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Home Bar */}
                 <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-900 rounded-full"></div>
             </div>
        </div>
    </div>
  );
};
