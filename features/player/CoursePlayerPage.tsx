
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo, Variants } from 'framer-motion';
import { X, ChevronDown, BookOpen, AlertTriangle, Loader2, ChevronUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCourse, completeCourse, saveCourseProgress } from '../../services/db';
import { getTopicsByCourse, getModulesByTopic } from '../../services/courseService';
import { Course, StoryCard } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { getLocalizedContent } from '../../i18n/config';
import { useTelemetry } from '../../hooks/useTelemetry'; // NEW

// Animation Variants for Vertical Scroll
const slideVariants: Variants = {
    enter: (direction: number) => ({
        y: direction > 0 ? '100%' : '-100%',
        opacity: 1,
        scale: 0.95
    }),
    center: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
            y: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
        }
    },
    exit: (direction: number) => ({
        y: direction < 0 ? '100%' : '-100%',
        opacity: 1,
        scale: 0.95,
        transition: {
            y: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
        }
    })
};

export const CoursePlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { currentUser, refreshProfile } = useAuthStore();
  const { logEvent } = useTelemetry(); // New Hook
  
  const [course, setCourse] = useState<Course | null>(null);
  const [playlist, setPlaylist] = useState<StoryCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0); 
  
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  // Time Tracking Refs
  const slideStartTimeRef = useRef(Date.now());
  const courseStartTimeRef = useRef(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchContent = async () => {
        if(!courseId || !currentUser) return;
        setLoading(true);

        try {
            const c = await getCourse(courseId);
            if (!c) {
                setLoading(false);
                return;
            }
            setCourse(c);

            let finalPlaylist: StoryCard[] = [];

            if (c.topicIds && c.topicIds.length > 0) {
                const topics = await getTopicsByCourse(c.id);
                for (const topic of topics) {
                    const modules = await getModulesByTopic(topic.id);
                    for (const mod of modules) {
                        if (mod.content && mod.content.length > 0) {
                            finalPlaylist = [...finalPlaylist, ...mod.content];
                        }
                    }
                }
            } else {
                finalPlaylist = c.steps || [];
            }

            setPlaylist(finalPlaylist);

            if (currentUser.progressMap && currentUser.progressMap[courseId]) {
                const progress = currentUser.progressMap[courseId];
                if (progress.status === 'IN_PROGRESS' && progress.currentCardIndex > 0 && progress.currentCardIndex < finalPlaylist.length) {
                    setCurrentIndex(progress.currentCardIndex);
                }
            }

            courseStartTimeRef.current = Date.now();
            slideStartTimeRef.current = Date.now(); // Reset slide timer

        } catch (e) {
            console.error("Player Load Error:", e);
        } finally {
            setLoading(false);
        }
    };
    fetchContent();
  }, [courseId, currentUser]);

  // --- ANALYTICS: Track Slide Duration & Transition ---
  useEffect(() => {
      const currentCard = playlist[currentIndex];
      if (!currentCard || !course) return;

      // 1. Log previous slide end (if any) -> Effectively done by start of next, but for cleaner data we track "View" here
      
      // Reset Timer
      slideStartTimeRef.current = Date.now();

      // Log Slide Entry
      logEvent('SLIDE_VIEW', 
        { courseId: course.id, targetId: currentCard.id, component: 'CoursePlayer' }, 
        { meta: { slideType: currentCard.type, slideIndex: currentIndex } }
      );

      // Save progress
      if (currentUser && courseId) {
          const save = async () => {
              if (currentIndex < playlist.length - 1) {
                  await saveCourseProgress(currentUser.id, courseId, currentIndex, playlist.length);
              }
          };
          const timeout = setTimeout(save, 500);
          return () => {
              clearTimeout(timeout);
              // Log Duration on exit (cleanup)
              const duration = Date.now() - slideStartTimeRef.current;
              // We only log if meaningful duration (>500ms)
              if (duration > 500) {
                  logEvent('SLIDE_VIEW', 
                    { courseId: course?.id, targetId: currentCard.id, component: 'CoursePlayer' },
                    { duration }
                  );
              }
          };
      }
  }, [currentIndex, course?.id, playlist.length]);

  // Hide hint after 3 seconds
  useEffect(() => {
      const timer = setTimeout(() => setShowSwipeHint(false), 3000);
      return () => clearTimeout(timer);
  }, []);

  if (loading) return <div className="bg-black h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  
  if (!course || playlist.length === 0) {
      return (
          <div className="bg-black h-screen flex flex-col items-center justify-center text-white px-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">İçerik Bulunamadı</h2>
              <button onClick={() => navigate('/')} className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm">Geri Dön</button>
          </div>
      );
  }

  const currentCard = playlist[currentIndex];
  if (!currentCard) return null;

  const isQuizBroken = currentCard.type === 'QUIZ' && 
    (!currentCard.interaction || !Array.isArray(currentCard.interaction.options) || currentCard.interaction.options.length === 0);

  // --- NAVIGATION LOGIC ---

  const handleNext = () => {
      // Block if Quiz not answered
      if (currentCard.type === 'QUIZ' && !isAnswered && !isQuizBroken) {
          alert("Lütfen devam etmeden önce soruyu yanıtlayın.");
          return;
      }
      
      if (currentIndex < playlist.length - 1) {
          setDirection(1);
          setCurrentIndex(prev => prev + 1);
          resetCardState();
      } else {
          finishCourse();
      }
  };

  const handlePrev = () => {
      if (currentIndex > 0) {
          setDirection(-1);
          setCurrentIndex(prev => prev - 1);
          resetCardState();
      }
  };

  const resetCardState = () => {
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(false);
  };

  // --- GESTURE HANDLER ---
  const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      if (info.offset.y < -threshold) {
          handleNext();
      } else if (info.offset.y > threshold) {
          handlePrev();
      }
  };

  const handleQuizAnswer = (optionIndex: number) => {
      if (isAnswered || !currentCard.interaction) return;
      
      const correctIndex = currentCard.interaction.correctOptionIndex;
      const isRight = optionIndex === correctIndex;
      const timeToAnswer = Date.now() - slideStartTimeRef.current; // Thinking time
      
      setSelectedOption(optionIndex);
      setIsAnswered(true);
      setIsCorrect(isRight);

      // Deep Analytics for Quiz
      logEvent('QUIZ_ATTEMPT', {
          courseId: course.id,
          targetId: currentCard.id,
      }, {
          duration: timeToAnswer, // How long they thought
          isSuccess: isRight,
          quizAnswer: optionIndex,
          meta: { question: getLocalizedContent(currentCard.interaction.question) }
      });

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
          
          const timeSpentSeconds = Math.floor((Date.now() - courseStartTimeRef.current) / 1000);
          
          // Enhanced Completion Log
          logEvent('VIDEO_COMPLETE', { // Or COURSE_COMPLETE if we add that type
              courseId: course.id,
              organizationId: course.organizationId
          }, { 
              duration: timeSpentSeconds * 1000,
              percentage: 100 
          });
          
          await refreshProfile();
      }
      navigate('/');
  };

  // Video Event Handlers
  const onVideoPlay = () => logEvent('VIDEO_PLAY', { courseId: course.id, targetId: currentCard.id });
  const onVideoPause = () => logEvent('VIDEO_PAUSE', { courseId: course.id, targetId: currentCard.id }, { videoTime: videoRef.current?.currentTime });
  const onVideoSeeked = () => logEvent('VIDEO_SEEK', { courseId: course.id, targetId: currentCard.id }, { videoTime: videoRef.current?.currentTime });

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden">
        
        {/* DESKTOP CONTAINER WRAPPER */}
        <div className="relative w-full h-full md:max-w-md md:h-[90vh] md:rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
            
            {/* STATIC PROGRESS BARS */}
            <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
                {playlist.map((step, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-white rounded-full transition-all duration-300 ${idx <= currentIndex ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </div>
                ))}
            </div>

            {/* HEADER */}
            <div className="absolute top-6 left-0 right-0 z-30 flex justify-between items-center px-4">
                <div className="flex items-center gap-2">
                    <span className="text-white font-black text-xs shadow-black drop-shadow-md tracking-widest uppercase">Hotel Academy</span>
                </div>
                <button onClick={() => navigate('/')} className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* MAIN SLIDER AREA */}
            <div className="absolute inset-0 w-full h-full bg-black">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div 
                        key={currentIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={onDragEnd}
                        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing bg-gray-900"
                    >
                        {/* BACKGROUND MEDIA */}
                        <div className="absolute inset-0">
                            {currentCard.mediaUrl?.endsWith('.mp4') ? (
                                <video 
                                    ref={videoRef}
                                    src={currentCard.mediaUrl} 
                                    className="w-full h-full object-cover" 
                                    autoPlay 
                                    muted={false} // Allow sound if user wants, usually better UX to start muted or allow unmute
                                    loop 
                                    playsInline
                                    onPlay={onVideoPlay}
                                    onPause={onVideoPause}
                                    onSeeked={onVideoSeeked}
                                />
                            ) : (
                                <img src={currentCard.mediaUrl} className="w-full h-full object-cover" alt="Slide" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />
                        </div>

                        {/* CONTENT OVERLAY */}
                        <div className="absolute bottom-0 left-0 right-0 p-8 pb-24 z-20 pointer-events-none">
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                                <div className="inline-block px-2 py-0.5 rounded bg-accent text-primary text-[10px] font-black mb-3 uppercase tracking-widest">
                                    {currentCard.type}
                                </div>
                                
                                <h1 className="text-3xl font-black text-white mb-4 leading-tight drop-shadow-2xl">
                                    {getLocalizedContent(currentCard.title)}
                                </h1>
                                <p className="text-lg text-gray-200 mb-8 leading-relaxed font-medium drop-shadow-md whitespace-pre-wrap">
                                    {getLocalizedContent(currentCard.content)}
                                </p>

                                {/* QUIZ INTERACTION */}
                                {currentCard.type === 'QUIZ' && (
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
                                                <button 
                                                    key={idx} 
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={() => handleQuizAnswer(idx)} 
                                                    disabled={isAnswered} 
                                                    className={`p-4 rounded-2xl text-left font-bold text-sm border-2 transition-all active:scale-[0.98] ${bgClass}`}
                                                >
                                                    {getLocalizedContent(option)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* SWIPE HINT */}
            <AnimatePresence>
                {showSwipeHint && currentIndex === 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none z-40"
                    >
                        <div className="flex flex-col items-center gap-2 animate-bounce">
                            <ChevronUp className="w-6 h-6 text-white/50" />
                            <span className="text-white/50 text-xs font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur">Kaydır</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DEEP DIVE TOGGLE */}
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 to-transparent pt-10 pb-6 flex justify-center cursor-pointer" onClick={() => setIsDeepDiveOpen(true)}>
                <div className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                    <ChevronDown className="w-5 h-5 text-white" />
                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Detaylar</span>
                </div>
            </div>

            {/* DEEP DIVE DRAWER */}
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
