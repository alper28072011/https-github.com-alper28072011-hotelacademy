
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './stores/useAppStore';
import { useAuthStore } from './stores/useAuthStore';
import { useOrganizationStore } from './stores/useOrganizationStore';
import { LoginPage } from './features/auth/LoginPage';
import { OrganizationLobby } from './features/organization/OrganizationLobby';
import { OrganizationProfile } from './features/organization/OrganizationProfile';
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
import ScrollToTop from './components/utils/ScrollToTop';
import { AdminBreadcrumbs } from './components/layout/AdminBreadcrumbs';

// Admin Imports
import { AdminLayout } from './features/admin/AdminLayout';
import { OrganizationManager } from './features/admin/OrganizationManager'; 
import { TeamRequests } from './features/admin/TeamRequests'; 
import { ContentStudio } from './features/admin/ContentStudio';
import { CourseManager } from './features/admin/CourseManager';
import { CourseDetail } from './features/admin/CourseDetail';
import { TopicManager } from './features/admin/TopicManager';
import { CareerBuilder } from './features/admin/CareerBuilder';
import { TalentRadar } from './features/admin/TalentRadar';
import { SuperAdminDashboard } from './features/superadmin/SuperAdminDashboard';

// --- PAGE TRANSITION WRAPPER ---
const PageTransition: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "w-full h-full" }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={className}
    >
        {children}
    </motion.div>
);

// --- CLEAN LOGIN LAYOUT ---
const LoginLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col items-center justify-center p-4">
      {children}
      <footer className="mt-8 text-center text-text-muted text-xs opacity-60">
          <p>&copy; 2024 Hotel Academy &bull; Global Standard</p>
      </footer>
    </div>
  );
};

// --- SUPER ADMIN GUARD ---
const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuthStore();
    const isSuper = currentUser?.role === 'super_admin';
    if (!isSuper) return <Navigate to="/" replace />;
    return <>{children}</>;
};

const AnimatedRoutes = () => {
    const location = useLocation();
    const { isAuthenticated } = useAuthStore();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                {isAuthenticated ? (
                   <>
                      <Route path="/org/:orgId" element={<PageTransition><OrganizationProfile /></PageTransition>} />
                      <Route path="/hotel/:orgId" element={<Navigate to={`/org/${window.location.hash.split('/').pop()}`} replace />} />

                      <Route path="/course/:courseId" element={<CourseIntroPage />} />
                      <Route path="/course/:courseId/play" element={<CoursePlayerPage />} />
                      
                      {/* ADMIN ROUTES (Updated for Hierarchy) */}
                      <Route path="/admin" element={<AdminLayout />}>
                          {/* Breadcrumbs are rendered inside AdminLayout or layouts below, simplified here */}
                          <Route index element={<PageTransition><OrganizationManager /></PageTransition>} /> 
                          <Route path="organization" element={<PageTransition><OrganizationManager /></PageTransition>} />
                          <Route path="requests" element={<PageTransition><TeamRequests /></PageTransition>} />
                          <Route path="career" element={<PageTransition><CareerBuilder /></PageTransition>} />
                          
                          {/* New Hierarchical Routes */}
                          <Route path="courses" element={
                              <div className="flex flex-col h-full"><AdminBreadcrumbs /><PageTransition><CourseManager /></PageTransition></div>
                          } />
                          <Route path="courses/:courseId" element={
                              <div className="flex flex-col h-full"><AdminBreadcrumbs /><PageTransition><CourseDetail /></PageTransition></div>
                          } />
                          <Route path="courses/:courseId/topics/:topicId" element={
                              <div className="flex flex-col h-full"><AdminBreadcrumbs /><PageTransition><TopicManager /></PageTransition></div>
                          } />
                          <Route path="modules/:moduleId/edit" element={
                              <div className="flex flex-col h-full"><AdminBreadcrumbs /><PageTransition><ContentStudio /></PageTransition></div>
                          } />
                          
                          {/* Legacy Direct Link fallback if needed */}
                          <Route path="content" element={<Navigate to="courses" replace />} /> 

                          <Route path="reports" element={<PageTransition><TalentRadar /></PageTransition>} />
                          <Route path="settings" element={<PageTransition><OrganizationSettings /></PageTransition>} /> 
                      </Route>

                      {/* SUPER ADMIN ROUTES */}
                      <Route path="/super-admin" element={
                          <SuperAdminGuard>
                              <PageTransition><SuperAdminDashboard /></PageTransition>
                          </SuperAdminGuard>
                      } />

                      {/* USER APP ROUTES */}
                      <Route 
                        path="/*" 
                        element={
                        <DashboardLayout>
                            <Routes>
                                <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
                                <Route path="/journey" element={<PageTransition><JourneyMap /></PageTransition>} />
                                <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
                                <Route path="/user/:userId" element={<PageTransition><PublicProfilePage /></PageTransition>} />
                                <Route path="/operations" element={<PageTransition><OperationsPage /></PageTransition>} />
                                <Route path="/report" element={<PageTransition><ReportPage /></PageTransition>} />
                                <Route path="/explore" element={<PageTransition><ExplorePage /></PageTransition>} />
                                <Route path="/lobby" element={<PageTransition><OrganizationLobby /></PageTransition>} /> 
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </DashboardLayout>
                        } 
                    />
                   </>
                ) : (
                   <Route 
                     path="/*" 
                     element={
                       <LoginLayout>
                         <PageTransition className="w-full"><LoginPage /></PageTransition>
                       </LoginLayout>
                     } 
                   />
                )}
            </Routes>
        </AnimatePresence>
    );
};

const App: React.FC = () => {
  const { currentLanguage, fetchSystemSettings } = useAppStore();
  const { isAuthenticated, currentUser } = useAuthStore();
  const { currentOrganization, switchOrganization } = useOrganizationStore();
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  useEffect(() => {
      fetchSystemSettings();
  }, []);

  useEffect(() => {
      const sync = async () => {
          if (isAuthenticated && currentUser?.currentOrganizationId && !currentOrganization) {
              await switchOrganization(currentUser.currentOrganizationId);
          }
          setIsHydrating(false);
      };
      sync();
  }, [isAuthenticated, currentUser]); 

  if (isHydrating && isAuthenticated) {
      return (
          <div className="h-screen flex items-center justify-center bg-surface-subtle">
              <div className="text-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
              </div>
          </div>
      );
  }

  return (
    <HashRouter>
      <ScrollToTop />
      <AnimatedRoutes />
    </HashRouter>
  );
};

export default App;
