
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Loader2, Search, MoreVertical, Pencil, Globe, Lock, Trash2, 
    Eye, AlertCircle, CheckCircle2, Clock, Layers, Plus, Link, ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Course, LearningJourney } from '../../types';
import { getAdminCourses, deleteCourse, updateCourse } from '../../services/db';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { getLocalizedContent } from '../../i18n/config';

export const CourseManager: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { currentUser } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'COURSES' | 'JOURNEYS'>('COURSES');
  const [courses, setCourses] = useState<Course[]>([]);
  const [journeys, setJourneys] = useState<LearningJourney[]>([]); // Should fetch from DB
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch Logic
  useEffect(() => {
      const fetchData = async () => {
          if (!currentUser) return;
          setLoading(true);
          const c = await getAdminCourses(currentUser.id, currentOrganization?.id);
          setCourses(c || []);
          // Mock Journeys for now (DB service update needed for real fetching)
          setJourneys([]); 
          setLoading(false);
      };
      fetchData();
  }, [currentOrganization, currentUser]);

  const handleEdit = (course: Course) => {
      navigate('/admin/content', { state: { courseData: course } });
  };

  const filteredCourses = courses.filter(c => 
      getLocalizedContent(c.title).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-20">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Eğitim Merkezi</h1>
                <p className="text-gray-500">İçerik ve serileri yönet.</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('COURSES')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'COURSES' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
                >
                    Tekil Eğitimler
                </button>
                <button 
                    onClick={() => setActiveTab('JOURNEYS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'JOURNEYS' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
                >
                    Eğitim Serileri
                </button>
            </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Ara..."
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-800 focus:border-primary focus:outline-none"
                />
            </div>
            <button 
                onClick={() => navigate('/admin/content')}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-light transition-all active:scale-95 flex items-center gap-2"
            >
                <Plus className="w-5 h-5" />
                {activeTab === 'COURSES' ? 'Yeni Eğitim' : 'Yeni Seri'}
            </button>
        </div>

        {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
            <>
                {/* COURSES GRID */}
                {activeTab === 'COURSES' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map(course => (
                            <motion.div 
                                key={course.id}
                                layoutId={course.id}
                                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow relative"
                            >
                                <div className="aspect-video relative bg-gray-100">
                                    <img 
                                        src={course.thumbnailUrl || 'https://via.placeholder.com/400'} 
                                        className="w-full h-full object-cover" 
                                    />
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-[10px] font-bold uppercase text-gray-700 border border-gray-200">
                                        {course.config?.pedagogyMode || 'STANDARD'}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-gray-800 text-lg leading-tight mb-2 line-clamp-1">
                                        {getLocalizedContent(course.title)}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                        <Globe className="w-3 h-3" />
                                        <span>{(course.config?.targetLanguages || ['tr']).join(', ').toUpperCase()}</span>
                                    </div>
                                    <button onClick={() => handleEdit(course)} className="w-full py-2 bg-gray-50 text-gray-600 font-bold rounded-lg text-sm hover:bg-gray-100">
                                        Düzenle
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* JOURNEYS GRID (Placeholder for Logic) */}
                {activeTab === 'JOURNEYS' && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Layers className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-lg font-bold text-gray-600">Henüz Seri Oluşturulmadı</h3>
                        <p className="text-sm max-w-md text-center mt-2">
                            Eğitim serileri (Journeys), birden fazla kursu sırasıyla birleştirmenizi sağlar.
                            Örn: "Oryantasyon Haftası" serisi (Kurs 1 -> Kurs 2 -> Kurs 3).
                        </p>
                        <button className="mt-6 text-primary font-bold hover:underline">Seri Oluşturucuyu Başlat</button>
                    </div>
                )}
            </>
        )}
    </div>
  );
};
