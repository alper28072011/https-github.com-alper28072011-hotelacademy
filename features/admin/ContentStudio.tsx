
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, ChevronRight, Upload, CheckCircle2, Save, Loader2, 
    Link, FileText, BrainCircuit, Baby, GraduationCap, Zap,
    Layout, Sparkles, MessageSquare, ArrowLeft, RefreshCw,
    GripVertical, X, Trash2, Plus, Play, Edit3
} from 'lucide-react';
import { generateCurriculum, generateMagicCourse, translateContent } from '../../services/geminiService';
import { publishContent } from '../../services/courseService';
import { updateCourse } from '../../services/db';
import { extractTextFromPDF } from '../../utils/fileHelpers';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { ContentGenerationConfig, GeneratedModule, Course, StoryCard, LocalizedString, PedagogyMode } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { SortableList } from '../../components/ui/SortableList';

type WizardStep = 1 | 2 | 3 | 4;

const FADE_IN = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // --- STATE ---
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Config
  const [config, setConfig] = useState<ContentGenerationConfig>({
      sourceType: 'TEXT_PROMPT',
      sourceContent: '',
      targetAudience: 'Yeni Başlayan Personel',
      language: 'Turkish',
      targetLanguages: ['tr'], // en is base
      difficulty: 'BEGINNER',
      pedagogy: 'STANDARD',
      tone: 'CASUAL',
      length: 'SHORT'
  });

  // Data
  const [curriculum, setCurriculum] = useState<GeneratedModule[]>([]);
  const [courseData, setCourseData] = useState<any>(null); // Full Course Object
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState('en');

  // Input Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INIT FOR EDIT MODE ---
  useEffect(() => {
      if (location.state?.courseData) {
          const existingCourse = location.state.courseData;
          // Hydrate state for editing
          setCourseData({
              ...existingCourse,
              cards: existingCourse.steps || []
          });
          setConfig(existingCourse.config || config);
          if (existingCourse.steps?.length > 0) setActiveCardId(existingCourse.steps[0].id);
          setStep(4); // Jump to editor
      }
  }, [location.state]);

  // --- ACTIONS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setLoading(true);
          try {
              const text = await extractTextFromPDF(e.target.files[0]);
              setConfig({ ...config, sourceType: 'PDF_UPLOAD', sourceContent: text });
          } catch (err) {
              alert("PDF okunamadı.");
          } finally {
              setLoading(false);
          }
      }
  };

  const generateOutline = async () => {
      if (!config.sourceContent) return alert("Lütfen bir kaynak girin.");
      setLoading(true);
      setLoadingText("Pedagojik analiz yapılıyor...");
      const modules = await generateCurriculum(config);
      setCurriculum(modules);
      setLoading(false);
      setStep(3);
  };

  const generateFullCourse = async () => {
      setLoading(true);
      setLoadingText("İçerik, görseller ve sınavlar üretiliyor...");
      const course = await generateMagicCourse(config, curriculum);
      if (course) {
          setCourseData(course);
          if (course.cards.length > 0) setActiveCardId(course.cards[0].id);
          setStep(4);
      } else {
          alert("Üretim başarısız.");
      }
      setLoading(false);
  };

  const handlePublish = async () => {
      if (!courseData || !currentUser) return;
      setLoading(true);
      setLoadingText("İçerik kaydediliyor ve yayınlanıyor...");

      try {
          // Construct Payload
          // Note: duration must be a number. AI sometimes returns string or undefined.
          const finalDuration = typeof courseData.duration === 'number' ? courseData.duration : 5;

          const payload = {
              ...courseData,
              duration: finalDuration,
              steps: courseData.cards, // Map cards to steps
              channelId: currentOrganization?.channels?.[0]?.id, // Default to first channel
              organizationId: currentOrganization?.id,
              visibility: 'PRIVATE',
              xpReward: 100,
              price: 0,
              // IMPORTANT: Explicitly set owner info so it's not treated as a User post
              authorType: 'ORGANIZATION',
              ownerType: 'ORGANIZATION', 
              config: config
          };

          let success = false;

          if (courseData.id) {
              // Update Mode
              success = await updateCourse(courseData.id, payload);
          } else {
              // Create Mode
              success = await publishContent(payload, currentUser);
          }
          
          if (success) {
              navigate('/admin/courses');
          } else {
              alert("Yayınlama işlemi başarısız oldu. Lütfen verilerinizi kontrol edip tekrar deneyin.");
          }
      } catch (error) {
          console.error("Critical Publish Error:", error);
          alert("Beklenmedik bir hata oluştu.");
      } finally {
          setLoading(false);
      }
  };

  // --- RENDERERS ---

  const renderStep1_Source = () => (
      <div className="bg-white border border-[#d8dfea] p-4 min-h-[400px]">
          <h2 className="text-sm font-bold text-[#333] border-b border-[#d8dfea] pb-2 mb-4">Adım 1: Kaynak Seçimi</h2>
          
          <div className="flex gap-4 mb-4">
              {[
                  { id: 'TEXT_PROMPT', icon: Wand2, label: 'Yapay Zeka', desc: 'Konuyu yaz.' },
                  { id: 'PDF_UPLOAD', icon: FileText, label: 'PDF Dosyası', desc: 'Dosya yükle.' },
                  { id: 'WEB_URL', icon: Link, label: 'Web Linki', desc: 'URL yapıştır.' }
              ].map((opt) => (
                  <button 
                      key={opt.id}
                      onClick={() => setConfig({ ...config, sourceType: opt.id as any, sourceContent: '' })}
                      className={`flex-1 p-3 border text-left transition-all ${
                          config.sourceType === opt.id 
                          ? 'bg-[#d8dfea] border-[#3b5998]' 
                          : 'bg-white border-[#ccc] hover:bg-[#f7f7f7]'
                      }`}
                  >
                      <div className="flex items-center gap-2 mb-1">
                          <opt.icon className="w-4 h-4 text-[#3b5998]" />
                          <span className="font-bold text-xs text-[#333]">{opt.label}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">{opt.desc}</div>
                  </button>
              ))}
          </div>

          <div className="mb-4">
              {config.sourceType === 'PDF_UPLOAD' ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#ccc] bg-[#f7f7f7] p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-[#eff0f5]"
                  >
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-xs font-bold text-gray-600">{loading ? 'Analiz Ediliyor...' : config.sourceContent ? 'Dosya Hazır' : 'PDF Yüklemek İçin Tıkla'}</p>
                      {config.sourceContent && <span className="text-[10px] text-green-600 mt-1 font-bold">Metin Çıkarıldı</span>}
                  </div>
              ) : (
                  <textarea 
                      value={config.sourceContent}
                      onChange={e => setConfig({ ...config, sourceContent: e.target.value })}
                      placeholder={config.sourceType === 'WEB_URL' ? "https://..." : "Örn: Housekeeping departmanı için oda temizliği standartları..."}
                      className="w-full h-40 p-2 border border-[#bdc7d8] text-sm focus:border-[#3b5998] outline-none font-sans"
                  />
              )}
          </div>

          <div className="flex justify-end">
              <button 
                  onClick={() => setStep(2)}
                  disabled={!config.sourceContent || loading}
                  className="bg-[#3b5998] text-white px-4 py-1.5 text-[11px] font-bold border border-[#29447e] cursor-pointer disabled:opacity-50"
              >
                  Devam Et
              </button>
          </div>
      </div>
  );

  const renderStep2_Engineering = () => (
      <div className="bg-white border border-[#d8dfea] p-4 min-h-[400px]">
          <h2 className="text-sm font-bold text-[#333] border-b border-[#d8dfea] pb-2 mb-4 flex justify-between">
              <span>Adım 2: Öğrenme Mühendisliği</span>
              <button onClick={() => setStep(1)} className="text-[10px] font-normal text-[#3b5998] hover:underline">Geri Dön</button>
          </h2>

          <div className="space-y-4 max-w-lg">
              <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Hedef Kitle</label>
                  <input 
                      value={config.targetAudience}
                      onChange={e => setConfig({ ...config, targetAudience: e.target.value })}
                      className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none"
                      placeholder="Örn: Stajyer Garsonlar"
                  />
              </div>

              <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Öğretim Metodu</label>
                  <select 
                      className="w-full border border-[#bdc7d8] p-1.5 text-sm focus:border-[#3b5998] outline-none bg-white"
                      value={config.pedagogy}
                      onChange={e => setConfig({...config, pedagogy: e.target.value as any})}
                  >
                      <option value="STANDARD">Standart Anlatım</option>
                      <option value="FEYNMAN">Feynman Tekniği (Basitleştirilmiş)</option>
                      <option value="ACTIVE_RECALL">Aktif Geri Çağırma (Soru Odaklı)</option>
                      <option value="SOCRATIC">Sokratik Metot (Sorgulayıcı)</option>
                  </select>
              </div>

              <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">Eğitim Tonu</label>
                  <div className="flex gap-2">
                      {['PROFESSIONAL', 'FRIENDLY', 'HUMOROUS'].map(tone => (
                          <button 
                              key={tone}
                              onClick={() => setConfig({ ...config, tone: tone as any })}
                              className={`px-3 py-1 text-[10px] border ${config.tone === tone ? 'bg-[#3b5998] text-white border-[#29447e]' : 'bg-white text-gray-600 border-[#ccc]'}`}
                          >
                              {tone}
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          <div className="mt-6 border-t border-[#d8dfea] pt-4 flex justify-end">
              <button 
                  onClick={generateOutline}
                  disabled={loading}
                  className="bg-[#3b5998] text-white px-4 py-1.5 text-[11px] font-bold border border-[#29447e] cursor-pointer"
              >
                  {loading ? 'İşleniyor...' : 'Müfredatı Tasarla'}
              </button>
          </div>
      </div>
  );

  const renderStep3_Outline = () => (
      <div className="bg-white border border-[#d8dfea] p-4 min-h-[400px]">
          <h2 className="text-sm font-bold text-[#333] border-b border-[#d8dfea] pb-2 mb-4 flex justify-between">
              <span>Adım 3: Müfredat Onayı</span>
              <button onClick={() => setStep(2)} className="text-[10px] font-normal text-[#3b5998] hover:underline">Ayarları Değiştir</button>
          </h2>

          <div className="space-y-3 mb-6">
              {curriculum.map((module, idx) => (
                  <div key={module.id} className="border border-[#d8dfea] bg-[#f7f7f7] p-3">
                      <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-xs text-[#3b5998]">
                              {idx + 1}. {module.title}
                          </h3>
                          <button onClick={() => setCurriculum(curriculum.filter(m => m.id !== module.id))} className="text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <p className="text-[11px] text-gray-600 mb-2">{module.description}</p>
                      <div className="flex flex-wrap gap-1">
                          {module.keyPoints.map((pt, i) => (
                              <span key={i} className="text-[9px] bg-white border border-[#ccc] px-1.5 py-0.5 text-gray-500">
                                  {pt}
                              </span>
                          ))}
                      </div>
                  </div>
              ))}
          </div>

          <div className="flex justify-end">
              <button 
                  onClick={generateFullCourse}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-1.5 text-[11px] font-bold border border-green-700 cursor-pointer"
              >
                  {loading ? 'İçerik Üretiliyor...' : 'İçeriği Oluştur'}
              </button>
          </div>
      </div>
  );

  const renderStep4_Production = () => {
      const activeCard = courseData?.cards.find((c: StoryCard) => c.id === activeCardId);
      
      return (
          <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)]">
              {/* Sidebar: Slide List */}
              <div className="w-full md:w-64 bg-white border border-[#d8dfea] flex flex-col h-full">
                  <div className="bg-[#f7f7f7] p-2 border-b border-[#d8dfea] font-bold text-xs text-[#333]">Slayt Akışı</div>
                  <div className="flex-1 overflow-y-auto p-2">
                      <SortableList 
                          items={courseData?.cards || []}
                          onOrderChange={(items) => setCourseData({...courseData, cards: items})}
                          renderItem={({ item: card, dragListeners }) => (
                              <div 
                                  onClick={() => setActiveCardId(card.id)}
                                  className={`p-2 mb-1 border cursor-pointer flex gap-2 items-center ${activeCardId === card.id ? 'bg-[#d8dfea] border-[#999]' : 'bg-white border-[#e9e9e9] hover:bg-[#f7f7f7]'}`}
                              >
                                  <div {...dragListeners} className="cursor-grab text-gray-400"><GripVertical className="w-3 h-3" /></div>
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-[11px] truncate text-[#3b5998]">{card.title['en']}</div>
                                      <div className="text-[9px] text-gray-500">{card.type}</div>
                                  </div>
                              </div>
                          )}
                      />
                  </div>
                  <div className="p-2 border-t border-[#d8dfea] bg-[#f7f7f7]">
                      <button onClick={handlePublish} disabled={loading} className="w-full bg-[#3b5998] text-white py-1 text-[11px] font-bold border border-[#29447e]">
                          {loading ? <Loader2 className="animate-spin inline w-3 h-3" /> : 'Yayınla / Kaydet'}
                      </button>
                  </div>
              </div>

              {/* Editor Canvas */}
              <div className="flex-1 bg-white border border-[#d8dfea] p-4 flex flex-col overflow-y-auto">
                  {activeCard ? (
                      <div className="flex flex-col gap-4">
                          <div className="bg-[#333] w-full aspect-video flex items-center justify-center relative overflow-hidden border border-black">
                              <img src={activeCard.mediaUrl} className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 p-6 flex flex-col justify-end text-white bg-gradient-to-t from-black/90 to-transparent">
                                  <h2 className="font-bold text-xl mb-1">{activeCard.title['en']}</h2>
                                  <p className="text-xs opacity-80">{activeCard.content['en']}</p>
                              </div>
                          </div>
                          
                          {/* Edit Form */}
                          <div className="border-t border-[#d8dfea] pt-4">
                              <div className="flex justify-between mb-2">
                                  <h3 className="font-bold text-[#333] text-sm flex items-center gap-1"><Edit3 className="w-3 h-3" /> Kart Düzenle</h3>
                                  <select className="border border-[#bdc7d8] text-[10px] p-1" value={activeLang} onChange={e => setActiveLang(e.target.value)}>
                                      <option value="en">English (Master)</option>
                                      <option value="tr">Turkish</option>
                                  </select>
                              </div>
                              
                              <div className="space-y-2">
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Başlık</label>
                                      <input 
                                          className="w-full p-1 border border-[#bdc7d8] text-sm font-bold"
                                          value={activeCard.title['en']} // Mock: Should be dynamic lang
                                          onChange={e => {
                                              const newCards = courseData.cards.map((c: any) => c.id === activeCardId ? {...c, title: {...c.title, en: e.target.value}} : c);
                                              setCourseData({...courseData, cards: newCards});
                                          }}
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 block mb-0.5">İçerik</label>
                                      <textarea 
                                          className="w-full h-24 p-1 border border-[#bdc7d8] text-sm font-sans"
                                          value={activeCard.content['en']}
                                          onChange={e => {
                                              const newCards = courseData.cards.map((c: any) => c.id === activeCardId ? {...c, content: {...c.content, en: e.target.value}} : c);
                                              setCourseData({...courseData, cards: newCards});
                                          }}
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                          Soldan bir slayt seçin.
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="font-sans text-[#333]">
        {/* HEADER Title for Wizard */}
        {step < 4 && (
            <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-3 mb-4">
                <h1 className="text-sm font-bold text-[#333]">İçerik Stüdyosu</h1>
                <p className="text-sm text-gray-500">Yapay zeka destekli eğitim hazırlama aracı.</p>
            </div>
        )}

        {/* LOADING OVERLAY */}
        <AnimatePresence>
            {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-[1px]">
                    <Loader2 className="w-8 h-8 text-[#3b5998] animate-spin mb-2" />
                    <h3 className="text-sm font-bold text-[#333]">{loadingText}</h3>
                </motion.div>
            )}
        </AnimatePresence>

        {/* CONTENT AREA */}
        <div>
            {step === 1 && renderStep1_Source()}
            {step === 2 && renderStep2_Engineering()}
            {step === 3 && renderStep3_Outline()}
            {step === 4 && renderStep4_Production()}
        </div>
    </div>
  );
};
