import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';

import { AuthProvider, useAuth } from '@/core/context/AuthContext';
import { RBACProvider }           from '@/core/context/RBACContext';
import { ToastProvider }          from '@/core/context/ToastContext';
import { ThemeProvider }          from '@/core/context/ThemeContext';
import { AuthGuard }              from '@/core/guards/AuthGuard';
import { RoleGuard }              from '@/core/guards/RoleGuard';
import { ErrorBoundary }          from '@/components/feedback/ErrorBoundary';
import { AppShell }               from '@/components/layout/AppShell';
import { ToastContainer }         from '@/components/ui/Toast';
import { NotFoundPage }           from '@/components/feedback/PageError';

// Pages
import LoginPage          from '@/pages/auth/LoginPage';
import RegisterPage       from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage      from '@/pages/DashboardPage';
import { BloodGroupsPage } from '@/pages/master/BloodGroupsPage';
import { CampsPage }       from '@/pages/master/CampsPage';
import { HospitalsPage }   from '@/pages/master/HospitalsPage';
import { CharityDrivesPage } from '@/pages/events/CharityDrivesPage';
import { RequestListPage }   from '@/pages/requests/RequestListPage';
import { RequestCreatePage } from '@/pages/requests/RequestCreatePage';
import { RequestDetailPage } from '@/pages/requests/RequestDetailPage';
import { RequestEditPage }   from '@/pages/requests/RequestEditPage';
import { VerificationPage }   from '@/pages/workflow/VerificationPage';
import { MatchingPage }       from '@/pages/workflow/MatchingPage';
import { SummaryReportPage }  from '@/pages/reports/SummaryReportPage';
import { StatusReportPage }   from '@/pages/reports/StatusReportPage';
import { ActivityReportPage } from '@/pages/reports/ActivityReportPage';
import { UserManagementPage } from '@/pages/admin/UserManagementPage';
import { RoleAssignmentPage } from '@/pages/admin/RoleAssignmentPage';
import { AuditLogPage }      from '@/pages/admin/AuditLogPage';
import { SystemSettingsPage } from '@/pages/admin/SystemSettingsPage';
import { ProfileSettingsPage } from '@/features/settings/ProfileSettingsPage';
import { DonorHistoryPage }    from '@/pages/donor/DonorHistoryPage';

// ── Redirect-if-auth wrapper for public routes ────────────────
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  if (currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ── Router ────────────────────────────────────────────────────
const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <PublicRoute><LoginPage /></PublicRoute>,
  },
  {
    path: '/register',
    element: <PublicRoute><RegisterPage /></PublicRoute>,
  },
  {
    path: '/forgot-password',
    element: <PublicRoute><ForgotPasswordPage /></PublicRoute>,
  },

  // Protected routes
  {
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },

      // Requests (all roles)
      { path: 'requests',          element: <RequestListPage /> },
      { path: 'requests/new',      element: <RequestCreatePage /> },
      { path: 'requests/:id',      element: <RequestDetailPage /> },
      { path: 'requests/:id/edit', element: <RequestEditPage /> },

      // Workflow (manager + admin)
      { path: 'workflow/verify', element: <RoleGuard allow={['admin']}><VerificationPage /></RoleGuard> },
      { path: 'workflow/match',  element: <RoleGuard allow={['admin']}><MatchingPage /></RoleGuard> },

      // Master Data & Locations (manager + admin)
      { path: 'master/blood-groups', element: <RoleGuard allow={['admin']}><BloodGroupsPage /></RoleGuard> },
      { path: 'master/camps',        element: <RoleGuard allow={['admin']}><CampsPage /></RoleGuard> },
      { path: 'master/hospitals',    element: <RoleGuard allow={['admin']}><HospitalsPage /></RoleGuard> },
      { path: 'master/charity-drives', element: <RoleGuard allow={['manager', 'admin']}><CharityDrivesPage /></RoleGuard> },

      // Reports (manager + admin)
      { path: 'reports/summary',  element: <RoleGuard allow={['manager', 'admin']}><SummaryReportPage /></RoleGuard> },
      { path: 'reports/status',   element: <RoleGuard allow={['manager', 'admin']}><StatusReportPage /></RoleGuard> },
      { path: 'reports/activity', element: <RoleGuard allow={['manager', 'admin']}><ActivityReportPage /></RoleGuard> },

      // Account Settings (all roles)
      { path: 'settings', element: <ProfileSettingsPage /> },

      // Administration (admin only)
      { path: 'admin/users',    element: <RoleGuard allow={['admin']}><UserManagementPage /></RoleGuard> },
      { path: 'admin/roles',    element: <RoleGuard allow={['admin']}><RoleAssignmentPage /></RoleGuard> },
      { path: 'admin/audit',    element: <RoleGuard allow={['admin']}><AuditLogPage /></RoleGuard> },
      { path: 'admin/settings', element: <RoleGuard allow={['admin']}><SystemSettingsPage /></RoleGuard> },

      // Trainer Extension
      { path: 'donor/:id/history', element: <DonorHistoryPage /> },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);

// ── App Root ──────────────────────────────────────────────────
function AppProviders() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RBACProvider>
          <ToastProvider>
            <ErrorBoundary>
              <RouterProvider router={router} />
              <ToastContainer />
            </ErrorBoundary>
          </ToastProvider>
        </RBACProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppProviders;
