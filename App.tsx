
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageSelector } from './components/ui/LanguageSelector';
import { useAppStore } from './stores/useAppStore';
import { useAuthStore } from './stores/useAuthStore';
import { useOrganizationStore } from './stores/useOrganizationStore';
import { LoginPage } from './features/auth/LoginPage';
import { OrganizationLobby } from './features/organization/OrganizationLobby';
// REFACTOR: Use OrganizationProfile instead of HotelPublicPage
import { OrganizationProfile } from './features/organization/OrganizationProfile';
// REFACTOR: Use OrganizationSettings instead of HotelSettings
import { OrganizationSettings } from './features/organization/OrganizationSettings';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { PublicProfilePage } from './features/profile/PublicProfilePage';
import { OperationsPage } from './features/operations/OperationsPage';
import { ReportPage } from './features/issues/ReportPage';
import { ExplorePage } from './features/explore/ExplorePage'; 
import { DashboardLayout } from './components/layout/DashboardLayout';
import { CoursePlayerPage } from './features/player/CoursePlayerPage';
import { CourseIntroPage } from './features/course/CourseIntroPage'; 
import { JourneyMap } from './features/career/JourneyMap';
import { Loader2 } from 'lucide-react';

// Admin Imports
import { AdminLayout } from './features/admin/AdminLayout';
import { StaffManager } from './features/admin/StaffManager';
import { TeamRequests } from './features/admin/TeamRequests'; 
import { ContentStudio } from './features/admin/ContentStudio';
import { CareerBuilder } from './features/admin/CareerBuilder';
import { TalentRadar } from './features/admin/TalentRadar';
import { SuperAdminDashboard } from './features/superadmin/SuperAdminDashboard';

// Simple Layout Wrapper for Login
const LoginLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-primary rounded-b-[3rem] shadow-xl z-0" />
      <header className="relative z-10 flex justify-between items-center p-6 md:p-8">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shadow-lg">
               <span className="text-primary font-bold text-xl">H</span>
            </div>
            <span className="text-white/80 font-medium tracking-wide text-sm uppercase">Hotel Academy</span>
          </div>
        </div>
        <LanguageSelector />
      </header>
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-12">
        {children}
      </main>
       <footer className="relative z-10 p-4 text-center text-gray-400 text-xs">
          <p>v2.2.0 &bull; Global Learning</p>
       </footer>
    </div>
  );
};

const App: React.FC = () => {
  const { currentLanguage } = useAppStore();
  const { isAuthenticated, currentUser } = useAuthStore();
  const { currentOrganization, switchOrganization } = useOrganizationStore();
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  // Sync Org State & Handle Hydration
  useEffect(() => {
      const sync = async () => {
          // If user has a preferred org, try to switch to it.
          if (isAuthenticated && currentUser?.currentOrganizationId && !currentOrganization) {
              await switchOrganization(currentUser.currentOrganizationId);
          }
          setIsHydrating(false);
      };
      sync();
  }, [isAuthenticated, currentUser, currentOrganization]); 

  // Role Checks
  const canAccessAdmin = ['manager', 'admin', 'super_admin'].includes(currentUser?.role || '');
  
  // Strict Super Admin Check (Double Verification)
  const isSuperAdmin = currentUser?.role === 'super_admin' && currentUser?.phoneNumber.replace(/\s/g, '') === '+905417726743';

  // 1. Loading Shield
  if (isHydrating && isAuthenticated) {
      return (
          <div className="h-screen flex items-center justify-center bg-primary">
              <div className="text-center">
                  <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
                  <p className="text-white/60 font-medium">Profil yükleniyor...</p>
              </div>
          </div>
      );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Protected Routes */}
        {isAuthenticated ? (
           <>
              {/* REFACTOR: Changed path from /hotel/:orgId to explicit route, using OrganizationProfile */}
              <Route path="/hotel/:orgId" element={<OrganizationProfile />} />

              {/* Course Flow Routes */}
              <Route path="/course/:courseId" element={<CourseIntroPage />} />
              <Route path="/course/:courseId/play" element={<CoursePlayerPage />} />
              
              {/* ORGANIZATION ADMIN ROUTES */}
              {canAccessAdmin && currentOrganization && (
                  <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<Navigate to="requests" replace />} />
                      <Route path="requests" element={<TeamRequests />} />
                      <Route path="staff" element={<StaffManager />} />
                      <Route path="career" element={<CareerBuilder />} />
                      <Route path="content" element={<ContentStudio />} />
                      <Route path="reports" element={<TalentRadar />} />
                      {/* REFACTOR: Directly using OrganizationSettings here */}
                      <Route path="settings" element={<OrganizationSettings />} /> 
                  </Route>
              )}

              {/* SUPER ADMIN ROUTES (Strictly Protected) */}
              <Route path="/super-admin" element={
                  isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to="/" replace />
              } />

              {/* DEFAULT USER INTERFACE (Freemium / Freelancer / Staff) */}
              <Route 
                path="/*" 
                element={
                <DashboardLayout>
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/journey" element={<JourneyMap />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/user/:userId" element={<PublicProfilePage />} />
                        <Route path="/operations" element={<OperationsPage />} />
                        <Route path="/report" element={<ReportPage />} />
                        <Route path="/explore" element={<ExplorePage />} />
                        <Route path="/lobby" element={<OrganizationLobby />} /> 
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </DashboardLayout>
                } 
            />
           </>
        ) : (
           /* Public Login Route */
           <Route 
             path="/*" 
             element={
               <LoginLayout>
                 <LoginPage />
               </LoginLayout>
             } 
           />
        )}
      </Routes>
    </HashRouter>
  );
};

export default App;
