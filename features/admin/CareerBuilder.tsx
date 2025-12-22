
import React, { useState, useEffect } from 'react';
import { 
    Briefcase, Plus, Save, Trash2, Edit3, X, 
    BookOpen, Wand2, Loader2, ArrowRight, LayoutList 
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
  const [loading, setLoading] = useState(true);
  
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
      setLoading(true);
      const [p, c] = await Promise.all([
          getOrganizationCareerPaths(currentOrganization.id),
          getAdminCourses(currentUser.id, currentOrganization.id)
      ]);
      setPaths(p);
      setCourses(c);
      setLoading(false);
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
      
      // 1. Generate Structure JSON
      const draft = await generateCareerPath(aiPrompt);
      
      // 2. We are NOT creating courses in DB here yet (User must approve)
      // Instead, we just populate the text fields. 
      // NOTE: Creating placeholder courses from AI suggestions is complex in UI-only mode without saving.
      // For this implementation, we will utilize the existing `createAiCareerPath` service logic IF user explicitly wants "Auto-Build".
      // But based on prompt, we are "Assistant". Let's auto-fill the text fields first.
      
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
    <div className="flex h-[calc(100vh-60px)] bg-[#eff0f5]">
        
        {/* LEFT COLUMN: SIDEBAR LIST */}
        <div className="w-[250px] border-r border-[#d8dfea] flex flex-col bg-white">
            <div className="p-2 bg-[#d8dfea] border-b border-[#bdc7d8]">
                <h3 className="text-[#3b5998] font-bold text-[11px]">Kariyer Yolları</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {paths.map(path => (
                    <div 
                        key={path.id}
                        onClick={() => handleSelectPath(path)}
                        className={`px-3 py-2 border-b border-[#e9e9e9] cursor-pointer flex items-center gap-2 group ${
                            selectedPath?.id === path.id 
                            ? 'bg-[#d8dfea] text-[#333]' 
                            : 'hover:bg-[#f7f7f7] text-[#333]'
                        }`}
                    >
                        <Briefcase className="w-4 h-4 text-[#3b5998]" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold truncate">{path.title}</div>
                            <div className="text-[10px] text-gray-500 truncate">{path.courseIds.length} Kurs</div>
                        </div>
                        <ArrowRight className={`w-3 h-3 text-gray-400 ${selectedPath?.id === path.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-[#d8dfea] bg-[#f7f7f7]">
                <button 
                    onClick={handleNewPath}
                    className="w-full bg-[#3b5998] border border-[#29447e] text-white text-[11px] font-bold py-1 px-2 flex items-center justify-center gap-1"
                >
                    <Plus className="w-3 h-3" /> Yeni Yol Oluştur
                </button>
            </div>
        </div>

        {/* RIGHT COLUMN: EDITING CANVAS */}
        <div className="flex-1 flex flex-col bg-[#eff0f5]">
            {selectedPath ? (
                <>
                    {/* CANVAS HEADER */}
                    <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-3 flex justify-between items-center shadow-sm">
                        <div className="text-[13px] font-bold text-[#333]">
                            {isNewPath ? 'Yeni Kariyer Yolu Oluşturuluyor' : `Düzenleniyor: ${selectedPath.title}`}
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
                                className="bg-[#3b5998] border border-[#29447e] text-white text-[11px] font-bold px-3 py-1 disabled:opacity-50 flex items-center gap-1"
                            >
                                {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                            </button>
                        </div>
                    </div>

                    {/* CANVAS BODY */}
                    <div className="p-4 overflow-y-auto flex-1">
                        
                        <div className="flex gap-4">
                            
                            {/* LEFT: FORM FIELDS */}
                            <div className="flex-[2] space-y-4">
                                
                                {/* AI ASSISTANT BOX */}
                                <div className="bg-white border border-[#bdc7d8] p-3">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#e9e9e9]">
                                        <Wand2 className="w-4 h-4 text-[#3b5998]" />
                                        <span className="text-[11px] font-bold text-[#333]">AI Asistanı</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            placeholder="Örn: Housekeeping Şefi olmak için gereken yol..."
                                            className="flex-1 border border-[#bdc7d8] p-1 text-[11px] text-[#333]"
                                        />
                                        <button 
                                            onClick={handleAiDraft}
                                            disabled={isGenerating}
                                            className="bg-[#f5f6f7] border border-[#ccc] text-[#333] text-[11px] font-bold px-2 flex items-center gap-1 hover:bg-[#e9e9e9]"
                                        >
                                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Taslak Çıkar'}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-1">
                                        *Yapay zeka başlık ve açıklamayı doldurur. Kursları manuel eklemeniz gerekir.
                                    </p>
                                </div>

                                {/* BASIC INFO */}
                                <div className="bg-white border border-[#bdc7d8] p-4 space-y-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#666] mb-1">Yol Başlığı</label>
                                        <input 
                                            value={selectedPath.title}
                                            onChange={(e) => setSelectedPath({...selectedPath, title: e.target.value})}
                                            className="w-full border border-[#bdc7d8] p-1 text-[11px] font-bold text-[#333]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#666] mb-1">Hedef Pozisyon</label>
                                        <input 
                                            value={selectedPath.targetRole}
                                            onChange={(e) => setSelectedPath({...selectedPath, targetRole: e.target.value})}
                                            className="w-full border border-[#bdc7d8] p-1 text-[11px] text-[#333]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#666] mb-1">Açıklama</label>
                                        <textarea 
                                            rows={3}
                                            value={selectedPath.description}
                                            onChange={(e) => setSelectedPath({...selectedPath, description: e.target.value})}
                                            className="w-full border border-[#bdc7d8] p-1 text-[11px] text-[#333]"
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* RIGHT: COURSE CURRICULUM */}
                            <div className="flex-[3] flex flex-col gap-3">
                                <div className="bg-[#d8dfea] text-[#3b5998] font-bold text-[11px] p-2 border border-[#bdc7d8]">
                                    Bu Yoldaki Kurslar (Müfredat)
                                </div>

                                <div className="space-y-2">
                                    {selectedPath.courseIds.map((courseId, idx) => {
                                        const course = getCourse(courseId);
                                        return (
                                            <div key={courseId + idx} className="bg-white border border-[#bdc7d8] p-2 flex justify-between items-center group">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-[#eff0f5] border border-[#ccc] w-6 h-6 flex items-center justify-center text-[10px] font-bold text-[#666]">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-[#333] hover:underline cursor-pointer">
                                                            {course ? getLocalizedContent(course.title) : 'Bilinmeyen Kurs'}
                                                        </div>
                                                        <div className="text-[9px] text-gray-500">{course?.duration || 0} dk • {course?.xpReward || 0} XP</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveCourse(courseId)}
                                                    className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {selectedPath.courseIds.length === 0 && (
                                        <div className="text-center p-4 border-2 border-dashed border-[#ccc] text-gray-400 text-[11px]">
                                            Henüz bu yola kurs eklenmedi.
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => setShowAddCourse(true)}
                                        className="w-full py-2 bg-[#f5f6f7] border border-[#ccc] text-[#3b5998] text-[11px] font-bold hover:bg-[#e9e9e9]"
                                    >
                                        + Kurs Ekle
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <LayoutList className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold text-sm">Bir Kariyer Yolu Seçin</p>
                    <p className="text-xs">veya soldan yeni bir tane oluşturun.</p>
                </div>
            )}

            {/* ADD COURSE MODAL */}
            {showAddCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white border-[3px] border-[#555] w-[400px] shadow-2xl">
                        <div className="bg-[#3b5998] text-white px-2 py-1 text-[12px] font-bold flex justify-between items-center">
                            <span>Kurs Ekle</span>
                            <button onClick={() => setShowAddCourse(false)}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-2 h-64 overflow-y-auto">
                            {courses.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => handleAddCourse(c.id)}
                                    className="p-2 hover:bg-[#eff0f5] cursor-pointer border-b border-[#e9e9e9] text-[11px] flex justify-between"
                                >
                                    <span className="font-bold text-[#333]">{getLocalizedContent(c.title)}</span>
                                    {selectedPath?.courseIds.includes(c.id) && <span className="text-green-600 font-bold">Eklendi</span>}
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
