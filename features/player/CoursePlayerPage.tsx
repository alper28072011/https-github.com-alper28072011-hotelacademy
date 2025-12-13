import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, CheckCircle, ArrowRight, RotateCcw, AlertTriangle, Loader2, Globe, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCourse, updateUserProgress } from '../../services/db';
import { Course } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAppStore } from '../../stores/useAppStore';
import { translateContent } from '../../services/geminiService';

export const CoursePlayerPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { currentUser } = useAuthStore();
  const { currentLanguage } = useAppStore();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [quizError, setQuizError] = useState(false);

  // Translation State
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedData, setTranslatedData] = useState<{ title: string; description: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch Course Data
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) return;
      setLoading(true);
      const data = await getCourse(courseId);
      if (data) {
        setCourse(data);
      } else {
        console.error("Course not found");
        setTimeout(() => navigate('/'), 2000);
      }
      setLoading(false);
    };
    fetchCourseData();
  }, [courseId, navigate]);

  const currentStep = course?.steps[currentStepIndex];
  const totalSteps = course?.steps.length || 0;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Handle Video Autoplay on Step Change
  useEffect(() => {
    if (currentStep?.type === 'video' && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
        
        // Reset translation on step change
        setTranslatedData(null);
    }
  }, [currentStepIndex, currentStep?.type]);

  const handleNext = async () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Course Finish
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#0B1E3B', '#ffffff']
      });

      if (currentUser && courseId) {
        await updateUserProgress(currentUser.id, courseId, 150); 
      }

      setTimeout(() => navigate('/'), 2000);
    }
  };

  const handleTranslate = async () => {
      if (!currentStep || isTranslating) return;
      
      // If already translated, toggle off
      if (translatedData) {
          setTranslatedData(null);
          return;
      }

      setIsTranslating(true);
      
      // Determine target language name
      const langMap: Record<string, string> = {
          'en': 'English', 'tr': 'Turkish', 'ru': 'Russian', 'ar': 'Arabic', 'de': 'German'
      };
      const targetLangName = langMap[currentLanguage] || 'English';

      const tTitle = await translateContent(currentStep.title, targetLangName);
      const tDesc = currentStep.description ? await translateContent(currentStep.description, targetLangName) : '';

      setTranslatedData({ title: tTitle, description: tDesc });
      setIsTranslating(false);
  };

  const handleQuizAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      handleNext();
    } else {
      setQuizError(true);
      setTimeout(() => {
        setQuizError(false);
        if (course) {
            let prevVideoIndex = currentStepIndex - 1;
            while(prevVideoIndex >= 0 && course.steps[prevVideoIndex].type !== 'video') {
                prevVideoIndex--;
            }
            if (prevVideoIndex >= 0) setCurrentStepIndex(prevVideoIndex);
        }
      }, 2000);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  if (loading) {
    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center text-white">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
    );
  }

  if (!currentStep) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      
      {/* Top Bar (Overlay) */}
      <div className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent h-32">
        <div className="absolute top-0 left-0 h-1 bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
        
        <button 
          onClick={() => navigate('/')}
          className="bg-white/10 backdrop-blur-md rounded-full p-2 text-white hover:bg-white/20 active:scale-95 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex gap-2">
            {currentStep.type === 'video' && (
                <button 
                    onClick={handleTranslate}
                    className={`backdrop-blur-md rounded-full px-3 py-2 text-white transition-all flex items-center gap-2 ${translatedData ? 'bg-accent text-primary font-bold' : 'bg-white/10 hover:bg-white/20'}`}
                >
                    {isTranslating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
                    <span className="text-xs font-bold hidden md:block">
                        {translatedData ? 'Original' : 'Translate'}
                    </span>
                </button>
            )}

            {currentStep.type === 'video' && (
            <button 
                onClick={toggleMute}
                className="bg-white/10 backdrop-blur-md rounded-full p-2 text-white hover:bg-white/20 active:scale-95 transition-all"
            >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            )}
        </div>
      </div>

      {/* Main Content Area with Transitions */}
      <div className="flex-1 relative w-full h-full bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '-100%', opacity: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 w-full h-full"
          >
            {/* RENDER VIDEO STEP */}
            {currentStep.type === 'video' && (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  src={currentStep.videoUrl}
                  poster={currentStep.posterUrl}
                  playsInline
                  loop
                  muted={isMuted}
                />
                
                {/* Bottom Overlay Gradient */}
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-primary via-primary/80 to-transparent pointer-events-none" />
                
                {/* Text Content */}
                <div className="absolute bottom-32 left-0 right-0 p-6 text-white z-20">
                  <div className="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm px-3 py-1 rounded-full mb-3 border border-accent/30">
                     <span className="text-accent text-xs font-bold uppercase tracking-wider">
                       {t('player_step')} {currentStepIndex + 1}/{totalSteps}
                     </span>
                  </div>
                  
                  {/* Dynamic Translated Content */}
                  <motion.div
                    key={translatedData ? 'trans' : 'orig'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                  >
                     {translatedData && (
                         <div className="absolute -top-6 left-0 text-accent text-[10px] font-bold flex items-center gap-1">
                             <Sparkles className="w-3 h-3" /> AI Translated
                         </div>
                     )}
                     <h2 className="text-3xl font-bold mb-2 leading-tight drop-shadow-md">
                        {translatedData ? translatedData.title : currentStep.title}
                     </h2>
                     <p className="text-gray-200 text-lg leading-relaxed opacity-90 drop-shadow-sm">
                        {translatedData ? translatedData.description : currentStep.description}
                     </p>
                  </motion.div>

                </div>
              </div>
            )}

            {/* RENDER QUIZ STEP */}
            {currentStep.type === 'quiz' && (
              <div className="relative w-full h-full bg-primary flex flex-col items-center justify-center p-6">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                
                <div className="relative z-10 w-full max-w-md">
                    <h2 className="text-accent text-lg font-bold uppercase tracking-widest text-center mb-2">
                        {t('player_quiz_title')}
                    </h2>
                    <h3 className="text-2xl md:text-3xl text-white font-bold text-center mb-12 leading-tight">
                        {currentStep.question}
                    </h3>

                    <div className="flex flex-col gap-4">
                        {currentStep.options?.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => handleQuizAnswer(option.isCorrect)}
                                className="group relative w-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-accent hover:border-accent text-left transition-all active:scale-[0.98] overflow-hidden"
                            >
                                <span className="relative z-10 text-xl font-medium text-white group-hover:text-primary transition-colors">
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {quizError && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 bg-red-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white"
                    >
                        <AlertTriangle className="w-20 h-20 mb-4 animate-bounce" />
                        <h3 className="text-2xl font-bold text-center px-8">
                            {t('player_quiz_retry')}
                        </h3>
                        <RotateCcw className="w-8 h-8 mt-8 animate-spin-slow" />
                    </motion.div>
                )}
              </div>
            )}

            {currentStep.type !== 'quiz' && (
                <div className="absolute bottom-8 left-6 right-6 z-30">
                  <button
                    onClick={handleNext}
                    className="w-full bg-accent text-primary text-xl font-bold py-5 rounded-2xl shadow-lg shadow-accent/20 active:scale-95 transition-transform flex items-center justify-center gap-3 animate-pulse-slow"
                  >
                    {currentStepIndex === totalSteps - 1 ? (
                        <>
                           {t('player_finish_course')} <CheckCircle className="w-6 h-6" />
                        </>
                    ) : (
                        <>
                           {t('player_complete_step')} <ArrowRight className="w-6 h-6" />
                        </>
                    )}
                  </button>
                </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
