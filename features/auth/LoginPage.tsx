
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/useAuthStore';
import { AccessCard } from './components/AccessCard';
import { DepartmentGrid } from './components/DepartmentGrid';
import { Keypad } from './components/Keypad';
import { AdminLoginForm } from './components/AdminLoginForm';
import { CheckCircle2, Loader2, Database, Shield, Lock } from 'lucide-react';
import { seedDatabase } from '../../utils/seedDatabase';
import { motion } from 'framer-motion';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { 
    stage, 
    selectedDepartment, 
    selectedUser, 
    setUser, 
    resetFlow,
    departmentUsers,
    isLoading: isAuthLoading
  } = useAuthStore();

  const [isSeeding, setIsSeeding] = useState(false);
  const [isManagerMode, setIsManagerMode] = useState(false);

  // Helper to handle seeding
  const handleInitializeSystem = async () => {
    setIsSeeding(true);
    const success = await seedDatabase();
    setIsSeeding(false);
    
    if (success) {
        window.location.reload();
    }
  };

  const toggleManagerMode = () => {
      setIsManagerMode(!isManagerMode);
      resetFlow(); // Reset any partial staff login state
  };

  // Title logic based on stage
  let title = t('login_title');
  if (isManagerMode) title = "Manager Studio";
  else if (stage === 'DEPARTMENT_SELECT') title = t('select_department');
  else if (stage === 'USER_SELECT') title = t('select_your_profile');
  else if (stage === 'PIN_ENTRY') title = t('enter_pin');
  else if (stage === 'SUCCESS') title = t('access_granted');

  const isLoading = isAuthLoading || isSeeding;

  return (
    <div className="w-full flex flex-col justify-center items-center py-4 relative perspective-1000">
      
      {/* 3D Flip Container */}
      <motion.div 
        animate={{ rotateY: isManagerMode ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="w-full max-w-md mx-auto relative preserve-3d"
        style={{ transformStyle: 'preserve-3d' }}
      >
          {/* FRONT: STAFF LOGIN */}
          <div className="backface-hidden w-full relative z-10">
               <AccessCard title={title}>
                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-primary-dark/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                            <span className="text-white font-medium animate-pulse">
                                {isSeeding ? "Setting up Database..." : t('loading')}
                            </span>
                        </div>
                    )}

                    {/* Stage 1: Department Selection */}
                    {stage === 'DEPARTMENT_SELECT' && (
                    <DepartmentGrid />
                    )}

                    {/* Stage 2: User Selection */}
                    {stage === 'USER_SELECT' && (
                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-right-8 fade-in duration-500">
                        {departmentUsers.length === 0 && !isLoading && (
                            <div className="col-span-2 flex flex-col items-center justify-center text-center text-white/50 py-12 gap-4 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2 border border-yellow-500/30">
                                    <Database className="w-8 h-8 text-yellow-500" />
                                </div>
                                
                                <div>
                                    <h3 className="text-white font-bold text-lg">System Empty</h3>
                                    <p className="text-sm opacity-70">No staff records found for {selectedDepartment}.</p>
                                </div>

                                <button 
                                    onClick={handleInitializeSystem}
                                    disabled={isSeeding}
                                    className="mt-2 bg-accent hover:bg-accent-light text-primary font-bold py-3 px-8 rounded-full shadow-lg shadow-accent/20 flex items-center gap-2 transition-all active:scale-95 animate-pulse"
                                >
                                    {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                    Initialize System Data
                                </button>
                            </div>
                        )}
                        {departmentUsers.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => setUser(user)}
                            className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-accent hover:bg-white/10 transition-all active:scale-95"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-xl border-2 border-accent/50 mb-3 shadow-lg overflow-hidden">
                                {user.avatar.length > 4 ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user.avatar
                                )}
                            </div>
                            <span className="text-white text-center font-medium leading-tight">
                            {user.name}
                            </span>
                        </button>
                        ))}
                    </div>
                    )}

                    {/* Stage 3: PIN Entry */}
                    {stage === 'PIN_ENTRY' && selectedUser && (
                    <div className="flex flex-col items-center h-full">
                        <div className="flex items-center gap-3 mb-6 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                            {selectedUser.avatar.length > 4 ? (
                                <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                            ) : (
                                selectedUser.avatar
                            )}
                        </div>
                        <span className="text-white/80">{selectedUser.name}</span>
                        </div>
                        <Keypad />
                    </div>
                    )}

                    {/* Stage 4: Success */}
                    {stage === 'SUCCESS' && selectedUser && (
                    <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-500">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-accent blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative w-24 h-24 bg-accent rounded-full flex items-center justify-center shadow-2xl shadow-accent/50">
                                <CheckCircle2 className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-2 text-center">
                            {t('welcome_back')}
                        </h3>
                        <p className="text-accent text-xl font-medium text-center">
                            {selectedUser.name}
                        </p>

                        <button 
                            className="mt-12 bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full text-sm font-medium transition-colors"
                        >
                            Loading Dashboard...
                        </button>
                    </div>
                    )}
               </AccessCard>
          </div>

          {/* BACK: ADMIN LOGIN (Rotated) */}
          <div 
             className="absolute inset-0 backface-hidden w-full h-full"
             style={{ transform: 'rotateY(180deg)' }}
          >
              {/* Custom Dark Card for Admin */}
              <div className="w-full h-full bg-zinc-900 rounded-[2.2rem] p-6 md:p-8 shadow-2xl border border-zinc-700 flex flex-col overflow-hidden relative">
                  {/* Metal/Vault Texture */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-500 via-gray-900 to-black"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full justify-center">
                      <AdminLoginForm />
                      
                      <button 
                        onClick={toggleManagerMode}
                        className="mt-auto mx-auto text-zinc-500 hover:text-white text-sm flex items-center gap-2 transition-colors py-4"
                      >
                         <Shield className="w-4 h-4" /> Return to Staff Access
                      </button>
                  </div>
              </div>
          </div>
      </motion.div>

      {/* FOOTER TOGGLE (Only visible if not in Manager Mode for UX) */}
      {!isManagerMode && !isLoading && stage === 'DEPARTMENT_SELECT' && (
          <button 
            onClick={toggleManagerMode}
            className="fixed bottom-6 right-6 p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white/30 hover:text-white transition-all border border-white/5 hover:border-white/20 z-0"
          >
              <Lock className="w-4 h-4" />
          </button>
      )}

      <style>{`
        .perspective-1000 {
            perspective: 1000px;
        }
        .preserve-3d {
            transform-style: preserve-3d;
        }
        .backface-hidden {
            backface-visibility: hidden;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};
