
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, FileText, Link, Type, Loader2, Play, 
    CheckCircle2, Save, RotateCcw, Smartphone, Image as ImageIcon,
    Settings, Globe, Lock, ChevronRight, Upload, Edit, FileType, User, Building2
} from 'lucide-react';
import { generateMicroCourse } from '../../services/geminiService';
import { publishContent } from '../../services/courseService';
import { updateCourse } from '../../services/db';
import { uploadFile } from '../../services/storage';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { StoryCard, Course, CourseVisibility, AuthorType } from '../../types';
import { useLocation, useNavigate } from 'react-router-dom';

const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const pdfjsLib = await import('https://esm.sh/pdfjs-dist@3.11.174');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 10);
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return fullText;
    } catch (e) { return ""; }
};

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [stage, setStage] = useState<'INPUT' | 'GENERATING' | 'PREVIEW' | 'SETTINGS' | 'PUBLISHED'>('INPUT');
  
  const [inputType, setInputType] = useState<'TEXT' | 'URL' | 'PDF'>('TEXT');
  const [sourceText, setSourceText] = useState('');
  const [topic, setTopic] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  
  const [generatedCourse, setGeneratedCourse] = useState<{
      title: string;
      description: string;
      cards: StoryCard[];
      tags: string[];
  } | null>(null);

  const [visibility, setVisibility] = useState<CourseVisibility>('PUBLIC');
  const [category, setCategory] = useState('cat_onboarding');
  const [coverImage, setCoverImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [ownerType, setOwnerType] = useState<AuthorType>('ORGANIZATION'); 

  useEffect(() => {
      if (location.state?.courseData) {
          const course = location.state.courseData as Course;
          setIsEditing(true);
          setEditCourseId(course.id);
          setGeneratedCourse({ title: course.title, description: course.description, cards: course.steps, tags: course.tags || [] });
          setVisibility(course.visibility);
          setCategory(course.categoryId);
          setCoverImage(course.thumbnailUrl);
          setOwnerType(course.authorType || 'ORGANIZATION');
          setStage('PREVIEW');
      }
  }, [location.state]);

  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handleMagicGenerate = async () => {
      if (!sourceText && !topic) return;
      setStage('GENERATING');
      const result = await generateMicroCourse(`TOPIC: ${topic}\n\nCONTENT:\n${sourceText}`, { targetAudience: 'Staff', tone: 'FUN', language: 'Turkish' });
      if (result) {
          setGeneratedCourse(result);
          setCoverImage(result.cards[0].mediaUrl || '');
          setStage('PREVIEW');
      } else {
          alert("Üretim hatası!");
          setStage('INPUT');
      }
  };

  const handleFinalize = async () => {
      if (!generatedCourse || !currentUser) return;
      
      const courseData: any = {
          title: generatedCourse.title,
          description: generatedCourse.description,
          thumbnailUrl: coverImage,
          duration: Math.ceil(generatedCourse.cards.reduce((acc, c) => acc + c.duration, 0) / 60),
          steps: generatedCourse.cards,
          tags: generatedCourse.tags,
          visibility,
          categoryId: category,
          organizationId: currentOrganization?.id,
          ownerType, // Servis katmanında authorId'yi belirlemek için kullanılır
          xpReward: 500,
          priority: 'NORMAL',
          price: 0,
          priceType: 'FREE'
      };

      const success = isEditing ? await updateCourse(editCourseId!, courseData) : await publishContent(courseData, currentUser);
      if (success) setStage('PUBLISHED');
      else alert("İşlem başarısız.");
  };

  if (stage === 'PUBLISHED') return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="w-10 h-10" /></div>
          <h2 className="text-2xl font-bold text-gray-800">İçerik Hazır!</h2>
          <div className="flex gap-3 mt-8">
              <button onClick={() => navigate('/admin/courses')} className="bg-gray-100 px-6 py-3 rounded-xl font-bold">Listeye Dön</button>
              <button onClick={() => window.location.reload()} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Yeni Oluştur</button>
          </div>
      </div>
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-8">
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {isEditing ? <Edit className="w-6 h-6" /> : <Wand2 className="w-6 h-6 text-accent" />}
                {isEditing ? 'Düzenle' : 'Sihirli Stüdyo'}
            </h1>

            {stage === 'INPUT' && (
                <div className="space-y-6">
                    <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Eğitim Konusu..." className="w-full p-4 border-2 border-gray-100 rounded-xl font-bold text-gray-800" />
                    <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder="Kaynak metin..." className="w-full p-4 border-2 border-gray-100 rounded-xl h-40" />
                    <button onClick={handleMagicGenerate} disabled={!topic} className="w-full bg-accent text-primary py-4 rounded-xl font-bold shadow-lg shadow-accent/20">Sihirli Oluştur</button>
                </div>
            )}

            {stage === 'GENERATING' && <div className="flex flex-col items-center justify-center h-full"><Loader2 className="w-12 h-12 animate-spin text-accent" /><p className="mt-4 font-bold text-gray-500">AI Kursu İnşa Ediyor...</p></div>}

            {stage === 'PREVIEW' && generatedCourse && (
                <div className="space-y-6">
                    <div className="p-4 bg-green-50 rounded-xl text-green-700 font-bold border border-green-100 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> İçerik Oluşturuldu. Kartları inceleyin.</div>
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-auto">
                        {generatedCourse.cards.map((c, i) => (
                            <div key={i} onClick={() => setActiveCardIndex(i)} className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${activeCardIndex === i ? 'border-primary bg-primary/5' : 'border-gray-100'}`}>{c.title}</div>
                        ))}
                    </div>
                    <button onClick={() => setStage('SETTINGS')} className="w-full bg-primary text-white py-4 rounded-xl font-bold">Ayarlara Geç</button>
                </div>
            )}

            {stage === 'SETTINGS' && (
                <div className="space-y-6">
                    {/* YAYINLAYIN KİMLİĞİ SEÇİMİ */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Kim Paylaşıyor?</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOwnerType('ORGANIZATION')} className={`p-3 rounded-xl border-2 flex items-center gap-2 ${ownerType === 'ORGANIZATION' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100'}`}>
                                <Building2 className="w-4 h-4" /> {currentOrganization?.name}
                            </button>
                            <button onClick={() => setOwnerType('USER')} className={`p-3 rounded-xl border-2 flex items-center gap-2 ${ownerType === 'USER' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100'}`}>
                                <User className="w-4 h-4" /> Şahsi Profil
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Görünürlük</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setVisibility('PUBLIC')} className={`p-3 rounded-xl border-2 flex items-center gap-2 ${visibility === 'PUBLIC' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-100'}`}><Globe className="w-4 h-4" /> Herkese Açık</button>
                            <button onClick={() => setVisibility('PRIVATE')} className={`p-3 rounded-xl border-2 flex items-center gap-2 ${visibility === 'PRIVATE' ? 'border-gray-800 bg-gray-50 text-gray-800' : 'border-gray-100'}`}><Lock className="w-4 h-4" /> Kurum İçi</button>
                        </div>
                    </div>

                    <button onClick={handleFinalize} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-xl">Yayınla / Kaydet</button>
                    <button onClick={() => setStage('PREVIEW')} className="w-full py-2 text-gray-400 font-bold">Geri Dön</button>
                </div>
            )}
        </div>

        {/* PHONE PREVIEW */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-100 rounded-[3rem] border border-gray-200 shadow-inner p-8">
            <div className="w-[300px] h-[600px] bg-black rounded-[2.5rem] border-[8px] border-gray-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-2 left-0 right-0 flex gap-1 px-2 z-20">
                    {generatedCourse?.cards.map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= activeCardIndex ? 'bg-white' : 'bg-white/30'}`} />
                    ))}
                </div>
                {generatedCourse && (
                    <div className="w-full h-full relative">
                        <img src={generatedCourse.cards[activeCardIndex].mediaUrl} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                        <div className="absolute bottom-10 left-0 right-0 p-6 text-white">
                            <h3 className="text-xl font-bold mb-2">{generatedCourse.cards[activeCardIndex].title}</h3>
                            <p className="text-sm opacity-80">{generatedCourse.cards[activeCardIndex].content}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
