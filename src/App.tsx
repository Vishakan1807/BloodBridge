import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';

import { AuthProvider, useAuth } from '@/core/context/AuthContext';
import { RBACProvider }           from '@/core/context/RBACContext';
import { ToastProvider }          from '@/core/context/ToastContext';
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
import { RequestListPage }   from '@/pages/requests/RequestListPage';
import { RequestCreatePage } from '@/pages/requests/RequestCreatePage';
import { RequestDetailPage } from '@/pages/requests/RequestDetailPage';
import { RequestEditPage }   from '@/pages/requests/RequestEditPage';
import {
  VerificationPage, MatchingPage,
  SummaryReportPage, StatusReportPage, ActivityReportPage,
  UserManagementPage, RoleAssignmentPage, AuditLogPage, SystemSettingsPage,
  DonorHistoryPage,
} from '@/pages/stubs';

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
      { path: 'workflow/verify', element: <RoleGuard allow={['manager', 'admin']}><VerificationPage /></RoleGuard> },
      { path: 'workflow/match',  element: <RoleGuard allow={['manager', 'admin']}><MatchingPage /></RoleGuard> },

      // Master Data (admin only)
      { path: 'master/blood-groups', element: <RoleGuard allow={['admin']}><BloodGroupsPage /></RoleGuard> },
      { path: 'master/camps',        element: <RoleGuard allow={['admin']}><CampsPage /></RoleGuard> },
      { path: 'master/hospitals',    element: <RoleGuard allow={['admin']}><HospitalsPage /></RoleGuard> },

      // Reports (manager + admin)
      { path: 'reports/summary',  element: <RoleGuard allow={['manager', 'admin']}><SummaryReportPage /></RoleGuard> },
      { path: 'reports/status',   element: <RoleGuard allow={['manager', 'admin']}><StatusReportPage /></RoleGuard> },
      { path: 'reports/activity', element: <RoleGuard allow={['manager', 'admin']}><ActivityReportPage /></RoleGuard> },

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
  );
}

export default AppProviders;
