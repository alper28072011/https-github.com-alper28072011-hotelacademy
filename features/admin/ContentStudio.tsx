
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Film, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, FileText, Wand2, Layers, Smartphone } from 'lucide-react';
import { DepartmentType, Course } from '../../types';
import { uploadFile } from '../../services/storage';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { generateCourseDraft, generateCourseImage, ContentMode } from '../../services/geminiService';
import { notifyDepartment } from '../../services/notificationService';

export const ContentStudio: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // UI Mode
  const [contentMode, setContentMode] = useState<ContentMode>('series');

  // AI State
  const [magicPrompt, setMagicPrompt] = useState('');
  const [magicLang, setMagicLang] = useState('Turkish');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('cat_guest'); 
  const [targetDepts, setTargetDepts] = useState<DepartmentType[]>([]);
  const [generatedModules, setGeneratedModules] = useState<{title: string, description: string}[]>([]);
  
  // Media State
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- AI HANDLERS ---

  const handleMagicGenerate = async () => {
      if (!magicPrompt) return;
      setIsGenerating(true);

      // 1. Generate Structured Content
      const draft = await generateCourseDraft(magicPrompt, magicLang, contentMode);
      
      if (draft) {
          // Explicitly set fields to prevent "dumping all text to title"
          setTitle(draft.title.replace(/"/g, '')); // Cleanup quotes if any
          setDescription(draft.description);
          
          // If series, populate modules
          if (draft.modules && draft.modules.length > 0) {
              setGeneratedModules(draft.modules);
          } else {
              setGeneratedModules([]);
          }

          // Auto-select departments based on title/desc keywords
          const combinedText = (draft.title + " " + draft.description).toLowerCase();
          if (combinedText.includes('kitchen') || combinedText.includes('mutfak') || combinedText.includes('chef') || combinedText.includes('yemek')) {
              setTargetDepts(['kitchen']);
          } else if (combinedText.includes('room') || combinedText.includes('oda') || combinedText.includes('temizlik') || combinedText.includes('housekeeping')) {
              setTargetDepts(['housekeeping']);
          }

          // 2. Fetch Stock Image
          const stockImageUrl = await generateCourseImage(draft.imagePrompt);
          if (stockImageUrl) {
              setCoverPreview(stockImageUrl);
              setCoverFile(null); 
          }
      }

      setIsGenerating(false);
  };

  // --- STANDARD HANDLERS ---

  const toggleDept = (dept: DepartmentType) => {
      setTargetDepts(prev => 
        prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
      );
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        const file = e.target.files[0];
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        setVideoFile(e.target.files[0]);
    }
  };

  const handlePublish = async () => {
    if (!title) return;
    if (!coverFile && !coverPreview) return; 

    setLoading(true);
    setUploadProgress(0);

    try {
        // 1. Determine Cover URL
        let coverUrl = '';
        if (coverFile) {
             coverUrl = await uploadFile(coverFile, 'course_covers');
        } else if (typeof coverPreview === 'string' && coverPreview.startsWith('http')) {
             coverUrl = coverPreview;
        }

        if (!coverUrl) throw new Error("No cover image available");
        
        // 2. Upload Video (if exists)
        let videoUrl = '';
        if (videoFile) {
            videoUrl = await uploadFile(videoFile, 'course_videos', (progress) => {
                setUploadProgress(progress);
            });
        }

        // 3. Construct Steps based on Mode
        let steps = [];
        if (contentMode === 'series' && generatedModules.length > 0) {
            // Map generated modules to steps
            steps = generatedModules.map((mod, idx) => ({
                id: `step_${idx}`,
                type: 'video', // Default to video placeholder
                title: mod.title,
                description: mod.description,
                videoUrl: videoUrl || undefined, // Use same video for demo, or logic to prompt for more
                posterUrl: coverUrl
            }));
        } else {
            // Single Mode
            steps = [{
                id: 'step1',
                type: 'video',
                title: title,
                description: description,
                videoUrl: videoUrl,
                posterUrl: coverUrl
            }];
        }

        // 4. Save Course Data
        const newCourse: Omit<Course, 'id'> = {
            categoryId: category,
            title,
            description,
            thumbnailUrl: coverUrl,
            videoUrl,
            duration: contentMode === 'single' ? 1 : 15, // 1 min for single, 15 for series
            xpReward: contentMode === 'single' ? 50 : 150,
            isFeatured: false,
            ...(targetDepts.length > 0 ? { targetDepartments: targetDepts } : {}),
            steps: steps as any
        };

        const docRef = await addDoc(collection(db, 'courses'), newCourse);

        // 5. Notify
        if (targetDepts.length > 0) {
            for (const dept of targetDepts) {
                await notifyDepartment(dept, "Yeni Eğitim", `"${title}" eklendi.`, `/course/${docRef.id}`);
            }
        } else {
             await notifyDepartment('all', "Yeni İçerik", `"${title}" yayında.`, `/course/${docRef.id}`);
        }
        
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setMagicPrompt('');
            setTitle('');
            setDescription('');
            setCoverPreview(null);
            setCoverFile(null);
            setGeneratedModules([]);
        }, 3000);

    } catch (error) {
        console.error("Publish error", error);
        alert("Yükleme sırasında hata oluştu: " + (error as any).message);
    } finally {
        setLoading(false);
    }
  };

  if (success) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6"
              >
                  <CheckCircle2 className="w-12 h-12" />
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-800">Yayında!</h2>
              <p className="text-gray-500 mt-2">İçerik başarıyla yüklendi.</p>
              <button 
                onClick={() => setSuccess(false)}
                className="mt-8 bg-gray-800 text-white px-8 py-3 rounded-xl font-bold"
              >
                  Yeni İçerik Ekle
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">İçerik Stüdyosu</h1>
            <p className="text-gray-500">Yapay zeka ile eğitim veya duyuru oluşturun.</p>
        </div>
        
        {/* MODE SWITCHER */}
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
            <button 
                onClick={() => setContentMode('single')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${contentMode === 'single' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Smartphone className="w-4 h-4" /> Tekli Gönderi
            </button>
            <button 
                onClick={() => setContentMode('series')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${contentMode === 'series' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Layers className="w-4 h-4" /> Eğitim Serisi
            </button>
        </div>
      </div>

      {/* --- MAGIC MODE SECTION --- */}
      <div className={`rounded-3xl p-1 shadow-xl mb-8 transition-colors duration-500 ${contentMode === 'single' ? 'bg-gradient-to-r from-pink-500 to-orange-400' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
          <div className="bg-white/10 backdrop-blur-md rounded-[22px] p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                      <Sparkles className="w-6 h-6 text-yellow-300" />
                  </div>
                  <h2 className="text-xl font-bold">
                      {contentMode === 'single' ? 'Hızlı İçerik Üretici' : 'Müfredat Tasarımcısı'}
                  </h2>
                  <span className="bg-white/20 text-xs font-bold px-2 py-0.5 rounded ml-auto">GEMINI 3 PRO</span>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                      <textarea 
                          value={magicPrompt}
                          onChange={(e) => setMagicPrompt(e.target.value)}
                          placeholder={contentMode === 'single' 
                            ? "Ne hakkında bir gönderi hazırlamak istiyorsun? (Örn: Bugünün menüsü, havuz kuralları)"
                            : "Eğitim konusu nedir? (Örn: Lüks hizmet standartları, şikayet yönetimi)"
                          }
                          className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/50 focus:outline-none focus:bg-black/30 resize-none"
                      />
                  </div>
                  <div className="flex flex-col gap-3 min-w-[200px]">
                      <select 
                        value={magicLang}
                        onChange={(e) => setMagicLang(e.target.value)}
                        className="bg-black/20 border border-white/10 text-white rounded-xl p-3 focus:outline-none"
                      >
                          <option value="Turkish">Türkçe</option>
                          <option value="English">English</option>
                          <option value="Russian">Russian</option>
                      </select>
                      
                      <button 
                          onClick={handleMagicGenerate}
                          disabled={isGenerating || !magicPrompt}
                          className="flex-1 bg-white text-purple-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      >
                          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                          {isGenerating ? 'Düşünülüyor...' : 'Oluştur'}
                      </button>
                  </div>
              </div>
              
              <div className="flex items-center gap-4 mt-4 text-xs text-white/60">
                  <button className="flex items-center gap-1 hover:text-white transition-colors">
                      <FileText className="w-4 h-4" /> Doküman Yükle (PDF/Word)
                  </button>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: MEDIA */}
          <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Cover Upload */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                      {contentMode === 'single' ? 'Gönderi Görseli' : 'Kapak Görseli'}
                  </label>
                  <label className="relative aspect-[3/4] bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden group">
                      {coverPreview ? (
                          <>
                            <img src={coverPreview} className="w-full h-full object-cover" alt="Cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">Değiştir</div>
                          </>
                      ) : (
                          <>
                             <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                             <span className="text-xs text-gray-500 font-bold uppercase">Görsel Seç</span>
                          </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                  </label>
              </div>

              {/* Video Upload (Optional for Single) */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                      Video / Medya {contentMode === 'single' && '(Opsiyonel)'}
                  </label>
                  <label className="relative h-32 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors px-4 text-center">
                      {videoFile ? (
                          <div className="flex items-center gap-2 text-primary font-bold">
                              <Film className="w-5 h-5" />
                              <span className="truncate max-w-[150px]">{videoFile.name}</span>
                          </div>
                      ) : (
                          <>
                             <Upload className="w-8 h-8 text-gray-400 mb-2" />
                             <span className="text-xs text-gray-500">Dosya Yükle</span>
                          </>
                      )}
                      <input type="file" accept="video/mp4" className="hidden" onChange={handleVideoSelect} />
                  </label>
              </div>
          </div>

          {/* RIGHT COLUMN: DETAILS */}
          <div className="lg:col-span-2 flex flex-col gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              
              {/* Title & Desc */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Başlık</label>
                  <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
                    placeholder="Örn: Latte Art Teknikleri"
                  />
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Açıklama</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={contentMode === 'single' ? 6 : 3}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    placeholder="İçerik detayı..."
                  />
              </div>

              {/* Auto-Generated Modules Preview (Only for Series) */}
              {contentMode === 'series' && generatedModules.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Otomatik Oluşturulan Modüller</label>
                      <div className="space-y-2">
                          {generatedModules.map((mod, idx) => (
                              <div key={idx} className="flex gap-2 text-sm">
                                  <span className="font-bold text-primary shrink-0">{idx+1}.</span>
                                  <div>
                                      <span className="font-bold text-gray-700">{mod.title}</span>
                                      <p className="text-gray-500 text-xs line-clamp-1">{mod.description}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Targeting */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Hedef Departman</label>
                  <div className="flex flex-wrap gap-2">
                      {['housekeeping', 'kitchen', 'front_office', 'management'].map(d => (
                          <button
                            key={d}
                            onClick={() => toggleDept(d as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors border ${
                                targetDepts.includes(d as any)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-primary'
                            }`}
                          >
                              {d.replace('_', ' ')}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="h-px bg-gray-100 my-2" />

              {/* Publish Button */}
              <button 
                onClick={handlePublish}
                disabled={loading || !title || (!coverFile && !coverPreview)}
                className="w-full bg-primary disabled:bg-gray-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
              >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {loading ? 'Yükleniyor...' : contentMode === 'single' ? 'Gönderiyi Paylaş' : 'Eğitimi Yayınla'}
              </button>

          </div>
      </div>
    </div>
  );
};
