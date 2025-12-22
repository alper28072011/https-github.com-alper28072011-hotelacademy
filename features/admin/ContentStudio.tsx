
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

const FADE_IN = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };

export const ContentStudio: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  
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
      const payload = {
          ...courseData,
          steps: courseData.cards,
          channelId: currentOrganization?.channels?.[0]?.id, // Default to first channel
          organizationId: currentOrganization?.id,
          visibility: 'PRIVATE',
          xpReward: 100,
          duration: courseData.cards.length,
          price: 0,
          authorType: 'ORGANIZATION',
          config: config
      };
      await publishContent(payload, currentUser);
      navigate('/admin/courses');
  };

  // --- RENDERERS ---

  const renderStep1_Source = () => (
      <motion.div {...FADE_IN} className="max-w-2xl mx-auto w-full">
          <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Nereden Başlayalım?</h2>
          <p className="text-gray-500 text-center mb-8">Eğitim içeriğini oluşturmak için bir kaynak seçin.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                  { id: 'TEXT_PROMPT', icon: Wand2, label: 'Yapay Zeka', desc: 'Konuyu yaz, gerisini bırak.' },
                  { id: 'PDF_UPLOAD', icon: FileText, label: 'PDF Kaynak', desc: 'Dosya yükle ve dönüştür.' },
                  { id: 'WEB_URL', icon: Link, label: 'Web Linki', desc: 'Bir URL yapıştır.' }
              ].map((opt) => (
                  <button 
                      key={opt.id}
                      onClick={() => setConfig({ ...config, sourceType: opt.id as any, sourceContent: '' })}
                      className={`p-6 rounded-2xl border-2 text-left transition-all group ${
                          config.sourceType === opt.id 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                          : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                      }`}
                  >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                          config.sourceType === opt.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:text-primary'
                      }`}>
                          <opt.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-800">{opt.label}</h3>
                      <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  </button>
              ))}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              {config.sourceType === 'PDF_UPLOAD' ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-primary transition-all"
                  >
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                      <Upload className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm font-bold text-gray-600">{loading ? 'Analiz Ediliyor...' : config.sourceContent ? 'Dosya Hazır' : 'PDF Yüklemek İçin Tıkla'}</p>
                      {config.sourceContent && <span className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Metin Çıkarıldı</span>}
                  </div>
              ) : (
                  <textarea 
                      value={config.sourceContent}
                      onChange={e => setConfig({ ...config, sourceContent: e.target.value })}
                      placeholder={config.sourceType === 'WEB_URL' ? "https://..." : "Örn: Housekeeping departmanı için oda temizliği standartları..."}
                      className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary resize-none font-medium"
                  />
              )}
          </div>

          <button 
              onClick={() => setStep(2)}
              disabled={!config.sourceContent || loading}
              className="w-full mt-6 py-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:shadow-none"
          >
              Devam Et <ChevronRight className="w-5 h-5" />
          </button>
      </motion.div>
  );

  const renderStep2_Engineering = () => (
      <motion.div {...FADE_IN} className="max-w-3xl mx-auto w-full">
          <button onClick={() => setStep(1)} className="text-gray-400 font-bold text-sm mb-4 flex items-center gap-1 hover:text-gray-600"><ArrowLeft className="w-4 h-4"/> Geri Dön</button>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Öğrenme Mühendisliği</h2>
          <p className="text-gray-500 mb-8">İçeriğin kime ve nasıl öğretileceğini belirleyin.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Audience */}
              <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Hedef Kitle</label>
                  <input 
                      value={config.targetAudience}
                      onChange={e => setConfig({ ...config, targetAudience: e.target.value })}
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl font-medium focus:border-primary outline-none"
                      placeholder="Örn: Stajyer Garsonlar"
                  />
                  
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider mt-6 block">Eğitim Tonu</label>
                  <div className="flex flex-wrap gap-2">
                      {['PROFESSIONAL', 'FRIENDLY', 'HUMOROUS', 'AUTHORITATIVE'].map(tone => (
                          <button 
                              key={tone}
                              onClick={() => setConfig({ ...config, tone: tone as any })}
                              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${config.tone === tone ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}
                          >
                              {tone}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Pedagogy Selector */}
              <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Öğretim Metodu</label>
                  <div className="space-y-3">
                      {[
                          { id: 'FEYNMAN', label: 'Feynman Tekniği', icon: Baby, desc: 'Karmaşık konuları 5 yaşındaki bir çocuğa anlatır gibi basitleştirir.' },
                          { id: 'ACTIVE_RECALL', label: 'Aktif Geri Çağırma', icon: BrainCircuit, desc: 'Unutmayı önlemek için sık sık test ve soru sorar.' },
                          { id: 'SOCRATIC', label: 'Sokratik Metot', icon: MessageSquare, desc: 'Cevabı vermek yerine sorularla düşündürür.' },
                          { id: 'STANDARD', label: 'Standart Anlatım', icon: GraduationCap, desc: 'Klasik, doğrudan ve net bilgi aktarımı.' },
                      ].map((m) => (
                          <button 
                              key={m.id}
                              onClick={() => setConfig({ ...config, pedagogy: m.id as PedagogyMode })}
                              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                                  config.pedagogy === m.id 
                                  ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500' 
                                  : 'bg-white border-gray-200 hover:border-blue-300'
                              }`}
                          >
                              <div className={`p-2 rounded-lg ${config.pedagogy === m.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  <m.icon className="w-5 h-5" />
                              </div>
                              <div>
                                  <div className="font-bold text-gray-900 text-sm">{m.label}</div>
                                  <div className="text-xs text-gray-500">{m.desc}</div>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          <button 
              onClick={generateOutline}
              disabled={loading}
              className="w-full mt-8 py-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
          >
              {loading ? <Loader2 className="animate-spin" /> : <><Sparkles className="w-5 h-5" /> Müfredatı Tasarla</>}
          </button>
      </motion.div>
  );

  const renderStep3_Outline = () => (
      <motion.div {...FADE_IN} className="max-w-4xl mx-auto w-full h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="text-2xl font-bold text-gray-800">Müfredat Taslağı</h2>
                  <p className="text-sm text-gray-500">Yapay zeka bu yapıyı önerdi. Düzenleyip onaylayın.</p>
              </div>
              <button onClick={() => setStep(2)} className="text-sm font-bold text-gray-400 hover:text-gray-600">Ayarları Değiştir</button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {curriculum.map((module, idx) => (
                  <div key={module.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm group hover:border-primary/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                              <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">{idx + 1}</span>
                              {module.title}
                          </h3>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="text-gray-400 hover:text-primary"><RefreshCw className="w-4 h-4" /></button>
                              <button onClick={() => setCurriculum(curriculum.filter(m => m.id !== module.id))} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                      <div className="flex flex-wrap gap-2">
                          {module.keyPoints.map((pt, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium border border-gray-200">
                                  {pt}
                              </span>
                          ))}
                      </div>
                  </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> Yeni Modül Ekle
              </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
              <button 
                  onClick={generateFullCourse}
                  disabled={loading}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:bg-green-700 transition-all"
              >
                  {loading ? <Loader2 className="animate-spin" /> : <><Layout className="w-5 h-5" /> İçeriği Üret</>}
              </button>
          </div>
      </motion.div>
  );

  const renderStep4_Production = () => {
      const activeCard = courseData?.cards.find((c: StoryCard) => c.id === activeCardId);
      
      return (
          <div className="flex h-full bg-gray-100 overflow-hidden">
              {/* Sidebar: Slide List */}
              <div className="w-72 bg-white border-r border-gray-200 flex flex-col z-10 shadow-xl">
                  <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 text-sm">Slayt Akışı</div>
                  <div className="flex-1 overflow-y-auto p-2">
                      <SortableList 
                          items={courseData?.cards || []}
                          onOrderChange={(items) => setCourseData({...courseData, cards: items})}
                          renderItem={({ item: card, dragListeners }) => (
                              <div 
                                  onClick={() => setActiveCardId(card.id)}
                                  className={`p-3 mb-2 rounded-xl border transition-all cursor-pointer flex gap-2 items-center ${activeCardId === card.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                              >
                                  <div {...dragListeners} className="cursor-grab text-gray-400"><GripVertical className="w-4 h-4" /></div>
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-xs truncate">{card.title['en']}</div>
                                      <div className="text-[10px] text-gray-500">{card.type}</div>
                                  </div>
                              </div>
                          )}
                      />
                  </div>
                  <div className="p-4 border-t">
                      <button onClick={handlePublish} disabled={loading} className="w-full bg-primary text-white py-2 rounded-lg font-bold text-sm shadow-lg flex justify-center gap-2">
                          {loading ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />} Yayınla
                      </button>
                  </div>
              </div>

              {/* Editor Canvas */}
              <div className="flex-1 p-8 flex flex-col items-center justify-center relative bg-slate-50">
                  {activeCard && (
                      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col md:flex-row h-[600px]">
                          {/* Visual Preview */}
                          <div className="w-1/3 bg-gray-900 relative">
                              <img src={activeCard.mediaUrl} className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 p-6 flex flex-col justify-end text-white bg-gradient-to-t from-black/80 to-transparent">
                                  <h2 className="font-bold text-xl leading-tight mb-2">{activeCard.title['en']}</h2>
                                  <p className="text-xs opacity-80 line-clamp-3">{activeCard.content['en']}</p>
                              </div>
                          </div>
                          
                          {/* Edit Form */}
                          <div className="flex-1 p-8 overflow-y-auto">
                              <div className="flex justify-between mb-6">
                                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary" /> Editör</h3>
                                  <select className="bg-gray-100 rounded-lg text-xs font-bold px-2 py-1 outline-none" value={activeLang} onChange={e => setActiveLang(e.target.value)}>
                                      <option value="en">English (Master)</option>
                                      <option value="tr">Turkish</option>
                                  </select>
                              </div>
                              
                              <div className="space-y-4">
                                  <div>
                                      <label className="text-xs font-bold text-gray-400 uppercase">Başlık</label>
                                      <input 
                                          className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold"
                                          value={activeCard.title['en']} // Mock: Should be dynamic lang
                                          onChange={e => {
                                              const newCards = courseData.cards.map((c: any) => c.id === activeCardId ? {...c, title: {...c.title, en: e.target.value}} : c);
                                              setCourseData({...courseData, cards: newCards});
                                          }}
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-400 uppercase">İçerik</label>
                                      <textarea 
                                          className="w-full h-32 p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium resize-none"
                                          value={activeCard.content['en']}
                                          onChange={e => {
                                              const newCards = courseData.cards.map((c: any) => c.id === activeCardId ? {...c, content: {...c.content, en: e.target.value}} : c);
                                              setCourseData({...courseData, cards: newCards});
                                          }}
                                      />
                                  </div>
                                  
                                  <div className="flex gap-2 pt-2">
                                      <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-2">
                                          <Wand2 className="w-3 h-3" /> AI ile Kısalt
                                      </button>
                                      <button className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-2 rounded-lg flex items-center gap-2">
                                          <Baby className="w-3 h-3" /> Daha Basit Yaz (Feynman)
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="h-screen w-full bg-surface flex flex-col">
        {/* WIZARD HEADER */}
        {step < 4 && (
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white"><Wand2 className="w-4 h-4" /></div>
                    Content Wizard
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`w-8 h-1 rounded-full ${step >= s ? 'bg-primary' : 'bg-gray-200'}`} />
                    ))}
                </div>
                <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
        )}

        {/* LOADING OVERLAY */}
        <AnimatePresence>
            {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-gray-800">{loadingText}</h3>
                    <p className="text-gray-500">Bu işlem içeriğin uzunluğuna göre 30 saniye sürebilir.</p>
                </motion.div>
            )}
        </AnimatePresence>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-hidden relative">
            <div className={`h-full ${step < 4 ? 'p-8 overflow-y-auto' : ''}`}>
                {step === 1 && renderStep1_Source()}
                {step === 2 && renderStep2_Engineering()}
                {step === 3 && renderStep3_Outline()}
                {step === 4 && renderStep4_Production()}
            </div>
        </div>
    </div>
  );
};
