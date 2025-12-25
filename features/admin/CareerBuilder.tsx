
import React, { useState, useEffect } from 'react';
import { 
    Briefcase, Plus, Save, Trash2, Edit3, X, 
    BookOpen, Wand2, Loader2, ArrowRight, LayoutList, Map 
} from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { CareerPath, Course } from '../../types';
import { 
    getOrganizationCareerPaths, createManualCareerPath, 
    updateCareerPath, deleteCareerPath, createAiCareerPath 
} from '../../services/careerService';
import { getAdminCourses } from '../../services/db';
import { generateCareerPath } from '../../services/geminiService';
import { getLocalizedContent } from '../../i18n/config';

export const CareerBuilder: React.FC = () => {
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();

  // --- STATE ---
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true); // Content loading
  const [isInitializing, setIsInitializing] = useState(true); // First load structure
  
  // Selected Path State
  const [selectedPath, setSelectedPath] = useState<CareerPath | null>(null);
  const [isNewPath, setIsNewPath] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI Wizard State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Add Course Modal
  const [showAddCourse, setShowAddCourse] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
      loadData();
  }, [currentOrganization]);

  const loadData = async () => {
      if (!currentOrganization || !currentUser) return;
      // Keep existing data if refreshing to prevent layout jump
      if (paths.length === 0) setIsInitializing(true); 
      
      const [p, c] = await Promise.all([
          getOrganizationCareerPaths(currentOrganization.id),
          getAdminCourses(currentUser.id, currentOrganization.id)
      ]);
      setPaths(p);
      setCourses(c);
      setLoading(false);
      setIsInitializing(false);
  };

  // --- ACTIONS ---

  const handleSelectPath = (path: CareerPath) => {
      setSelectedPath({ ...path }); // Clone to avoid direct mutation
      setIsNewPath(false);
      setAiPrompt('');
  };

  const handleNewPath = () => {
      setSelectedPath({
          id: `temp_${Date.now()}`,
          organizationId: currentOrganization?.id || '',
          title: '',
          description: '',
          targetRole: '',
          department: 'housekeeping',
          courseIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
      });
      setIsNewPath(true);
      setAiPrompt('');
  };

  const handleSave = async () => {
      if (!selectedPath || !currentOrganization) return;
      setIsSaving(true);

      if (isNewPath) {
          const created = await createManualCareerPath({
              organizationId: currentOrganization.id,
              title: selectedPath.title,
              description: selectedPath.description,
              targetRole: selectedPath.targetRole,
              department: selectedPath.department,
              courseIds: selectedPath.courseIds,
              aiPrompt: aiPrompt
          });
          if (created) {
              setPaths([created, ...paths]);
              setSelectedPath(created);
              setIsNewPath(false);
          }
      } else {
          const success = await updateCareerPath(selectedPath.id, {
              title: selectedPath.title,
              description: selectedPath.description,
              courseIds: selectedPath.courseIds,
              targetRole: selectedPath.targetRole
          });
          if (success) {
              setPaths(paths.map(p => p.id === selectedPath.id ? selectedPath : p));
          }
      }
      setIsSaving(false);
  };

  const handleDelete = async () => {
      if (!selectedPath || isNewPath) {
          setSelectedPath(null);
          return;
      }
      if (confirm("Bu kariyer yolunu silmek istediğinize emin misiniz?")) {
          await deleteCareerPath(selectedPath.id);
          setPaths(paths.filter(p => p.id !== selectedPath.id));
          setSelectedPath(null);
      }
  };

  // --- AI HANDLER ---
  const handleAiDraft = async () => {
      if (!aiPrompt || !currentOrganization || !currentUser) return;
      setIsGenerating(true);
      
      const draft = await generateCareerPath(aiPrompt);
      
      if (selectedPath) {
          setSelectedPath({
              ...selectedPath,
              title: draft.title,
              description: draft.description,
              targetRole: aiPrompt
          });
      }
      
      setIsGenerating(false);
  };

  const handleAddCourse = (courseId: string) => {
      if (!selectedPath) return;
      if (!selectedPath.courseIds.includes(courseId)) {
          setSelectedPath({
              ...selectedPath,
              courseIds: [...selectedPath.courseIds, courseId]
          });
      }
      setShowAddCourse(false);
  };

  const handleRemoveCourse = (courseId: string) => {
      if (!selectedPath) return;
      setSelectedPath({
          ...selectedPath,
          courseIds: selectedPath.courseIds.filter(id => id !== courseId)
      });
  };

  // --- RENDERERS ---

  // Helper to get course object from ID
  const getCourse = (id: string) => courses.find(c => c.id === id);

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#eff0f5] overflow-hidden">
        
        {/* LEFT COLUMN: SIDEBAR LIST */}
        <div className="w-[250px] border-r border-[#d8dfea] flex flex-col bg-white h-full shrink-0">
            <div className="p-3 bg-[#d8dfea] border-b border-[#bdc7d8]">
                <h3 className="text-[#3b5998] font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                    <Map className="w-3 h-3" /> Eğitim Yolculukları
                </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {isInitializing ? (
                    <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : (
                    paths.map(path => (
                        <div 
                            key={path.id}
                            onClick={() => handleSelectPath(path)}
                            className={`px-3 py-3 border-b border-[#e9e9e9] cursor-pointer flex items-center gap-2 group transition-colors ${
                                selectedPath?.id === path.id 
                                ? 'bg-[#d8dfea] text-[#333]' 
                                : 'hover:bg-[#f7f7f7] text-[#333]'
                            }`}
                        >
                            <Briefcase className="w-4 h-4 text-[#3b5998]" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold truncate">{path.title}</div>
                                <div className="text-[10px] text-gray-500 truncate">{path.courseIds.length} Adım (Kurs)</div>
                            </div>
                            <ArrowRight className={`w-3 h-3 text-gray-400 ${selectedPath?.id === path.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 border-t border-[#d8dfea] bg-[#f7f7f7]">
                <button 
                    onClick={handleNewPath}
                    disabled={isInitializing}
                    className="w-full bg-[#3b5998] border border-[#29447e] text-white text-[11px] font-bold py-2 px-2 flex items-center justify-center gap-2 hover:bg-[#2d4373]"
                >
                    <Plus className="w-3 h-3" /> Yeni Yolculuk Tasarla
                </button>
            </div>
        </div>

        {/* RIGHT COLUMN: EDITING CANVAS (SINGLE COLUMN CONTENT) */}
        <div className="flex-1 flex flex-col bg-[#eff0f5] h-full overflow-hidden">
            {selectedPath ? (
                <>
                    {/* CANVAS HEADER */}
                    <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-3 flex justify-between items-center shadow-sm shrink-0">
                        <div className="text-[13px] font-bold text-[#333] flex items-center gap-2">
                            <Map className="w-4 h-4 text-gray-500" />
                            {isNewPath ? 'Yeni Eğitim Yolu' : `Düzenleniyor: ${selectedPath.title}`}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleDelete}
                                className="bg-[#f5f6f7] border border-[#ccc] text-[#333] text-[11px] font-bold px-3 py-1 hover:bg-[#e9e9e9]"
                            >
                                Sil
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-[#3b5998] border border-[#29447e] text-white text-[11px] font-bold px-3 py-1 disabled:opacity-50 flex items-center gap-1 hover:bg-[#2d4373]"
                            >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>

                    {/* CANVAS BODY - SCROLLABLE */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-4xl mx-auto space-y-6">
                            
                            {/* SECTION 1: BASIC INFO */}
                            <div className="bg-white border border-[#bdc7d8] shadow-sm">
                                <div className="bg-[#f0f2f5] border-b border-[#e9e9e9] px-4 py-2 text-[11px] font-bold text-[#3b5998] uppercase">
                                    Hedef Tanımları
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-[#666] mb-1">Yolculuk Adı</label>
                                        <input 
                                            value={selectedPath.title}
                                            onChange={(e) => setSelectedPath({...selectedPath, title: e.target.value})}
                                            className="w-full border border-[#bdc7d8] p-2 text-sm font-bold text-[#333] focus:border-[#3b5998] outline-none"
                                            placeholder="Örn: Housekeeping Liderlik Programı"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#666] mb-1">Varış Noktası (Hedef Pozisyon)</label>
                                        <input 
                                            value={selectedPath.targetRole}
                                            onChange={(e) => setSelectedPath({...selectedPath, targetRole: e.target.value})}
                                            className="w-full border border-[#bdc7d8] p-2 text-sm text-[#333] focus:border-[#3b5998] outline-none"
                                            placeholder="Örn: Kat Şefi"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#666] mb-1">İlgili Departman</label>
                                        <select 
                                            value={selectedPath.department}
                                            onChange={(e) => setSelectedPath({...selectedPath, department: e.target.value as any})}
                                            className="w-full border border-[#bdc7d8] p-2 text-sm text-[#333] focus:border-[#3b5998] outline-none bg-white"
                                        >
                                            <option value="housekeeping">Housekeeping</option>
                                            <option value="kitchen">Kitchen</option>
                                            <option value="front_office">Front Office</option>
                                            <option value="management">Management</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-[#666] mb-1">Motivasyon Açıklaması</label>
                                        <textarea 
                                            rows={3}
                                            value={selectedPath.description}
                                            onChange={(e) => setSelectedPath({...selectedPath, description: e.target.value})}
                                            className="w-full border border-[#bdc7d8] p-2 text-sm text-[#333] focus:border-[#3b5998] outline-none resize-none"
                                            placeholder="Bu yolculuk sonunda personel ne kazanacak?"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: AI ASSISTANT */}
                            <div className="bg-blue-50 border border-blue-200 shadow-sm p-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <Wand2 className="w-12 h-12 text-[#3b5998]" />
                                </div>
                                <div className="flex items-center gap-2 mb-3 relative z-10">
                                    <div className="p-1 bg-white rounded border border-blue-200">
                                        <Wand2 className="w-4 h-4 text-[#3b5998]" />
                                    </div>
                                    <span className="text-[12px] font-bold text-[#333]">AI Kariyer Mimarı</span>
                                </div>
                                <div className="flex gap-2 relative z-10">
                                    <input 
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        placeholder="Bir hedef rol yazın, yapay zeka sizin için yolu çizsin..."
                                        className="flex-1 border border-blue-200 p-2 text-xs text-[#333] focus:border-[#3b5998] outline-none"
                                    />
                                    <button 
                                        onClick={handleAiDraft}
                                        disabled={isGenerating}
                                        className="bg-white border border-blue-300 text-[#3b5998] text-[11px] font-bold px-4 hover:bg-blue-100 flex items-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Taslak Oluştur'}
                                    </button>
                                </div>
                            </div>

                            {/* SECTION 3: CURRICULUM */}
                            <div className="bg-white border border-[#bdc7d8] shadow-sm">
                                <div className="bg-[#f0f2f5] border-b border-[#e9e9e9] px-4 py-2 flex justify-between items-center">
                                    <div className="text-[11px] font-bold text-[#3b5998] uppercase">
                                        Eğitim Haritası ({selectedPath.courseIds.length} Adım)
                                    </div>
                                    <button 
                                        onClick={() => setShowAddCourse(true)}
                                        className="text-[10px] bg-[#3b5998] text-white px-2 py-1 font-bold hover:bg-[#2d4373] flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Eğitim Ekle
                                    </button>
                                </div>

                                <div className="divide-y divide-[#e9e9e9]">
                                    {selectedPath.courseIds.map((courseId, idx) => {
                                        const course = getCourse(courseId);
                                        return (
                                            <div key={courseId + idx} className="p-3 flex justify-between items-center group hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-[#eff0f5] border border-[#ccc] w-8 h-8 flex items-center justify-center text-[12px] font-bold text-[#666] rounded-sm relative">
                                                        {idx + 1}
                                                        {idx < selectedPath.courseIds.length - 1 && (
                                                            <div className="absolute top-full left-1/2 w-0.5 h-6 bg-[#ccc] -ml-px z-0" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-[13px] font-bold text-[#333] hover:underline cursor-pointer">
                                                            {course ? getLocalizedContent(course.title) : 'Bilinmeyen Kurs'}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                                                            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course?.duration || 0} dk</span>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                            <span>{course?.xpReward || 0} XP</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveCourse(courseId)}
                                                    className="p-2 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Adımı Kaldır"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {selectedPath.courseIds.length === 0 && (
                                        <div className="text-center p-8 border-dashed text-gray-400 text-xs">
                                            Bu yola henüz eğitim eklenmemiş. "Eğitim Ekle" butonunu kullanın.
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-[#f7f7f7]">
                    <LayoutList className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold text-sm text-[#333]">Bir Kariyer Yolu Seçin</p>
                    <p className="text-xs">veya soldan yeni bir tane oluşturun.</p>
                </div>
            )}

            {/* ADD COURSE MODAL */}
            {showAddCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="bg-white border-[4px] border-[#555] w-[450px] shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="bg-[#3b5998] text-white px-3 py-2 text-[12px] font-bold flex justify-between items-center shrink-0">
                            <span>Müfredata Kurs Ekle</span>
                            <button onClick={() => setShowAddCourse(false)}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 bg-white">
                            {courses.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => handleAddCourse(c.id)}
                                    className={`p-3 cursor-pointer border-b border-[#e9e9e9] text-[12px] flex justify-between items-center transition-colors ${
                                        selectedPath?.courseIds.includes(c.id) ? 'bg-green-50' : 'hover:bg-[#eff0f5]'
                                    }`}
                                >
                                    <div>
                                        <span className="font-bold text-[#333] block">{getLocalizedContent(c.title)}</span>
                                        <span className="text-[10px] text-gray-500">{c.duration} dk • {c.xpReward} XP</span>
                                    </div>
                                    {selectedPath?.courseIds.includes(c.id) && (
                                        <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded text-[10px]">EKLENDİ</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
