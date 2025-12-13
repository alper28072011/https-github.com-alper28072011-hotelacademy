import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const PriorityTaskCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full relative overflow-hidden rounded-3xl shadow-xl bg-white aspect-[4/5] md:aspect-[16/9] flex flex-col justify-end group"
    >
      {/* Background Image Placeholder */}
      <div className="absolute inset-0 bg-gray-800">
         <img 
            src="https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=800" 
            alt="Training" 
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
            <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Mandatory
            </span>
            <span className="bg-white/20 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> 15 Min
            </span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-2 leading-tight">
            {t('hero_task_title')}
        </h2>
        <p className="text-gray-300 mb-6 line-clamp-2 text-sm">
            Learn the key phrases and body language to increase guest satisfaction and room service revenue.
        </p>

        <button 
          onClick={() => navigate('/course/101')}
          className="w-full bg-accent hover:bg-accent-light text-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-black/20"
        >
            <PlayCircle className="w-5 h-5" />
            {t('btn_start')}
        </button>
      </div>
    </motion.div>
  );
};