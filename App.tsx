
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageSelector } from './components/ui/LanguageSelector';
import { useAppStore } from './stores/useAppStore';
import { useAuthStore } from './stores/useAuthStore';
import { useOrganizationStore } from './stores/useOrganizationStore';
import { LoginPage } from './features/auth/LoginPage';
import { OrganizationLobby } from './features/organization/OrganizationLobby';
import { HotelPublicPage } from './features/organization/HotelPublicPage';
import { HotelSettings } from './features/organization/HotelSettings';
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

// Admin Imports
import { AdminLayout } from './features/admin/AdminLayout';
import { StaffManager } from './features/admin/StaffManager';
import { TeamRequests } from './features/admin/TeamRequests'; 
import { ContentStudio } from './features/admin/ContentStudio';
import { CareerBuilder } from './features/admin/CareerBuilder';
import { TalentRadar } from './features/admin/TalentRadar';

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
          <p>v2.0.0 &bull; Multi-Tenant</p>
       </footer>
    </div>
  );
};

const App: React.FC = () => {
  const { currentLanguage } = useAppStore();
  const { isAuthenticated, currentUser } = useAuthStore();
  const { currentOrganization, switchOrganization } = useOrganizationStore();

  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  // Sync Org State: If user is logged in and has an org ID but store is empty, load it
  useEffect(() => {
      if (isAuthenticated && currentUser?.currentOrganizationId && !currentOrganization) {
          switchOrganization(currentUser.currentOrganizationId);
      }
  }, [isAuthenticated, currentUser, currentOrganization, switchOrganization]);

  const isAdminOrManager = ['manager', 'admin', 'super_admin'].includes(currentUser?.role || '');

  return (
    <HashRouter>
      <Routes>
        {/* Protected Routes */}
        {isAuthenticated ? (
           <>
              {/* PUBLIC HOTEL PAGE (Accessible if authed but not joined) */}
              <Route path="/hotel/:orgId" element={<HotelPublicPage />} />

              {/* LEVEL 1: ORGANIZATION CHECK */}
              {/* If no active organization, show Lobby */}
              {!currentOrganization && !currentUser?.currentOrganizationId ? (
                  <Route path="*" element={<OrganizationLobby />} />
              ) : (
                  <>
                      {/* Course Flow Routes */}
                      <Route path="/course/:courseId" element={<CourseIntroPage />} />
                      <Route path="/course/:courseId/play" element={<CoursePlayerPage />} />
                      
                      {/* ADMIN ROUTES (Protected by Role) */}
                      {isAdminOrManager && (
                          <Route path="/admin" element={<AdminLayout />}>
                              <Route index element={<Navigate to="requests" replace />} />
                              <Route path="requests" element={<TeamRequests />} />
                              <Route path="staff" element={<StaffManager />} />
                              <Route path="career" element={<CareerBuilder />} />
                              <Route path="content" element={<ContentStudio />} />
                              <Route path="reports" element={<TalentRadar />} />
                              <Route path="settings" element={<HotelSettings />} /> 
                          </Route>
                      )}

                      {/* Main Dashboard (With Navigation) */}
                      {isAdminOrManager ? (
                         <Route path="*" element={<Navigate to="/admin" replace />} />
                      ) : (
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
                                    {/* Fallback to lobby to switch orgs if needed */}
                                    <Route path="/lobby" element={<OrganizationLobby />} /> 
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </DashboardLayout>
                            } 
                        />
                      )}
                  </>
              )}
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
