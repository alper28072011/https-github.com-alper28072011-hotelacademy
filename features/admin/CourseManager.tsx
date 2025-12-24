
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, FileText, ChevronRight, Users, Clock, Edit2, Trash2, X, Wand2 } from 'lucide-react';
import { Course } from '../../types';
import { getAdminCourses } from '../../services/db';
import { createCourse, deleteCourse, updateCourse } from '../../services/courseService';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getLocalizedContent } from '../../i18n/config';
import { generateShortDescription } from '../../services/geminiService';

export const CourseManager: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Form Fields
  const [inputTitle, setInputTitle] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
      fetchData();
  }, [currentOrganization, currentUser]);

  const fetchData = async () => {
      if (!currentUser) return;
      setLoading(true);
      const c = await getAdminCourses(currentUser.id, currentOrganization?.id);
      setCourses(c || []);
      setLoading(false);
  };

  // --- ACTIONS ---

  const handleOpenCreate = () => {
      setModalMode('CREATE');
      setInputTitle('');
      setInputDescription('');
      setSelectedCourse(null);
      setShowModal(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, course: Course) => {
      e.stopPropagation();
      setModalMode('EDIT');
      setInputTitle(getLocalizedContent(course.title));
      setInputDescription(getLocalizedContent(course.description));
      setSelectedCourse(course);
      setShowModal(true);
  };

  const handleSubmit = async () => {
      if (!currentUser || !inputTitle.trim()) return;
      setIsProcessing(true);

      // AI GENERATION: If user didn't provide a description, generate one.
      let finalDescription = { tr: inputDescription, en: inputDescription };
      
      // If Creating NEW and description is empty, or Editing and description is empty (auto-fix)
      if (!inputDescription.trim()) {
          try {
              const aiDesc = await generateShortDescription(inputTitle);
              finalDescription = aiDesc;
          } catch (e) {
              // Fallback
              finalDescription = { tr: inputTitle + ' eğitimi.', en: inputTitle + ' training.' };
          }
      }

      if (modalMode === 'CREATE') {
          // CREATE LOGIC
          const newCourse = await createCourse({
              title: { tr: inputTitle, en: inputTitle },
              description: finalDescription,
              organizationId: currentOrganization?.id,
              visibility: 'PRIVATE',
          }, currentUser);
          
          if (newCourse) {
              setCourses([newCourse, ...courses]);
              setShowModal(false);
          }
      } else {
          // EDIT LOGIC
          if (selectedCourse) {
              const success = await updateCourse(selectedCourse.id, {
                  title: { ...selectedCourse.title, tr: inputTitle },
                  description: finalDescription // Updates the description too
              });
              if (success) {
                  setCourses(courses.map(c => c.id === selectedCourse.id ? { 
                      ...c, 
                      title: { ...c.title, tr: inputTitle },
                      description: finalDescription
                  } : c));
                  setShowModal(false);
              }
          }
      }
      setIsProcessing(false);
  };

  const handleDelete = async (e: React.MouseEvent, courseId: string) => {
      e.stopPropagation();
      if (confirm("Bu kursu ve tüm içeriğini kalıcı olarak silmek istediğinize emin misiniz?")) {
          // Optimistic update
          setCourses(courses.filter(c => c.id !== courseId));
          await deleteCourse(courseId);
      }
  };

  return (
    <div className="bg-white border border-[#d8dfea] min-h-[500px]">
        {/* Header */}
        <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-3 flex justify-between items-center">
            <h1 className="text-sm font-bold text-[#333]">Eğitim Kataloğu</h1>
            <button 
                onClick={handleOpenCreate} 
                className="bg-[#3b5998] text-white px-3 py-1.5 rounded-sm text-[11px] font-bold flex items-center gap-1 border border-[#29447e]"
            >
                <Plus className="w-3 h-3" /> Yeni Kurs
            </button>
        </div>

        {/* List */}
        {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>
        ) : (
            <div className="divide-y divide-[#e9e9e9]">
                {courses.map(course => (
                    <div 
                        key={course.id} 
                        onClick={() => navigate(`/admin/courses/${course.id}`)}
                        className="p-4 flex items-center gap-4 hover:bg-[#f0f2f5] cursor-pointer group transition-colors relative"
                    >
                        <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded shrink-0 flex items-center justify-center overflow-hidden">
                            {course.thumbnailUrl ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" /> : <FileText className="w-6 h-6 text-gray-400" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1 pr-16">
                                <h3 className="text-sm font-bold text-[#3b5998] group-hover:underline truncate">{getLocalizedContent(course.title)}</h3>
                                {course.isNew && <span className="bg-red-500 text-white text-[9px] px-1 rounded font-bold ml-2">YENİ</span>}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">{getLocalizedContent(course.description)}</p>
                            
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration} dk</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.completesCount || 0}</span>
                                <span className="bg-[#e9e9e9] px-2 py-0.5 rounded text-gray-600 font-bold">
                                    {(course.topicIds || []).length} Konu
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons (Visible on hover or mobile) */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button 
                                onClick={(e) => handleOpenEdit(e, course)}
                                className="p-2 text-gray-400 hover:text-[#3b5998] hover:bg-[#d8dfea] rounded transition-colors"
                                title="Düzenle"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => handleDelete(e, course.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Sil"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                    </div>
                ))}
                {courses.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-xs">Henüz bir kurs oluşturulmadı.</div>
                )}
            </div>
        )}

        {/* MODAL (FB 2008 Style) */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                <div className="bg-white border-[4px] border-[#555] shadow-2xl w-full max-w-sm">
                    {/* Header */}
                    <div className="bg-[#3b5998] text-white px-3 py-2 text-[13px] font-bold flex justify-between items-center">
                        <span>{modalMode === 'CREATE' ? 'Yeni Kurs Oluştur' : 'Kursu Düzenle'}</span>
                        <button onClick={() => setShowModal(false)}><X className="w-4 h-4" /></button>
                    </div>
                    
                    {/* Body */}
                    <div className="p-4 bg-white space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1">Kurs Başlığı:</label>
                            <input 
                                autoFocus
                                value={inputTitle}
                                onChange={(e) => setInputTitle(e.target.value)}
                                className="w-full border border-[#bdc7d8] p-1.5 text-sm outline-none focus:border-[#3b5998] font-bold text-[#333]"
                                placeholder="Örn: Mutfak Hijyeni 101"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1 flex items-center gap-1">
                                Açıklama <span className="text-gray-400 font-normal">(Boş bırakırsanız AI yazar)</span>
                                {!inputDescription && modalMode === 'CREATE' && <Wand2 className="w-3 h-3 text-[#3b5998] animate-pulse" />}
                            </label>
                            <textarea 
                                value={inputDescription}
                                onChange={(e) => setInputDescription(e.target.value)}
                                className="w-full border border-[#bdc7d8] p-1.5 text-xs outline-none focus:border-[#3b5998] resize-none h-20 text-[#333]"
                                placeholder={modalMode === 'CREATE' ? "Örn: Temel mutfak kuralları... (veya boş bırakın)" : "Açıklama giriniz"}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-[#f7f7f7] border-t border-[#ccc] p-3 flex justify-end gap-2">
                        <button 
                            onClick={handleSubmit}
                            disabled={!inputTitle.trim() || isProcessing}
                            className="bg-[#3b5998] border border-[#29447e] text-white px-4 py-1 text-[11px] font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                            {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isProcessing ? 'İşleniyor...' : 'Kaydet'}
                        </button>
                        <button 
                            onClick={() => setShowModal(false)}
                            className="bg-white border border-[#999] text-[#333] px-4 py-1 text-[11px] font-bold"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
