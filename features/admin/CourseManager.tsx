
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Globe, Lock, Edit2, Trash2 } from 'lucide-react';
import { Course } from '../../types';
import { getAdminCourses, deleteCourse } from '../../services/db';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getLocalizedContent } from '../../i18n/config';

export const CourseManager: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (id: string) => {
      if(window.confirm("Bu eğitimi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
          setLoading(true);
          const success = await deleteCourse(id);
          if(success) {
              setCourses(prev => prev.filter(c => c.id !== id));
          } else {
              alert("Silme işlemi başarısız.");
          }
          setLoading(false);
      }
  };

  return (
    <div className="bg-white border border-[#d8dfea] min-h-[500px]">
        {/* Header Bar */}
        <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-3 flex justify-between items-center">
            <h1 className="text-sm font-bold text-[#333]">Tüm Eğitimler</h1>
            <button 
                onClick={() => navigate('/admin/content')}
                className="bg-[#3b5998] text-white px-3 py-1 text-[11px] font-bold border border-[#29447e] flex items-center gap-1 cursor-pointer"
            >
                <Plus className="w-3 h-3" /> Yeni Eğitim
            </button>
        </div>

        {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>
        ) : (
            <div className="p-3">
                {courses.length === 0 && <p className="text-xs text-gray-500 p-4 text-center">Henüz eğitim oluşturulmamış.</p>}
                
                {courses.map(course => (
                    <div key={course.id} className="mb-4 pb-4 border-b border-[#e9e9e9] last:border-0 flex gap-4">
                        {/* Thumbnail */}
                        <div className="w-24 h-16 bg-[#f7f7f7] border border-[#ccc] shrink-0 p-0.5">
                            <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1">
                            <h3 
                                onClick={() => navigate('/admin/content', { state: { courseData: course } })}
                                className="text-[13px] font-bold text-[#3b5998] hover:underline cursor-pointer mb-1"
                            >
                                {getLocalizedContent(course.title)}
                            </h3>
                            <div className="text-[11px] text-gray-500 mb-2">
                                {course.duration} dakika • {new Date(course.createdAt).toLocaleDateString()} • 
                                {course.visibility === 'PUBLIC' ? ' Herkes' : ' Sadece Üyeler'}
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => navigate('/admin/content', { state: { courseData: course } })} 
                                    className="text-[10px] text-[#3b5998] hover:underline flex items-center gap-1 font-bold"
                                >
                                    <Edit2 className="w-3 h-3" /> Düzenle
                                </button>
                                <button 
                                    onClick={() => handleDelete(course.id)} 
                                    className="text-[10px] text-[#3b5998] hover:underline flex items-center gap-1"
                                >
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
