
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Loader2, Search, MoreVertical, Pencil, Globe, Lock, Trash2, 
    Eye, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course } from '../../types';
import { getAdminCourses, deleteCourse, updateCourse } from '../../services/db';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';

export const CourseManager: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
      fetchCourses();
  }, [currentOrganization, currentUser]);

  const fetchCourses = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
          const data = await getAdminCourses(currentUser.id, currentOrganization?.id);
          setCourses(data || []);
      } catch (error) {
          console.error("Course fetch error:", error);
          setCourses([]);
      } finally {
          setLoading(false);
      }
  };

  // CRASH FIX: Safe filtering. If title is missing, fallback to empty string so toLowerCase() doesn't crash.
  const filteredCourses = courses.filter(c => 
      (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
      if (!deleteTarget) return;
      setIsDeleting(true);
      const success = await deleteCourse(deleteTarget.id);
      if (success) {
          setCourses(prev => prev.filter(c => c.id !== deleteTarget.id));
          setDeleteTarget(null);
      } else {
          alert("Silme işlemi başarısız.");
      }
      setIsDeleting(false);
  };

  const handleTogglePrivacy = async (course: Course) => {
      setMenuOpenId(null);
      const newVisibility = course.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
      
      // Optimistic Update
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, visibility: newVisibility } : c));
      
      const success = await updateCourse(course.id, { visibility: newVisibility });
      if (!success) {
          // Revert if failed
          setCourses(prev => prev.map(c => c.id === course.id ? { ...c, visibility: course.visibility } : c));
          alert("Güncelleme başarısız.");
      }
  };

  const handleEdit = (course: Course) => {
      navigate('/admin/content', { state: { courseData: course } });
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">İçerik Yönetimi</h1>
                <p className="text-gray-500">Yayınlanan eğitimleri düzenle veya yönet.</p>
            </div>
            <button 
                onClick={() => navigate('/admin/content')}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-light transition-all active:scale-95"
            >
                + Yeni İçerik
            </button>
        </div>

        <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Eğitim ara..."
                className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-800 focus:border-primary focus:outline-none"
            />
        </div>

        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map(course => (
                    <motion.div 
                        key={course.id}
                        layoutId={course.id}
                        className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow relative"
                    >
                        {/* Image */}
                        <div className="aspect-video relative bg-gray-100">
                            <img 
                                src={course.thumbnailUrl || 'https://via.placeholder.com/400'} 
                                className="w-full h-full object-cover" 
                                alt={course.title || 'Course'}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute top-3 right-3">
                                {course.visibility === 'PUBLIC' ? (
                                    <div className="bg-blue-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                        <Globe className="w-3 h-3" /> Public
                                    </div>
                                ) : (
                                    <div className="bg-gray-800/90 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                        <Lock className="w-3 h-3" /> Private
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-3 left-3 text-white text-xs font-bold flex items-center gap-2">
                                <span className="bg-black/30 px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {course.duration || 0} dk
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            <h3 className="font-bold text-gray-800 text-lg leading-tight mb-2 line-clamp-1">
                                {course.title || "Adsız İçerik"}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">
                                    {(course.categoryId || 'Genel').replace('cat_', '')}
                                </span>
                                <span>•</span>
                                <span>{new Date(course.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-auto">
                                <div className="text-xs font-bold text-primary flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> {course.popularityScore || 0}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setMenuOpenId(menuOpenId === course.id ? null : course.id)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <MoreVertical className="w-5 h-5 text-gray-400" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {menuOpenId === course.id && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden"
                                                >
                                                    <button onClick={() => handleEdit(course)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 font-medium">
                                                        <Pencil className="w-4 h-4" /> Düzenle
                                                    </button>
                                                    <button onClick={() => handleTogglePrivacy(course)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 font-medium border-t border-gray-50">
                                                        {course.visibility === 'PUBLIC' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                                        {course.visibility === 'PUBLIC' ? 'Gizle (Private Yap)' : 'Yayınla (Public Yap)'}
                                                    </button>
                                                    <button onClick={() => { setMenuOpenId(null); setDeleteTarget(course); }} className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-2 text-sm text-red-600 font-medium border-t border-gray-50">
                                                        <Trash2 className="w-4 h-4" /> Sil
                                                    </button>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
                
                {filteredCourses.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                        {searchTerm ? "Aramaya uygun içerik yok." : "Henüz bir eğitim oluşturulmadı."}
                    </div>
                )}
            </div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                    >
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Emin misin?</h2>
                            <p className="text-gray-500 text-sm mt-2">
                                <b>{deleteTarget.title}</b> içeriği kalıcı olarak silinecek. Bu işlem geri alınamaz.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                            >
                                İptal
                            </button>
                            <button 
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sil'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
