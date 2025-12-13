import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';

interface AccessCardProps {
  children: React.ReactNode;
  title: string;
}

export const AccessCard: React.FC<AccessCardProps> = ({ children, title }) => {
  const { stage, goBack } = useAuthStore();
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-md mx-auto relative group">
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-accent-dark via-accent to-accent-light rounded-[2.5rem] opacity-75 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200" />
        
        {/* Card Content */}
        <div className="relative bg-primary-dark rounded-[2.2rem] p-6 md:p-8 shadow-2xl overflow-hidden border border-white/10 min-h-[500px] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                {stage !== 'DEPARTMENT_SELECT' && stage !== 'SUCCESS' ? (
                    <button 
                        onClick={goBack}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                        aria-label={t('back')}
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                ) : <div className="w-10" />} {/* Spacer */}

                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-light to-white tracking-wider uppercase text-center">
                    {title}
                </h2>

                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative z-10">
                {children}
            </div>

            {/* Card Texture Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            
            {/* Bottom Shine */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary to-transparent opacity-80 pointer-events-none" />
        </div>
    </div>
  );
};