
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { CareerPath, Course } from '../../types';
import { getCareerPath, getCourse, getCareerPathByDepartment } from '../../services/db';
import { CheckCircle2, Lock, Play, Star, MapPin, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const JourneyMap: React.FC = () => {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [path, setPath] = useState<CareerPath | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJourney = async () => {
        if (!currentUser) return;
        setLoading(true);

        let activePath: CareerPath | null = null;

        // 1. Check if user has a specifically assigned path
        if (currentUser.assignedPathId) {
            activePath = await getCareerPath(currentUser.assignedPathId);
        }

        // 2. If no assigned path (or failed to fetch), auto-discover for department
        if (!activePath) {
            activePath = await getCareerPathByDepartment(currentUser.department);
        }

        if (activePath) {
            setPath(activePath);
            // Fetch specific courses in order
            const orderedCourses: Course[] = [];
            for(const id of activePath.courseIds) {
                const c = await getCourse(id);
                if(c) orderedCourses.push(c);
            }
            setCourses(orderedCourses);
        }
        setLoading(false);
    };
    loadJourney();
  }, [currentUser]);

  if (loading) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  if (!path) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">Henüz Bir Yol Yok</h2>
              <p className="text-gray-500 text-sm">Departmanınız ({currentUser?.department}) için henüz bir kariyer yolu tanımlanmamış. Yöneticinizle görüşün.</p>
          </div>
      );
  }

  // Calculate Progress
  const completedIds = currentUser?.completedCourses || [];
  const currentStepIndex = courses.findIndex(c => !completedIds.includes(c.id));
  const activeIndex = currentStepIndex === -1 ? courses.length : currentStepIndex; // If all done, index is length

  return (
    <div className="bg-primary-dark min-h-screen pb-24 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-primary-dark/80 backdrop-blur-md border-b border-white/10 p-6 z-20">
          <div className="flex justify-between items-start">
              <div>
                  <h1 className="text-2xl font-bold text-accent mb-1">{path.title}</h1>
                  <p className="text-xs text-white/60 uppercase tracking-widest font-bold">HEDEF: {path.targetRole}</p>
              </div>
              <div className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold border border-white/20">
                  {Math.round((completedIds.filter(id => path.courseIds.includes(id)).length / path.courseIds.length) * 100)}%
              </div>
          </div>
      </div>

      {/* Map Container */}
      <div className="max-w-md mx-auto p-6 relative">
          {/* Path Line */}
          <div className="absolute left-[2.25rem] top-10 bottom-10 w-1 bg-white/10 border-l-2 border-dashed border-white/20" />

          <div className="flex flex-col gap-12 relative z-10">
              {courses.map((course, index) => {
                  const isCompleted = completedIds.includes(course.id);
                  const isActive = index === activeIndex;
                  const isLocked = !isCompleted && !isActive;

                  return (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={course.id} 
                        className={`relative flex items-center gap-6 ${isLocked ? 'opacity-50 grayscale' : ''}`}
                      >
                          {/* Node Icon */}
                          <div className={`relative shrink-0 w-12 h-12 rounded-full border-4 flex items-center justify-center shadow-xl z-10 transition-transform ${
                              isCompleted 
                                ? 'bg-green-500 border-green-600 scale-90' 
                                : isActive 
                                    ? 'bg-accent border-primary scale-110' 
                                    : 'bg-gray-700 border-gray-600'
                          }`}>
                              {isCompleted ? (
                                  <CheckCircle2 className="w-6 h-6 text-white" />
                              ) : isActive ? (
                                  <div className="w-4 h-4 bg-primary rounded-full animate-ping" />
                              ) : (
                                  <Lock className="w-5 h-5 text-gray-400" />
                              )}
                          </div>

                          {/* Content Card */}
                          <div 
                             onClick={() => !isLocked && navigate(`/course/${course.id}`)}
                             className={`flex-1 p-4 rounded-2xl border transition-all ${
                                 isActive 
                                    ? 'bg-gradient-to-r from-white/10 to-white/5 border-accent shadow-lg shadow-accent/10 cursor-pointer hover:scale-[1.02]' 
                                    : isCompleted 
                                        ? 'bg-white/5 border-green-500/30'
                                        : 'bg-transparent border-white/5'
                             }`}
                          >
                              <div className="flex justify-between items-start mb-1">
                                  <span className="text-[10px] font-bold text-white/40 uppercase">ADIM {index + 1}</span>
                                  {isActive && <span className="bg-accent text-primary text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">AKTİF GÖREV</span>}
                              </div>
                              <h3 className={`font-bold text-lg mb-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>{course.title}</h3>
                              <div className="flex items-center gap-2 text-xs font-mono text-white/50">
                                  <span>{course.duration} dk</span>
                                  <span>•</span>
                                  <span className="text-accent flex items-center gap-1">+{course.xpReward} XP <Star className="w-3 h-3 fill-accent" /></span>
                              </div>
                              
                              {isActive && (
                                  <div className="mt-3 flex gap-2">
                                      <button className="bg-accent text-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                                          <Play className="w-3 h-3 fill-current" /> Başla
                                      </button>
                                  </div>
                              )}
                          </div>
                      </motion.div>
                  );
              })}

              {/* Final Goal */}
              <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: courses.length * 0.1 }}
                 className="flex items-center gap-6"
              >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 z-10 relative">
                      <Star className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div className="bg-gradient-to-r from-yellow-500/20 to-transparent p-4 rounded-2xl border border-yellow-500/30 flex-1">
                      <h3 className="font-bold text-yellow-500 text-lg uppercase tracking-wider">{path.targetRole}</h3>
                      <p className="text-xs text-yellow-200/60">Bu rozeti kazanmak için tüm adımları tamamla.</p>
                  </div>
              </motion.div>
          </div>
      </div>
    </div>
  );
};
