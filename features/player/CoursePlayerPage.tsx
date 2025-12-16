
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, CheckCircle, AlertCircle, BookOpen, Share2, Heart, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCourse, updateUserProgress } from '../../services/db';
import { Course, StoryCard } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';

export const CoursePlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Interaction State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Deep Dive Sheet
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
        if(courseId) {
            const c = await getCourse(courseId);
            setCourse(c);
            setLoading(false);
        }
    };
    fetch();
  }, [courseId]);

  if (loading || !course) return <div className="bg-black h-screen" />;

  const currentCard = course.steps[currentIndex] as StoryCard;
  const isLastCard = currentIndex === course.steps.length - 1;

  // FIX 3: Crash Protection
  // If a Quiz card has no valid interaction data, allow skip.
  const isQuizBroken = currentCard.type === 'QUIZ' && (!currentCard.interaction || !currentCard.interaction.options);

  const handleNext = () => {
      // Block unless answered, EXCEPT if the quiz is broken (allow bypass)
      if (currentCard.type === 'QUIZ' && !isAnswered && !isQuizBroken) return; 
      
      if (currentIndex < course.steps.length - 1) {
          setCurrentIndex(prev => prev + 1);
          // Reset Quiz State
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
          // Reset Quiz State (Optional: Keep history?)
          setSelectedOption(null);
          setIsAnswered(false);
      }
  };

  const handleQuizAnswer = (optionIndex: number) => {
      if (isAnswered) return;
      
      const correctIndex = currentCard.interaction?.correctOptionIndex;
      const isRight = optionIndex === correctIndex;
      
      setSelectedOption(optionIndex);
      setIsAnswered(true);
      setIsCorrect(isRight);

      if (isRight) {
          confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#D4AF37', '#ffffff'] // Gold & White
          });
      }
  };

  const finishCourse = async () => {
      if (currentUser && courseId) {
          await updateUserProgress(currentUser.id, courseId, course.xpReward);
      }
      navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
        
        {/* STORY CONTAINER (Mobile Aspect Ratio) */}
        <div className="relative w-full h-full md:max-w-md md:h-[90vh] md:rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
            
            {/* 1. PROGRESS BARS */}
            <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
                {course.steps.map((step, idx) => (
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

            {/* 2. TOP ACTIONS */}
            <div className="absolute top-6 left-0 right-0 z-30 flex justify-between items-center px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                        <img src="https://ui-avatars.com/api/?name=Hotel+Academy&background=random" className="w-full h-full rounded-full" />
                    </div>
                    <span className="text-white font-bold text-sm shadow-black drop-shadow-md">Hotel Academy</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/')} className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 3. CARD CONTENT */}
            <AnimatePresence mode='wait'>
                <motion.div 
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 w-full h-full"
                >
                    {/* Background Media */}
                    <img 
                        src={currentCard.mediaUrl} 
                        className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />

                    {/* TAP ZONES */}
                    <div className="absolute inset-0 z-10 flex">
                        <div className="w-1/3 h-full" onClick={handlePrev} />
                        <div className="w-2/3 h-full" onClick={handleNext} />
                    </div>

                    {/* CONTENT OVERLAY */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 pb-24 z-20 pointer-events-none"> {/* Padding for bottom sheet handle */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="inline-block px-3 py-1 rounded-lg bg-accent text-primary text-xs font-bold mb-3 uppercase tracking-wider">
                                {currentCard.type}
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-4 leading-tight drop-shadow-xl">
                                {currentCard.title}
                            </h1>
                            <p className="text-lg text-gray-200 mb-8 leading-relaxed font-medium drop-shadow-md whitespace-pre-wrap">
                                {currentCard.content}
                            </p>

                            {/* QUIZ INTERACTION */}
                            {currentCard.type === 'QUIZ' && (
                                isQuizBroken ? (
                                    <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-white text-sm flex items-center gap-2 pointer-events-auto">
                                        <AlertTriangle className="w-5 h-5" />
                                        <span>Soru yüklenemedi. Ekrana dokunarak geçebilirsiniz.</span>
                                    </div>
                                ) : (
                                    currentCard.interaction && (
                                        <div className="flex flex-col gap-3 pointer-events-auto">
                                            {currentCard.interaction.options?.map((option, idx) => {
                                                let bgClass = "bg-white/20 backdrop-blur-md text-white border-white/20";
                                                if (isAnswered) {
                                                    if (idx === currentCard.interaction?.correctOptionIndex) bgClass = "bg-green-500 text-white border-green-500";
                                                    else if (idx === selectedOption && !isCorrect) bgClass = "bg-red-500 text-white border-red-500";
                                                    else bgClass = "bg-white/10 text-gray-400 border-transparent";
                                                }

                                                return (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => handleQuizAnswer(idx)}
                                                        disabled={isAnswered}
                                                        className={`p-4 rounded-xl text-left font-bold text-sm border-2 transition-all active:scale-98 ${bgClass}`}
                                                    >
                                                        {option}
                                                        {isAnswered && idx === currentCard.interaction?.correctOptionIndex && <CheckCircle className="inline ml-2 w-4 h-4" />}
                                                    </button>
                                                );
                                            })}
                                            
                                            {isAnswered && (
                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-2 p-3 rounded-lg text-sm font-bold ${isCorrect ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
                                                    {isCorrect ? "Harika! Doğru Cevap." : "Hata! Tekrar dene."}
                                                    {currentCard.interaction.explanation && <div className="mt-1 font-normal opacity-80">{currentCard.interaction.explanation}</div>}
                                                </motion.div>
                                            )}
                                        </div>
                                    )
                                )
                            )}

                            {/* REWARD CARD EXTRA */}
                            {currentCard.type === 'XP_REWARD' && (
                                <div className="pointer-events-auto mt-4">
                                    <button onClick={finishCourse} className="w-full bg-accent text-primary font-bold py-4 rounded-xl shadow-xl hover:scale-105 transition-transform">
                                        Ödülünü Al (+{course.xpReward} XP)
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* 4. DEEP DIVE SHEET TRIGGER */}
            <div 
                className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black to-transparent pt-10 pb-4 flex justify-center cursor-pointer"
                onClick={() => setIsDeepDiveOpen(true)}
            >
                <div className="flex flex-col items-center gap-1 animate-bounce">
                    <ChevronDown className="w-6 h-6 text-white/50 rotate-180" />
                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest">Derinlemesine Öğren</span>
                </div>
            </div>

            {/* 5. DEEP DIVE SHEET */}
            <AnimatePresence>
                {isDeepDiveOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm"
                            onClick={() => setIsDeepDiveOpen(false)}
                        />
                        <motion.div 
                            initial={{ y: '100%' }} animate={{ y: '20%' }} exit={{ y: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute inset-0 bg-white rounded-t-[2rem] z-50 overflow-y-auto p-6 pb-32"
                        >
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
                            
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Detaylı Kaynak</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                                <BookOpen className="w-4 h-4" />
                                <span>{course.deepDiveResource?.type || "PDF Dokümanı"}</span>
                            </div>

                            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                                <p>{course.description}</p>
                                <p className="mt-4 font-bold text-gray-800">
                                    Bu mikro eğitim, aşağıdaki ana kaynaktan özetlenmiştir:
                                </p>
                                
                                {course.deepDiveResource ? (
                                    <a 
                                        href={course.deepDiveResource.url} 
                                        target="_blank" 
                                        className="block mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary transition-colors group"
                                    >
                                        <div className="font-bold text-primary group-hover:underline">{course.deepDiveResource.title}</div>
                                        <div className="text-xs text-gray-400 mt-1">{course.deepDiveResource.url}</div>
                                    </a>
                                ) : (
                                    <div className="p-6 bg-gray-100 rounded-xl text-center text-gray-400 italic">
                                        Ek kaynak bulunamadı.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    </div>
  );
};
