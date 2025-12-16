
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, FileText, Link, Type, Loader2, Play, 
    CheckCircle2, Save, RotateCcw, Smartphone, Image as ImageIcon,
    Settings, Globe, Lock, ChevronRight, Upload, Edit, FileType
} from 'lucide-react';
import { generateMicroCourse } from '../../services/geminiService';
import { publishContent } from '../../services/courseService';
import { updateCourse } from '../../services/db';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { StoryCard, Course, CourseVisibility } from '../../types';
import { useLocation, useNavigate } from 'react-router-dom';

// FIX 5: PDF Extraction Logic via CDN to avoid local node_modules dependency issues
const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        // Dynamically import from CDN
        const pdfjsLib = await import('https://esm.sh/pdfjs-dist@3.11.174');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        // Limit to first 10 pages to avoid huge payloads
        const maxPages = Math.min(pdf.numPages, 10);
        
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        return fullText;
    } catch (e) {
        console.error("PDF Extraction Failed:", e);
        return "";
    }
};

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Mode: CREATE vs EDIT
  const [isEditing, setIsEditing] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);

  // STAGE: 'INPUT' -> 'GENERATING' -> 'PREVIEW' -> 'SETTINGS' -> 'PUBLISHED'
  const [stage, setStage] = useState<'INPUT' | 'GENERATING' | 'PREVIEW' | 'SETTINGS' | 'PUBLISHED'>('INPUT');
  
  // INPUT STATE
  const [inputType, setInputType] = useState<'TEXT' | 'URL' | 'PDF'>('TEXT');
  const [sourceText, setSourceText] = useState('');
  const [topic, setTopic] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  
  // GENERATED DATA
  const [generatedCourse, setGeneratedCourse] = useState<{
      title: string;
      description: string;
      cards: StoryCard[];
      tags: string[];
  } | null>(null);

  // SETTINGS STATE
  const [visibility, setVisibility] = useState<CourseVisibility>('PUBLIC');
  const [category, setCategory] = useState('cat_onboarding');
  const [coverImage, setCoverImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // INITIALIZE FOR EDIT MODE
  useEffect(() => {
      if (location.state?.courseData) {
          const course = location.state.courseData as Course;
          setIsEditing(true);
          setEditCourseId(course.id);
          setGeneratedCourse({
              title: course.title,
              description: course.description,
              cards: course.steps,
              tags: course.tags || []
          });
          setVisibility(course.visibility);
          setCategory(course.categoryId);
          setCoverImage(course.thumbnailUrl);
          setStage('PREVIEW'); // Skip generation
      }
  }, [location.state]);

  // PREVIEW STATE
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // AI SETTINGS
  const [targetAudience, setTargetAudience] = useState('New Staff');
  const [tone, setTone] = useState<'PROFESSIONAL' | 'FUN'>('FUN');

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsExtracting(true);
          const text = await extractTextFromPDF(e.target.files[0]);
          setSourceText(text);
          if (!text) alert("PDF okunamadı veya metin içermiyor.");
          setIsExtracting(false);
      }
  };

  const handleMagicGenerate = async () => {
      if (!sourceText && !topic) return;
      setStage('GENERATING');

      // Combine Topic + Source for context
      const fullContext = `TOPIC: ${topic}\n\nCONTENT:\n${sourceText}`;

      const result = await generateMicroCourse(fullContext, {
          targetAudience,
          tone,
          language: 'Turkish' 
      });

      if (result) {
          setGeneratedCourse(result);
          setCoverImage(result.cards[0].mediaUrl || '');
          setStage('PREVIEW');
      } else {
          alert("AI Üretimi Başarısız Oldu. Lütfen tekrar deneyin.");
          setStage('INPUT');
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setIsUploading(true);
          try {
              const url = await uploadFile(e.target.files[0], 'course_covers');
              setCoverImage(url);
          } catch (error) {
              console.error("Upload failed", error);
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handleFinalize = async () => {
      if (!generatedCourse || !currentUser) return;
      
      const courseData: any = {
          title: generatedCourse.title,
          description: generatedCourse.description,
          thumbnailUrl: coverImage || 'https://via.placeholder.com/400',
          duration: Math.ceil(generatedCourse.cards.reduce((acc, c) => acc + c.duration, 0) / 60),
          steps: generatedCourse.cards,
          tags: generatedCourse.tags,
          visibility: visibility,
          categoryId: category,
          
          // Defaults for new items
          organizationId: currentOrganization?.id,
          authorId: currentUser.id,
          ownerType: currentOrganization ? 'ORGANIZATION' : 'USER',
          xpReward: 500,
          priority: 'NORMAL',
          price: 0,
          priceType: 'FREE'
      };

      let success = false;

      if (isEditing && editCourseId) {
          // Update Mode
          success = await updateCourse(editCourseId, courseData);
      } else {
          // Create Mode
          success = await publishContent(courseData, currentUser);
      }

      if (success) {
          setStage('PUBLISHED');
      } else {
          alert("İşlem başarısız oldu.");
      }
  };

  if (stage === 'PUBLISHED') {
      return (
          <div className="flex flex-col items-center justify-center h-[80vh] animate-in zoom-in">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                  <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800">İşlem Tamam!</h2>
              <p className="text-gray-500 mt-2">İçerik başarıyla {isEditing ? 'güncellendi' : 'yayınlandı'}.</p>
              <div className="flex gap-4 mt-8">
                  <button onClick={() => navigate('/admin/courses')} className="bg-gray-100 px-6 py-3 rounded-xl font-bold text-gray-700">Listeye Dön</button>
                  <button onClick={() => window.location.reload()} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Yeni Oluştur</button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] gap-8">
        
        {/* LEFT PANEL: CONTROLS */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
            
            <div className="mb-2">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {isEditing ? <Edit className="w-6 h-6 text-accent" /> : <Wand2 className="w-6 h-6 text-accent" />}
                    {isEditing ? 'İçerik Düzenle' : 'Sihirli Stüdyo'}
                </h1>
                <p className="text-gray-500 text-sm">Ham içeriği saniyeler içinde etkileşimli bir Story serisine dönüştürün.</p>
            </div>

            {stage === 'INPUT' && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-left-4">
                    {/* Source Selector */}
                    <div className="bg-gray-50 p-1 rounded-xl flex gap-1">
                        <button onClick={() => setInputType('TEXT')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${inputType === 'TEXT' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>
                            <Type className="w-4 h-4" /> Metin
                        </button>
                        <button onClick={() => setInputType('URL')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${inputType === 'URL' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>
                            <Link className="w-4 h-4" /> Link
                        </button>
                        <button onClick={() => setInputType('PDF')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${inputType === 'PDF' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>
                            <FileType className="w-4 h-4" /> PDF
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
                            
                            {inputType === 'PDF' ? (
                                <div className="w-full h-40 bg-white border-2 border-gray-100 border-dashed rounded-xl flex flex-col items-center justify-center relative cursor-pointer hover:border-accent">
                                    {isExtracting ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
                                            <span className="text-gray-500 text-sm">PDF Analiz Ediliyor...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-gray-600 font-bold text-sm">PDF Yükle</span>
                                            <span className="text-gray-400 text-xs">Maks. 10 sayfa</span>
                                            <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePdfUpload} />
                                        </>
                                    )}
                                </div>
                            ) : (
                                <textarea 
                                    value={sourceText}
                                    onChange={e => setSourceText(e.target.value)}
                                    placeholder={inputType === 'TEXT' ? "Eğitim metnini buraya yapıştırın veya anahtar noktaları yazın..." : "Web sitesi linkini veya PDF metnini buraya yapıştırın..."}
                                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-xl font-medium text-gray-600 focus:border-accent outline-none h-40 resize-none"
                                />
                            )}
                            
                            {sourceText && inputType === 'PDF' && (
                                <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Metin başarıyla alındı ({sourceText.length} karakter)
                                </div>
                            )}
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
                        disabled={!topic || (inputType === 'PDF' && !sourceText)}
                        className="w-full bg-gradient-to-r from-accent to-accent-dark text-primary py-4 rounded-xl font-bold text-lg shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <h3 className="font-bold text-green-800">İçerik Hazır</h3>
                            <p className="text-green-700 text-sm">Kartları inceleyin ve yayın ayarları için devam edin.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Kart Listesi</label>
                        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
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
                        <button onClick={() => isEditing ? navigate('/admin/courses') : setStage('INPUT')} className="flex-1 py-3 border-2 border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Geri
                        </button>
                        <button onClick={() => setStage('SETTINGS')} className="flex-[2] bg-primary text-white py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-primary-light">
                            Devam Et <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {stage === 'SETTINGS' && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-right-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-6 h-6 text-gray-800" />
                        <h2 className="text-xl font-bold text-gray-800">Yayın Ayarları</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Privacy */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Görünürlük</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setVisibility('PUBLIC')}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${visibility === 'PUBLIC' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2 font-bold mb-1"><Globe className="w-4 h-4" /> Herkese Açık</div>
                                    <div className="text-xs opacity-80">Tüm dünyada görülebilir.</div>
                                </button>
                                <button 
                                    onClick={() => setVisibility('PRIVATE')}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${visibility === 'PRIVATE' ? 'border-gray-800 bg-gray-100 text-gray-900' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-2 font-bold mb-1"><Lock className="w-4 h-4" /> Kurum İçi</div>
                                    <div className="text-xs opacity-80">Sadece personel görür.</div>
                                </button>
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Kategori</label>
                            <select 
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-primary"
                            >
                                <option value="cat_onboarding">Oryantasyon</option>
                                <option value="cat_guest">Misafir İlişkileri</option>
                                <option value="cat_kitchen">Mutfak</option>
                                <option value="cat_hk">Kat Hizmetleri</option>
                                <option value="cat_safety">Güvenlik</option>
                            </select>
                        </div>

                        {/* Cover Image */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Kapak Görseli</label>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 group">
                                {coverImage ? (
                                    <img src={coverImage} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                        <ImageIcon className="w-8 h-8" />
                                    </div>
                                )}
                                
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="cursor-pointer bg-white text-gray-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-100">
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        Değiştir
                                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-auto pt-6">
                        <button onClick={() => setStage('PREVIEW')} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">
                            Geri
                        </button>
                        <button onClick={handleFinalize} className="flex-[2] bg-primary text-white py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-primary-light">
                            <Save className="w-4 h-4" /> {isEditing ? 'Güncelle' : 'Yayınla'}
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT PANEL: PHONE SIMULATOR */}
        <div className="flex-1 bg-gray-100 rounded-[2.5rem] p-8 flex items-center justify-center relative overflow-hidden border border-gray-200 shadow-inner">
             {generatedCourse && (stage === 'PREVIEW' || stage === 'SETTINGS') ? (
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
