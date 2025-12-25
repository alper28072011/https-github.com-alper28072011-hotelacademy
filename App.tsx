
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './stores/useAppStore';
import { useAuthStore } from './stores/useAuthStore';
import { useContextStore } from './stores/useContextStore';
import { useTelemetry } from './hooks/useTelemetry';

// Feature Imports
import { LoginPage } from './features/auth/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AdminLayout } from './features/admin/AdminLayout';

// User Pages
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { PublicProfilePage } from './features/profile/PublicProfilePage';
import { OperationsPage } from './features/operations/OperationsPage';
import { ReportPage } from './features/issues/ReportPage';
import { ExplorePage } from './features/explore/ExplorePage'; 
import { OrganizationLobby } from './features/organization/OrganizationLobby';
import { OrganizationProfile } from './features/organization/OrganizationProfile';
import { CoursePlayerPage } from './features/player/CoursePlayerPage';
import { CourseIntroPage } from './features/course/CourseIntroPage'; 
import { JourneyMap } from './features/career/JourneyMap';

// Admin Pages
import { OrganizationManager } from './features/admin/OrganizationManager'; 
import { TeamRequests } from './features/admin/TeamRequests'; 
import { ContentStudio } from './features/admin/ContentStudio';
import { CourseManager } from './features/admin/CourseManager';
import { CourseDetail } from './features/admin/CourseDetail';
import { TopicManager } from './features/admin/TopicManager';
import { CareerBuilder } from './features/admin/CareerBuilder';
import { TalentRadar } from './features/admin/TalentRadar';
import { OrganizationSettings } from './features/admin/OrganizationSettings';
import { SuperAdminDashboard } from './features/superadmin/SuperAdminDashboard';

import { AdminBreadcrumbs } from './components/layout/AdminBreadcrumbs';
import ScrollToTop from './components/utils/ScrollToTop';
import { Loader2 } from 'lucide-react';

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

const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuthStore();
    return currentUser?.role === 'super_admin' ? <>{children}</> : <Navigate to="/" replace />;
};

const RequireAdminContext: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { contextType } = useContextStore();
    return contextType === 'ORGANIZATION' ? <>{children}</> : <Navigate to="/" replace />;
};

const TelemetryProvider = () => {
    useTelemetry(); 
    return null;
};

const App: React.FC = () => {
  const { currentLanguage, fetchSystemSettings } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  useEffect(() => {
      fetchSystemSettings();
      setTimeout(() => setIsHydrating(false), 500);
  }, []);

  if (isHydrating) {
      return (
          <div className="h-screen flex items-center justify-center bg-gray-50">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
      );
  }

  return (
    <HashRouter>
      <ScrollToTop />
      <TelemetryProvider />
      
      <Routes>
        {/* 1. PUBLIC / AUTH ROUTES */}
        {!isAuthenticated && (
            <Route path="/*" element={<LoginPage />} />
        )}

        {/* 2. AUTHENTICATED ROUTES */}
        {isAuthenticated && (
            <>
                {/* --- A. ADMIN ROUTES (ISOLATED) --- */}
                <Route path="/admin" element={
                    <RequireAdminContext>
                        <AdminLayout />
                    </RequireAdminContext>
                }>
                    <Route index element={<OrganizationManager />} />
                    <Route path="organization" element={<OrganizationManager />} />
                    <Route path="requests" element={<TeamRequests />} />
                    <Route path="career" element={<CareerBuilder />} />
                    <Route path="reports" element={<TalentRadar />} />
                    <Route path="settings" element={<OrganizationSettings />} />
                    
                    {/* Nested Admin Routes */}
                    <Route path="courses" element={<><AdminBreadcrumbs /><CourseManager /></>} />
                    <Route path="courses/:courseId" element={<><AdminBreadcrumbs /><CourseDetail /></>} />
                    <Route path="courses/:courseId/topics/:topicId" element={<><AdminBreadcrumbs /><TopicManager /></>} />
                    <Route path="modules/:moduleId/edit" element={<><AdminBreadcrumbs /><ContentStudio /></>} />
                </Route>

                {/* --- B. SUPER ADMIN --- */}
                <Route path="/super-admin" element={
                    <SuperAdminGuard>
                        <SuperAdminDashboard />
                    </SuperAdminGuard>
                } />

                {/* --- C. USER APP ROUTES (DEFAULT) --- */}
                <Route path="/" element={<DashboardLayout><Outlet /></DashboardLayout>}>
                    <Route index element={<DashboardPage />} />
                    <Route path="journey" element={<JourneyMap />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="user/:userId" element={<PublicProfilePage />} />
                    <Route path="operations" element={<OperationsPage />} />
                    <Route path="report" element={<ReportPage />} />
                    <Route path="explore" element={<ExplorePage />} />
                    <Route path="lobby" element={<OrganizationLobby />} />
                    <Route path="org/:orgId" element={<OrganizationProfile />} />
                </Route>

                {/* --- D. STANDALONE PLAYER ROUTES --- */}
                <Route path="/course/:courseId" element={<CourseIntroPage />} />
                <Route path="/course/:courseId/play" element={<CoursePlayerPage />} />

                {/* --- E. FALLBACK --- */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </>
        )}
      </Routes>
    </HashRouter>
  );
};

export default App;