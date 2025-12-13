import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, CheckCircle2, Camera, ClipboardList, Clock, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOperationsStore } from '../../stores/useOperationsStore';
import { useProfileStore } from '../../stores/useProfileStore';

export const OperationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { tasks, fetchTasks, isShiftActive, shiftStartTime, toggleShift, markTaskComplete } = useOperationsStore();
  
  // Local state to force re-render for timer
  const [, setTick] = useState(0);

  // Sync tasks on mount
  useEffect(() => {
    if (currentUser?.department) {
        fetchTasks(currentUser.department);
    }
  }, [currentUser, fetchTasks]);

  // Timer Interval
  useEffect(() => {
    let interval: any;
    if (isShiftActive) {
        interval = setInterval(() => setTick(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isShiftActive]);

  // Calculate Duration
  const getDuration = () => {
    if (!shiftStartTime) return "00:00:00";
    const diff = Math.floor((Date.now() - shiftStartTime) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleTaskClick = async (taskId: string, xp: number) => {
    if (!currentUser) return;
    
    // 1. Visual Feedback (Confetti)
    confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#D4AF37', '#22c55e']
    });

    // 2. Call Store Action
    await markTaskComplete(currentUser.id, taskId, xp);

    // 3. Force refresh profile to see new XP immediately (Optimistic UI handled in DB listener usually)
    // Note: The listener in ProfileStore will pick this up automatically.
  };

  // Filter Tasks
  const completedTaskIds = currentUser?.completedTasks || [];
  const activeTasks = tasks.filter(t => !completedTaskIds.includes(t.id));
  const doneTasks = tasks.filter(t => completedTaskIds.includes(t.id));

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-24">
      
      {/* 1. SHIFT BUTTON (The "Clock In" Machine) */}
      <div className="flex flex-col items-center justify-center py-4">
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleShift}
            className={`relative w-64 h-64 rounded-full border-8 flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ${
                isShiftActive 
                ? 'bg-primary border-red-500 shadow-red-500/30' 
                : 'bg-surface border-green-500 shadow-green-500/30'
            }`}
        >
            {/* Pulse Effect when Active */}
            {isShiftActive && (
                <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-20" />
            )}

            <div className={`p-4 rounded-full mb-2 ${isShiftActive ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-600'}`}>
                {isShiftActive ? <Square className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current pl-1" />}
            </div>
            
            <span className={`text-xl font-bold uppercase tracking-widest ${isShiftActive ? 'text-white' : 'text-gray-600'}`}>
                {isShiftActive ? 'BİTİR' : 'BAŞLA'}
            </span>
            
            {/* Timer Display */}
            <div className={`font-mono text-3xl font-bold mt-2 ${isShiftActive ? 'text-white' : 'text-gray-400'}`}>
                {isShiftActive ? getDuration() : '00:00:00'}
            </div>
            
            <div className="absolute bottom-8 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                {isShiftActive ? 'Vardiya Başladı' : 'Vardiya Bekliyor'}
            </div>
        </motion.button>
      </div>

      {/* 2. TASK LIST HEADER */}
      <div className="flex items-center gap-2 px-2">
         <ClipboardList className="w-6 h-6 text-primary" />
         <h2 className="text-xl font-bold text-primary">Günlük Görevler</h2>
         <div className="ml-auto bg-primary/10 px-3 py-1 rounded-full text-xs font-bold text-primary">
            {activeTasks.length} Bekleyen
         </div>
      </div>

      {/* 3. ACTIVE TASKS (Cards) */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
            {activeTasks.map((task) => (
                <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 100 }}
                    onClick={() => handleTaskClick(task.id, task.xpReward)}
                    className="group relative bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent hover:border-accent active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
                >
                    <div className="flex items-center gap-4 relative z-10">
                        {/* Icon Box */}
                        <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-accent group-hover:text-primary transition-colors">
                            {task.type === 'photo' ? <Camera className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                        </div>
                        
                        {/* Text Info */}
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 leading-tight mb-1">{task.title}</h3>
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-400">
                                <Zap className="w-4 h-4 text-accent fill-accent" />
                                <span className="text-accent-dark font-bold">+{task.xpReward} XP</span>
                            </div>
                        </div>

                        {/* Action Arrow (Visual cue) */}
                        <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center group-hover:bg-green-500 group-hover:border-green-500 group-hover:text-white transition-all">
                             <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
        
        {activeTasks.length === 0 && (
            <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tüm işler tamam!</p>
            </div>
        )}
      </div>

      {/* 4. COMPLETED TASKS (Bottom Graveyard) */}
      {doneTasks.length > 0 && (
          <div className="mt-8 opacity-60">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Tamamlananlar</h3>
            <div className="flex flex-col gap-2">
                {doneTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-4 bg-gray-100 rounded-2xl">
                         <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                            <CheckCircle2 className="w-5 h-5" />
                         </div>
                         <span className="text-gray-500 font-medium line-through">{task.title}</span>
                    </div>
                ))}
            </div>
          </div>
      )}

    </div>
  );
};