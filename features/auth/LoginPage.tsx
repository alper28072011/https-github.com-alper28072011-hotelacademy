import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/useAuthStore';
import { AccessCard } from './components/AccessCard';
import { DepartmentGrid } from './components/DepartmentGrid';
import { Keypad } from './components/Keypad';
import { CheckCircle2, User as UserIcon, Loader2, Database, AlertTriangle } from 'lucide-react';
import { seedDatabase } from '../../utils/seedDatabase';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { 
    stage, 
    selectedDepartment, 
    selectedUser, 
    setUser, 
    resetFlow,
    departmentUsers,
    isLoading
  } = useAuthStore();

  // Title logic based on stage
  let title = t('login_title');
  if (stage === 'DEPARTMENT_SELECT') title = t('select_department');
  if (stage === 'USER_SELECT') title = t('select_your_profile');
  if (stage === 'PIN_ENTRY') title = t('enter_pin');
  if (stage === 'SUCCESS') title = t('access_granted');

  return (
    <div className="w-full flex flex-col justify-center items-center py-4 relative">
      <AccessCard title={title}>
        
        {/* Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 bg-primary-dark/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                <span className="text-white font-medium animate-pulse">{t('loading')}</span>
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
                 <div className="col-span-2 flex flex-col items-center justify-center text-center text-white/50 py-10 gap-3 border border-dashed border-white/10 rounded-xl p-4">
                    <AlertTriangle className="w-8 h-8 text-yellow-500/50" />
                    <span className="text-sm">No staff found.</span>
                    <div className="text-[10px] font-mono text-red-300 bg-black/40 px-2 py-1 rounded">
                      Debug: Department="{selectedDepartment}"<br/>
                      Check Firestore Console.
                    </div>
                 </div>
            )}
            {departmentUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setUser(user)}
                className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-accent hover:bg-white/10 transition-all active:scale-95"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-xl border-2 border-accent/50 mb-3 shadow-lg">
                  {user.avatar}
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
               <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-xs">
                 {selectedUser.avatar}
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
                onClick={resetFlow}
                className="mt-12 bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full text-sm font-medium transition-colors"
             >
                Loading Dashboard...
             </button>
          </div>
        )}

      </AccessCard>
      
      {/* Dev Tool: Database Seeder Button (Hidden-ish) */}
      <button 
        onClick={seedDatabase}
        className="mt-8 text-white/10 hover:text-white/40 text-xs flex items-center gap-1 transition-colors"
        title="Populate Database (Dev Only)"
      >
        <Database className="w-3 h-3" /> Initialize DB
      </button>

      <style>{`
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