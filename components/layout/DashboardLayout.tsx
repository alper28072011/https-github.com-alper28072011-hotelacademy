
import React from 'react';
import { BottomNavigation } from './BottomNavigation';
import { useAppStore } from '../../stores/useAppStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { currentLanguage } = useAppStore();

  return (
    // FIX: Use 100dvh (Dynamic Viewport Height) to prevent mobile browser bar issues
    // FIX: Use overflow-hidden on the wrapper to prevent body scroll
    <div className="h-[100dvh] w-full bg-surface flex flex-col relative overflow-hidden">
      
      {/* Decorative Top Background (Fixed Position relative to wrapper) */}
      <div className="absolute top-0 left-0 w-full h-48 bg-primary z-0 pointer-events-none" />
      
      {/* Main Content Area: Handles its own scrolling */}
      {/* overflow-x-hidden prevents horizontal scroll glitches */}
      {/* pb-24 ensures content isn't hidden behind the bottom nav */}
      <main className="relative z-10 flex-1 flex flex-col pb-24 overflow-y-auto overflow-x-hidden scroll-smooth">
        {children}
      </main>

      {/* Bottom Navigation: Fixed at the bottom of the flex container */}
      <BottomNavigation />
    </div>
  );
};
