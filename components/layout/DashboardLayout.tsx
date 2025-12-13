import React from 'react';
import { BottomNavigation } from './BottomNavigation';
import { useAppStore } from '../../stores/useAppStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { currentLanguage } = useAppStore();

  return (
    <div className="min-h-screen bg-surface flex flex-col relative">
      {/* Decorative Top Background */}
      <div className="absolute top-0 left-0 w-full h-48 bg-primary z-0" />
      
      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col pb-24 overflow-x-hidden">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};