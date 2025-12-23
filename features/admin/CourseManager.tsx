
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, FileText, ChevronRight, Users, Clock } from 'lucide-react';
import { Course } from '../../types';
import { getAdminCourses } from '../../services/db';
import { createCourse } from '../../services/courseService';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getLocalizedContent } from '../../i18n/config';

export const CourseManager: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreateCourse = async () => {
      if (!currentUser) return;
      setIsCreating(true);
      const newCourse = await createCourse({
          title: { tr: 'Yeni Kurs', en: 'New Course' },
          description: { tr: 'Açıklama giriniz.', en: 'Description here.' },
          organizationId: currentOrganization?.id,
          visibility: 'PRIVATE',
      }, currentUser);
      
      if (newCourse) {
          navigate(`/admin/courses/${newCourse.id}`);
      }
      setIsCreating(false);
  };

  return (
    <div className="bg-white border border-[#d8dfea] min-h-[500px]">
        <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-3 flex justify-between items-center">
            <h1 className="text-sm font-bold text-[#333]">Eğitim Kataloğu</h1>
            <button 
                onClick={handleCreateCourse} 
                disabled={isCreating}
                className="bg-[#3b5998] text-white px-3 py-1.5 rounded-sm text-[11px] font-bold flex items-center gap-1 border border-[#29447e]"
            >
                {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Yeni Kurs
            </button>
        </div>

        {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>
        ) : (
            <div className="divide-y divide-[#e9e9e9]">
                {courses.map(course => (
                    <div 
                        key={course.id} 
                        onClick={() => navigate(`/admin/courses/${course.id}`)}
                        className="p-4 flex items-center gap-4 hover:bg-[#f0f2f5] cursor-pointer group transition-colors"
                    >
                        <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded shrink-0 flex items-center justify-center overflow-hidden">
                            {course.thumbnailUrl ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" /> : <FileText className="w-6 h-6 text-gray-400" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-sm font-bold text-[#3b5998] group-hover:underline">{getLocalizedContent(course.title)}</h3>
                                {course.isNew && <span className="bg-red-500 text-white text-[9px] px-1 rounded font-bold">YENİ</span>}
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
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#3b5998]" />
                    </div>
                ))}
                {courses.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-xs">Henüz bir kurs oluşturulmadı.</div>
                )}
            </div>
        )}
    </div>
  );
};
