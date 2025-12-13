
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Film, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, Layers, Smartphone, Send, Plus, Wand2 } from 'lucide-react';
import { DepartmentType, Course, FeedPost } from '../../types';
import { uploadFile } from '../../services/storage';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { generateCourseDraft, generateCourseImage, ContentMode } from '../../services/geminiService';
import { createPost } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';

type CreateMode = 'select' | 'post' | 'series';

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const [mode, setMode] = useState<CreateMode>('select');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- POST MODE STATE ---
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const [postCaption, setPostCaption] = useState('');
  const [postTargetDepts, setPostTargetDepts] = useState<DepartmentType[]>(['housekeeping', 'kitchen', 'front_office', 'management']);

  // --- SERIES MODE STATE (Gemini) ---
  const [magicPrompt, setMagicPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesDesc, setSeriesDesc] = useState('');
  const [seriesCover, setSeriesCover] = useState<string | null>(null);
  const [seriesModules, setSeriesModules] = useState<{title: string, description: string}[]>([]);

  // --- HANDLERS ---

  const handlePostFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const file = e.target.files[0];
          setPostFile(file);
          setPostPreview(URL.createObjectURL(file));
      }
  };

  const togglePostDept = (dept: DepartmentType) => {
      setPostTargetDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
  };

  const handleCreatePost = async () => {
      if (!postFile || !postCaption || !currentUser) return;
      setLoading(true);

      try {
          // 1. Upload Media
          const url = await uploadFile(postFile, 'feed_posts');
          const type = postFile.type.startsWith('video') ? 'video' : 'image';

          // 2. Create Feed Post
          const newPost: Omit<FeedPost, 'id'> = {
              authorId: currentUser.id,
              authorName: currentUser.name,
              authorAvatar: currentUser.avatar, // In real app, this is a URL
              targetDepartments: postTargetDepts,
              type,
              mediaUrl: url,
              caption: postCaption,
              likes: 0,
              createdAt: Date.now(),
              likedBy: []
          };

          await createPost(newPost);
          setSuccess(true);
          setTimeout(() => {
              setSuccess(false);
              setMode('select');
              setPostFile(null);
              setPostPreview(null);
              setPostCaption('');
          }, 2000);

      } catch (e) {
          console.error(e);
          alert("Hata oluştu.");
      } finally {
          setLoading(false);
      }
  };

  const handleSeriesGenerate = async () => {
      if (!magicPrompt) return;
      setIsGenerating(true);
      // Generate structured course draft (Text only)
      const draft = await generateCourseDraft(magicPrompt, 'Turkish', 'series');
      
      if (draft) {
          setSeriesTitle(draft.title.replace(/"/g, ''));
          setSeriesDesc(draft.description);
          setSeriesModules(draft.modules || []);
          
          // Use stock image instead of AI gen
          const stock = await generateCourseImage(draft.imagePrompt);
          setSeriesCover(stock);
      }
      setIsGenerating(false);
  };

  const handleCreateSeries = async () => {
      if (!seriesTitle || !seriesCover) return;
      setLoading(true);
      try {
          // Simplified Course Creation for Demo
           const newCourse: Omit<Course, 'id'> = {
            categoryId: 'cat_guest',
            title: seriesTitle,
            description: seriesDesc,
            thumbnailUrl: seriesCover,
            duration: 15,
            xpReward: 150,
            isFeatured: true,
            targetDepartments: ['housekeeping'], // Default
            steps: seriesModules.map((m, i) => ({
                id: `s_${i}`,
                type: 'video',
                title: m.title,
                description: m.description,
                posterUrl: seriesCover,
                videoUrl: 'https://cdn.coverr.co/videos/coverr-people-eating-at-a-restaurant-4433/1080p.mp4' // Placeholder
            }))
        };
        await addDoc(collection(db, 'courses'), newCourse);
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setMode('select');
            setSeriesTitle('');
            setSeriesCover(null);
            setMagicPrompt('');
        }, 2000);

      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  // --- RENDER ---

  if (success) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] animate-in zoom-in">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                  <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Paylaşıldı!</h2>
          </div>
      );
  }

  // MODE SELECTION SCREEN
  if (mode === 'select') {
      return (
          <div className="max-w-4xl mx-auto py-10">
              <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Ne paylaşmak istiyorsun?</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* OPTION A: NEW POST */}
                  <button 
                    onClick={() => setMode('post')}
                    className="group relative bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all text-left overflow-hidden"
                  >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500 to-orange-400 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity" />
                      <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <Smartphone className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Hızlı Gönderi</h2>
                      <p className="text-gray-500">Instagram tarzı fotoğraf veya video paylaş. Haberler, duyurular veya günlük anlar için ideal.</p>
                      <div className="mt-8 flex items-center gap-2 text-pink-600 font-bold">
                          Oluştur <Plus className="w-5 h-5" />
                      </div>
                  </button>

                  {/* OPTION B: TRAINING SERIES */}
                  <button 
                    onClick={() => setMode('series')}
                    className="group relative bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all text-left overflow-hidden"
                  >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity" />
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <Layers className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">Eğitim Serisi</h2>
                      <p className="text-gray-500">Adım adım ilerleyen, video ve test içeren kapsamlı eğitim modülleri oluştur.</p>
                      <div className="mt-8 flex items-center gap-2 text-indigo-600 font-bold">
                          Tasarla <Plus className="w-5 h-5" />
                      </div>
                  </button>

              </div>
          </div>
      );
  }

  // POST CREATION SCREEN
  if (mode === 'post') {
      return (
          <div className="max-w-xl mx-auto py-6">
              <button onClick={() => setMode('select')} className="text-gray-500 hover:text-gray-800 mb-6 font-medium">← Geri Dön</button>
              
              <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="font-bold text-lg">Yeni Gönderi</h2>
                      <button 
                        onClick={handleCreatePost}
                        disabled={loading || !postFile}
                        className="text-blue-600 font-bold hover:text-blue-700 disabled:opacity-50"
                      >
                          {loading ? 'Paylaşılıyor...' : 'Paylaş'}
                      </button>
                  </div>

                  {/* Image/Video Upload Area */}
                  <div className="w-full aspect-square bg-gray-50 relative flex flex-col items-center justify-center group cursor-pointer border-b border-gray-100">
                      {postPreview ? (
                          <>
                            {postFile?.type.startsWith('video') ? (
                                <video src={postPreview} className="w-full h-full object-cover" controls />
                            ) : (
                                <img src={postPreview} className="w-full h-full object-cover" alt="Preview" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">
                                Değiştirmek için tıkla
                            </div>
                          </>
                      ) : (
                          <div className="flex flex-col items-center text-gray-400">
                              <ImageIcon className="w-12 h-12 mb-2" />
                              <span className="font-bold">Fotoğraf veya Video Seç</span>
                          </div>
                      )}
                      <input type="file" accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePostFileSelect} />
                  </div>

                  {/* Details */}
                  <div className="p-6">
                      <textarea 
                        value={postCaption}
                        onChange={(e) => setPostCaption(e.target.value)}
                        placeholder="Bir açıklama yaz..."
                        className="w-full h-24 resize-none outline-none text-gray-800 placeholder-gray-400 text-base"
                      />
                      
                      <div className="mt-4">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hedef Kitle</label>
                          <div className="flex flex-wrap gap-2">
                              {['housekeeping', 'kitchen', 'front_office', 'management'].map(d => (
                                  <button
                                    key={d}
                                    onClick={() => togglePostDept(d as any)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors border ${
                                        postTargetDepts.includes(d as any)
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-400 border-gray-200'
                                    }`}
                                  >
                                      {d.replace('_', ' ')}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // SERIES CREATION SCREEN (Gemini Powered)
  if (mode === 'series') {
      return (
          <div className="max-w-3xl mx-auto py-6">
               <button onClick={() => setMode('select')} className="text-gray-500 hover:text-gray-800 mb-6 font-medium">← Geri Dön</button>
               
               <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                   {/* Gemini Header */}
                   <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
                       <div className="flex items-center gap-2 mb-2">
                           <Sparkles className="w-5 h-5 text-yellow-300" />
                           <span className="font-bold uppercase tracking-wider text-xs">AI Asistan</span>
                       </div>
                       <h2 className="text-2xl font-bold mb-4">Eğitim Serisi Oluştur</h2>
                       
                       <div className="flex gap-2">
                           <input 
                             value={magicPrompt}
                             onChange={(e) => setMagicPrompt(e.target.value)}
                             placeholder="Konu nedir? (Örn: Lüks Restoran Adabı)"
                             className="flex-1 bg-white/20 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 outline-none focus:bg-white/30"
                           />
                           <button 
                             onClick={handleSeriesGenerate}
                             disabled={isGenerating || !magicPrompt}
                             className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 disabled:opacity-50"
                           >
                               {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                               Oluştur
                           </button>
                       </div>
                   </div>

                   {/* Preview Area */}
                   {seriesTitle && (
                       <div className="p-8">
                           <div className="flex gap-6 mb-8">
                               <div className="w-1/3 aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 relative shadow-lg">
                                    {seriesCover && <img src={seriesCover} className="w-full h-full object-cover" alt="Cover" />}
                               </div>
                               <div className="w-2/3">
                                   <h3 className="text-2xl font-bold text-gray-800 mb-2">{seriesTitle}</h3>
                                   <p className="text-gray-600 mb-4">{seriesDesc}</p>
                                   <div className="bg-gray-50 rounded-xl p-4">
                                       <h4 className="font-bold text-sm text-gray-500 uppercase mb-2">Modüller</h4>
                                       <ul className="space-y-2">
                                           {seriesModules.map((m, i) => (
                                               <li key={i} className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                                   <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">{i+1}</span>
                                                   {m.title}
                                               </li>
                                           ))}
                                       </ul>
                                   </div>
                               </div>
                           </div>
                           
                           <button 
                                onClick={handleCreateSeries}
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                           >
                               {loading ? 'Kaydediliyor...' : 'Seriyi Yayınla'}
                           </button>
                       </div>
                   )}
               </div>
          </div>
      );
  }

  return null;
};
