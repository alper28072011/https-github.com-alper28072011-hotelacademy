
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCourse, completeCourse, saveCourseProgress } from '../../services/db';
import { getTopicsByCourse, getModulesByTopic } from '../../services/courseService';
import { Course, StoryCard } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { logEvent, createEventPayload } from '../../services/analyticsService';
import { getLocalizedContent } from '../../i18n/config';

export const CoursePlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { currentUser, refreshProfile } = useAuthStore();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [playlist, setPlaylist] = useState<StoryCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

  // Time Tracking
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const fetchContent = async () => {
        if(!courseId || !currentUser) return;
        setLoading(true);

        try {
            // 1. Fetch Course Meta
            const c = await getCourse(courseId);
            if (!c) {
                setLoading(false);
                return;
            }
            setCourse(c);

            // 2. Build Playlist (Flatten Hierarchy)
            let finalPlaylist: StoryCard[] = [];

            if (c.topicIds && c.topicIds.length > 0) {
                // NEW STRUCTURE: Fetch Topics -> Modules -> Content
                const topics = await getTopicsByCourse(c.id);
                
                for (const topic of topics) {
                    const modules = await getModulesByTopic(topic.id);
                    for (const mod of modules) {
                        if (mod.content && mod.content.length > 0) {
                            // Inject context if needed, or just push cards
                            finalPlaylist = [...finalPlaylist, ...mod.content];
                        }
                    }
                }
            } else {
                // LEGACY STRUCTURE
                finalPlaylist = c.steps || [];
            }

            setPlaylist(finalPlaylist);

            // 3. Resume Progress
            if (currentUser.progressMap && currentUser.progressMap[courseId]) {
                const progress = currentUser.progressMap[courseId];
                if (progress.status === 'IN_PROGRESS' && progress.currentCardIndex > 0 && progress.currentCardIndex < finalPlaylist.length) {
                    setCurrentIndex(progress.currentCardIndex);
                }
            }

            // 4. Analytics
            logEvent(createEventPayload(currentUser, {
                pageId: c.organizationId || 'unknown',
                channelId: c.channelId,
                contentId: c.id
            }, 'VIEW'));
            startTimeRef.current = Date.now();

        } catch (e) {
            console.error("Player Load Error:", e);
        } finally {
            setLoading(false);
        }
    };
    fetchContent();
  }, [courseId, currentUser]);

  // SAVE PROGRESS
  useEffect(() => {
      if (course && currentUser && courseId && playlist.length > 0) {
          const save = async () => {
              if (currentIndex < playlist.length - 1) {
                  await saveCourseProgress(currentUser.id, courseId, currentIndex, playlist.length);
              }
          };
          const timeout = setTimeout(save, 500);
          return () => clearTimeout(timeout);
      }
  }, [currentIndex, course, currentUser, playlist.length]);

  if (loading) return <div className="bg-black h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  
  if (!course || playlist.length === 0) {
      return (
          <div className="bg-black h-screen flex flex-col items-center justify-center text-white px-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">İçerik Bulunamadı</h2>
              <p className="text-gray-400 text-sm mb-6">Bu kursun içeriği henüz hazırlanmamış veya yüklenirken bir hata oluştu.</p>
              <button onClick={() => navigate('/')} className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm">Geri Dön</button>
          </div>
      );
  }

  const currentCard = playlist[currentIndex];

  // Defensive check for card data integrity
  if (!currentCard) return null;

  const isQuizBroken = currentCard.type === 'QUIZ' && 
    (!currentCard.interaction || !Array.isArray(currentCard.interaction.options) || currentCard.interaction.options.length === 0);

  const handleNext = () => {
      if (currentCard.type === 'QUIZ' && !isAnswered && !isQuizBroken) return; 
      
      if (currentIndex < playlist.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setSelectedOption(null);
          setIsAnswered(false);
          setIsCorrect(false);
      } else {
          finishCourse();
      }
  };

  const handlePrev = () => {
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          setSelectedOption(null);
          setIsAnswered(false);
      }
  };

  const handleQuizAnswer = (optionIndex: number) => {
      if (isAnswered || !currentCard.interaction) return;
      
      const correctIndex = currentCard.interaction.correctOptionIndex;
      const isRight = optionIndex === correctIndex;
      
      setSelectedOption(optionIndex);
      setIsAnswered(true);
      setIsCorrect(isRight);

      if (currentUser && course) {
          logEvent(createEventPayload(currentUser, {
              pageId: course.organizationId || 'unknown',
              channelId: course.channelId,
              contentId: course.id
          }, 'QUIZ_ANSWER', {
              question: getLocalizedContent(currentCard.interaction.question),
              selectedOptionIndex: optionIndex,
              isCorrect: isRight
          }));
      }

      if (isRight) {
          confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#D4AF37', '#ffffff']
          });
      }
  };

  const finishCourse = async () => {
      if (currentUser && courseId && course) {
          await completeCourse(currentUser.id, courseId, course.xpReward, playlist.length);
          
          const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
          logEvent(createEventPayload(currentUser, {
              pageId: course.organizationId || 'unknown',
              channelId: course.channelId,
              contentId: course.id
          }, 'COMPLETE', { timeSpentSeconds: timeSpent }));

          await refreshProfile();
      }
      navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
        <div className="relative w-full h-full md:max-w-md md:h-[90vh] md:rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
            {/* PROGRESS BARS */}
            <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
                {playlist.map((step, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? '100%' : '0%' }}
                            transition={idx === currentIndex ? { duration: step.duration || 10, ease: 'linear' } : { duration: 0 }}
                            className="h-full bg-white rounded-full"
                            onAnimationComplete={() => {
                                if(idx === currentIndex && step.type !== 'QUIZ') handleNext();
                            }}
                        />
                    </div>
                ))}
            </div>

            <div className="absolute top-6 left-0 right-0 z-30 flex justify-between items-center px-4">
                <div className="flex items-center gap-2">
                    <span className="text-white font-black text-xs shadow-black drop-shadow-md tracking-widest uppercase">Hotel Academy</span>
                </div>
                <button onClick={() => navigate('/')} className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white"><X className="w-5 h-5" /></button>
            </div>

            <AnimatePresence mode='wait'>
                <motion.div 
                    key={currentIndex}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 w-full h-full"
                >
                    <img src={currentCard.mediaUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />

                    <div className="absolute inset-0 z-10 flex">
                        <div className="w-1/3 h-full" onClick={handlePrev} />
                        <div className="w-2/3 h-full" onClick={handleNext} />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-8 pb-24 z-20 pointer-events-none">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            <div className="inline-block px-2 py-0.5 rounded bg-accent text-primary text-[10px] font-black mb-3 uppercase tracking-widest">{currentCard.type}</div>
                            
                            <h1 className="text-3xl font-black text-white mb-4 leading-tight drop-shadow-2xl">
                                {getLocalizedContent(currentCard.title)}
                            </h1>
                            <p className="text-lg text-gray-200 mb-8 leading-relaxed font-medium drop-shadow-md whitespace-pre-wrap">
                                {getLocalizedContent(currentCard.content)}
                            </p>

                            {/* QUIZ INTERACTION */}
                            {currentCard.type === 'QUIZ' && (
                                isQuizBroken ? (
                                    <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-white text-sm flex items-center gap-2 pointer-events-auto">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                        <span>İçerik yüklenemedi. Atlamak için dokunun.</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 pointer-events-auto">
                                        <p className="text-white font-bold mb-2 text-sm uppercase opacity-60 tracking-wider">
                                            {getLocalizedContent(currentCard.interaction?.question)}
                                        </p>
                                        {currentCard.interaction?.options.map((option, idx) => {
                                            let bgClass = "bg-white/10 backdrop-blur-md text-white border-white/10 hover:bg-white/20";
                                            if (isAnswered) {
                                                if (idx === currentCard.interaction?.correctOptionIndex) bgClass = "bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/30";
                                                else if (idx === selectedOption && !isCorrect) bgClass = "bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/30";
                                                else bgClass = "bg-white/5 text-gray-500 border-transparent opacity-50";
                                            }
                                            return (
                                                <button key={idx} onClick={() => handleQuizAnswer(idx)} disabled={isAnswered} className={`p-4 rounded-2xl text-left font-bold text-sm border-2 transition-all active:scale-[0.98] ${bgClass}`}>
                                                    {getLocalizedContent(option)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 to-transparent pt-10 pb-6 flex justify-center cursor-pointer" onClick={() => setIsDeepDiveOpen(true)}>
                <div className="flex flex-col items-center gap-1 animate-bounce opacity-60">
                    <ChevronDown className="w-5 h-5 text-white rotate-180" />
                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Detaylar</span>
                </div>
            </div>

            <AnimatePresence>
                {isDeepDiveOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsDeepDiveOpen(false)} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: '25%' }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 30 }} className="absolute inset-0 bg-white rounded-t-[3rem] z-50 overflow-y-auto p-8 pb-32">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-gray-900 mb-4">Eğitim Özeti</h2>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                {getLocalizedContent(course.description)}
                            </p>
                            <div className="mt-8 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                                <div className="flex items-center gap-3 text-primary font-bold mb-2"><BookOpen className="w-5 h-5" /> Kaynak Bilgisi</div>
                                <p className="text-sm text-gray-500">Bu içerik yapay zeka tarafından işletme standartlarına uygun olarak özetlenmiştir.</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
};
