import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { LanguageSelector } from './components/ui/LanguageSelector';
import { useAppStore } from './stores/useAppStore';
import { LoginPage } from './features/auth/LoginPage';

// Simple Layout Wrapper
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface flex flex-col relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-primary rounded-b-[3rem] shadow-xl z-0" />
      
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 md:p-8">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
             {/* Logo Placeholder */}
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shadow-lg">
               <span className="text-primary font-bold text-xl">H</span>
            </div>
            <span className="text-white/80 font-medium tracking-wide text-sm uppercase">Hotel Academy</span>
          </div>
        </div>
        
        {/* The requested Language Switcher */}
        <LanguageSelector />
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-12">
        {children}
      </main>

       {/* Footer / Version Info */}
       <footer className="relative z-10 p-4 text-center text-gray-400 text-xs">
          <p>v1.0.0 &bull; Offline Ready</p>
       </footer>
    </div>
  );
};

const App: React.FC = () => {
  const { currentLanguage } = useAppStore();

  // Initial setup effect
  useEffect(() => {
    // Ensure document direction is correct on load
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  return (
    <HashRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </MainLayout>
    </HashRouter>
  );
};

export default App;