import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LoginPage } from './features/auth/LoginPage';
import { ExplorePage } from './features/explore/ExplorePage';
import { ProfilePage } from './features/profile/ProfilePage';
import { CoursePlayerPage } from './features/player/CoursePlayerPage';
import { CourseIntroPage } from './features/course/CourseIntroPage';
import { OrganizationLobby } from './features/organization/OrganizationLobby';
import { OrganizationProfile } from './features/organization/OrganizationProfile';
import { PublicProfilePage } from './features/profile/PublicProfilePage';
import { AdminLayout } from './features/admin/AdminLayout';
import { OrganizationSettings } from './features/organization/OrganizationSettings';
import { TeamRequests } from './features/admin/TeamRequests';
import { StaffManager } from './features/admin/StaffManager';
import { OrgChartBuilder } from './features/organization/OrgChartBuilder';
import { CareerBuilder } from './features/admin/CareerBuilder';
import { ReportPage } from './features/issues/ReportPage';
import { JourneyMap } from './features/career/JourneyMap';
import { LibraryPage } from './features/library/LibraryPage';
import { SuperAdminDashboard } from './features/superadmin/SuperAdminDashboard';
import { useAuthStore } from './stores/useAuthStore';
import ScrollToTop from './components/utils/ScrollToTop';

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {!isAuthenticated ? (
          <Route path="*" element={<LoginPage />} />
        ) : (
          <>
            <Route path="/" element={<DashboardLayout><DashboardPage /></DashboardLayout>} />
            <Route path="/explore" element={<DashboardLayout><ExplorePage /></DashboardLayout>} />
            <Route path="/profile" element={<DashboardLayout><ProfilePage /></DashboardLayout>} />
            <Route path="/course/:courseId" element={<CourseIntroPage />} />
            <Route path="/course/:courseId/play" element={<CoursePlayerPage />} />
            <Route path="/lobby" element={<OrganizationLobby />} />
            <Route path="/org/:orgId" element={<OrganizationProfile />} />
            <Route path="/user/:userId" element={<PublicProfilePage />} />
            <Route path="/report" element={<DashboardLayout><ReportPage /></DashboardLayout>} />
            <Route path="/journey" element={<DashboardLayout><JourneyMap /></DashboardLayout>} />
            <Route path="/library" element={<DashboardLayout><LibraryPage /></DashboardLayout>} />
            
            {/* ORGANIZATION ADMIN ROUTES */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<OrganizationSettings />} />
              <Route path="requests" element={<TeamRequests />} />
              <Route path="staff" element={<StaffManager />} />
              <Route path="org-chart" element={<OrgChartBuilder />} />
              <Route path="career" element={<CareerBuilder />} />
            </Route>

            {/* SUPER ADMIN */}
            <Route path="/super-admin" element={<SuperAdminDashboard />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default App;