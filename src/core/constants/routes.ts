export const ROUTES = {
  // Auth
  LOGIN:           '/login',
  REGISTER:        '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // App
  DASHBOARD: '/',

  // Requests
  REQUESTS:       '/requests',
  REQUEST_NEW:    '/requests/new',
  REQUEST_DETAIL: '/requests/:id',
  REQUEST_EDIT:   '/requests/:id/edit',

  // Workflow
  WORKFLOW_VERIFY: '/workflow/verify',
  WORKFLOW_MATCH:  '/workflow/match',

  // Master Data
  MASTER_BLOOD_GROUPS: '/master/blood-groups',
  MASTER_CAMPS:        '/master/camps',
  MASTER_HOSPITALS:    '/master/hospitals',

  // Reports
  REPORTS_SUMMARY:  '/reports/summary',
  REPORTS_STATUS:   '/reports/status',
  REPORTS_ACTIVITY: '/reports/activity',

  // Account & Profile Settings
  SETTINGS: '/settings',

  // Admin
  ADMIN_USERS:    '/admin/users',
  ADMIN_ROLES:    '/admin/roles',
  ADMIN_AUDIT:    '/admin/audit',
  ADMIN_SETTINGS: '/admin/settings',

  // Trainer Extension
  DONOR_HISTORY: '/donor/:id/history',
} as const;

// Helper to build parameterised routes
export const buildRoute = {
  requestDetail: (id: string) => `/requests/${id}`,
  requestEdit:   (id: string) => `/requests/${id}/edit`,
  donorHistory:  (id: string) => `/donor/${id}/history`,
};
