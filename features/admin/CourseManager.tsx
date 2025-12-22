
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Edit2, List, Wand2, ChevronDown, ChevronUp, FileText, ArrowRight } from 'lucide-react';
import { Course, CourseModule } from '../../types';
import { getAdminCourses, updateCourse } from '../../services/db';
import { createAiSyllabus } from '../../services/careerService';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getLocalizedContent } from '../../i18n/config';

export const CourseManager: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Expanded Syllabus State
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

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

  const handleGenerateSyllabus = async (course: Course) => {
      setGeneratingId(course.id);
      try {
          // Context assumption: Course title is self-explanatory, or we could pass CareerPath title if we linked them perfectly.
          // For now using Course Title as context enough.
          const modules = await createAiSyllabus(course.id, getLocalizedContent(course.title), "Hotel Hospitality Career");
          
          setCourses(prev => prev.map(c => c.id === course.id ? { ...c, modules } : c));
          setExpandedCourseId(course.id);
      } catch (e) {
          alert("Müfredat oluşturulamadı.");
      } finally {
          setGeneratingId(null);
      }
  };

  const handleGoToStudio = (course: Course, module: CourseModule, index: number) => {
      navigate('/admin/content', { 
          state: { 
              courseId: course.id, 
              moduleIndex: index,
              moduleTitle: getLocalizedContent(module.title),
              courseTitle: getLocalizedContent(course.title),
              existingCards: module.cards
          } 
      });
  };

  return (
    <div className="bg-white border border-[#d8dfea] min-h-[500px]">
        <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-3 flex justify-between items-center">
            <h1 className="text-sm font-bold text-[#333]">Kurs ve Müfredat Yönetimi</h1>
        </div>

        {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>
        ) : (
            <div className="divide-y divide-[#e9e9e9]">
                {courses.map(course => (
                    <div key={course.id} className="bg-white transition-colors">
                        {/* Course Header Row */}
                        <div className="p-4 flex items-start gap-4 hover:bg-[#f0f2f5]">
                            <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded shrink-0 flex items-center justify-center overflow-hidden">
                                {course.thumbnailUrl ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" /> : <FileText className="w-6 h-6 text-gray-400" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                    <h3 className="text-sm font-bold text-[#3b5998]">{getLocalizedContent(course.title)}</h3>
                                    <button 
                                        onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
                                        className="text-gray-500 hover:text-[#3b5998]"
                                    >
                                        {expandedCourseId === course.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1">{getLocalizedContent(course.description)}</p>
                                
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] bg-[#e9e9e9] px-2 py-0.5 rounded text-gray-600 font-bold">
                                        {course.modules?.length || 0} Modül
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Syllabus View */}
                        {expandedCourseId === course.id && (
                            <div className="bg-[#f7f7f7] p-4 border-t border-[#e9e9e9] pl-24">
                                {(course.modules || []).length === 0 ? (
                                    <div className="text-center py-6 border-2 border-dashed border-[#d8dfea] rounded-lg">
                                        <p className="text-xs text-gray-500 mb-2">Bu kurs için henüz müfredat oluşturulmamış.</p>
                                        <button 
                                            onClick={() => handleGenerateSyllabus(course)}
                                            disabled={generatingId === course.id}
                                            className="bg-[#3b5998] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 mx-auto disabled:opacity-50"
                                        >
                                            {generatingId === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                            AI ile Müfredat Planla
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Müfredat (Modüller)</h4>
                                        {course.modules.map((mod, idx) => (
                                            <div key={idx} className="bg-white p-3 border border-[#d8dfea] rounded flex justify-between items-center shadow-sm">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-300 mr-2">#{idx + 1}</span>
                                                    <span className="text-sm font-bold text-gray-800">{getLocalizedContent(mod.title)}</span>
                                                    <div className="text-[10px] text-gray-500 ml-6">
                                                        {mod.cards?.length || 0} İçerik Kartı • {mod.status}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleGoToStudio(course, mod, idx)}
                                                    className="text-xs font-bold text-[#3b5998] hover:underline flex items-center gap-1 bg-[#eff0f5] px-3 py-1.5 rounded border border-[#d8dfea]"
                                                >
                                                    İçeriği Üret/Düzenle <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
