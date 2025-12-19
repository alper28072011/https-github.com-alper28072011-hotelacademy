
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Save, GripVertical, Trash2, Milestone, Loader2, ArrowRight } from 'lucide-react';
import { Course, DepartmentType, CareerPath } from '../../types';
import { getCourses, createCareerPath, getCareerPaths } from '../../services/db';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { getLocalizedContent } from '../../i18n/config';

export const CareerBuilder: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [existingPaths, setExistingPaths] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { currentOrganization } = useOrganizationStore();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('housekeeping');
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchData();
  }, [currentOrganization]);

  const fetchData = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    const [c, p] = await Promise.all([getCourses(currentOrganization.id), getCareerPaths(currentOrganization.id)]);
    setCourses(c);
    setExistingPaths(p);
    setLoading(false);
  };

  const handleAddCourse = (courseId: string) => {
      const course = courses.find(c => c.id === courseId);
      if (course && !selectedCourses.find(c => c.id === course.id)) {
          setSelectedCourses([...selectedCourses, course]);
      }
  };

  const handleRemoveCourse = (index: number) => {
      const newCourses = [...selectedCourses];
      newCourses.splice(index, 1);
      setSelectedCourses(newCourses);
  };

  const handleSave = async () => {
      if (!title || !targetRole || selectedCourses.length === 0 || !currentOrganization) return;
      setLoading(true);
      
      const newPath: Omit<CareerPath, 'id'> = {
          organizationId: currentOrganization.id,
          title,
          description,
          targetRole,
          department,
          courseIds: selectedCourses.map(c => c.id)
      };

      const success = await createCareerPath(newPath);
      if (success) {
          setIsCreating(false);
          setTitle('');
          setDescription('');
          setTargetRole('');
          setSelectedCourses([]);
          fetchData(); // Refresh list
      }
      setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Kariyer Yolları</h1>
            <p className="text-gray-500">Personel için gelişim haritaları tasarla.</p>
        </div>
        {!isCreating && (
            <button 
                onClick={() => setIsCreating(true)}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            >
                <Plus className="w-5 h-5" />
                Yeni Yol Oluştur
            </button>
        )}
      </div>

      {isCreating ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
              {/* Left: Configuration */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                  <h3 className="font-bold text-lg text-primary mb-2">Yol Detayları</h3>
                  
                  <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1">Yol Başlığı</label>
                      <input 
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary"
                        placeholder="Örn: Housekeeping Liderlik Yolu"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                      />
                  </div>

                  <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1">Hedef Rol</label>
                      <input 
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary"
                        placeholder="Örn: Kat Şefi"
                        value={targetRole}
                        onChange={e => setTargetRole(e.target.value)}
                      />
                  </div>

                  <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1">Departman</label>
                      <div className="flex flex-wrap gap-2">
                          {['housekeeping', 'kitchen', 'front_office', 'management'].map(d => (
                              <button
                                key={d}
                                onClick={() => setDepartment(d as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border ${
                                    department === d 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-white text-gray-500 border-gray-200'
                                }`}
                              >
                                  {d.replace('_', ' ')}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1">Açıklama</label>
                      <textarea 
                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary"
                        rows={3}
                        placeholder="Bu yolculuk sonunda personel ne kazanacak?"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                      />
                  </div>

                  <div className="h-px bg-gray-100 my-2" />
                  
                  <div className="flex gap-4">
                      <button onClick={() => setIsCreating(false)} className="flex-1 py-3 text-gray-500 font-bold">İptal</button>
                      <button 
                        onClick={handleSave}
                        disabled={loading || selectedCourses.length === 0}
                        className="flex-[2] bg-accent text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                      >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          Kaydet
                      </button>
                  </div>
              </div>

              {/* Right: Path Builder */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
                   <h3 className="font-bold text-lg text-primary mb-4">Müfredat</h3>
                   
                   {/* Selected List */}
                   <div className="flex-1 min-h-[200px] bg-gray-50 rounded-2xl p-4 mb-4 border border-dashed border-gray-300">
                       {selectedCourses.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-gray-400">
                               <Milestone className="w-8 h-8 mb-2 opacity-50" />
                               <p className="text-sm">Henüz ders eklenmedi.</p>
                               <p className="text-xs">Aşağıdan ders seçin.</p>
                           </div>
                       ) : (
                           <div className="flex flex-col gap-2 relative">
                               {/* Path Line */}
                               <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200 border-l-2 border-dashed border-gray-300 z-0" />
                               
                               {selectedCourses.map((course, idx) => (
                                   <motion.div 
                                      key={`${course.id}_${idx}`}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="relative z-10 flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-200"
                                   >
                                       <div className="w-6 h-6 rounded-full bg-accent text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                           {idx + 1}
                                       </div>
                                       <div className="flex-1">
                                           <div className="text-sm font-bold text-gray-800 line-clamp-1">{getLocalizedContent(course.title)}</div>
                                           <div className="text-xs text-gray-500">{course.duration} dk • {course.xpReward} XP</div>
                                       </div>
                                       <button onClick={() => handleRemoveCourse(idx)} className="text-gray-400 hover:text-red-500">
                                           <Trash2 className="w-4 h-4" />
                                       </button>
                                   </motion.div>
                               ))}
                           </div>
                       )}
                   </div>

                   {/* Add Course Dropdown/List */}
                   <div>
                       <label className="text-sm font-bold text-gray-700 block mb-2">Ders Ekle</label>
                       <select 
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none"
                          onChange={(e) => {
                              if(e.target.value) {
                                  handleAddCourse(e.target.value);
                                  e.target.value = "";
                              }
                          }}
                        >
                           <option value="">Bir ders seçin...</option>
                           {courses.map(c => (
                               <option key={c.id} value={c.id}>{getLocalizedContent(c.title)}</option>
                           ))}
                       </select>
                   </div>
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {existingPaths.map(path => (
                  <div key={path.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                      
                      <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                  {path.department.replace('_', ' ')}
                              </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1 leading-tight">{path.title}</h3>
                          <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{path.description}</p>
                          
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <Milestone className="w-5 h-5 text-accent" />
                              <span>{path.courseIds.length} Adım</span>
                              <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                              <span className="text-primary font-bold">{path.targetRole}</span>
                          </div>
                      </div>
                  </div>
              ))}
              {existingPaths.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
                      Henüz bir kariyer yolu oluşturulmadı.
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
