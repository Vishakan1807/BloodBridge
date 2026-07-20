// ── Role Types ────────────────────────────────────────────────
export type Role = 'admin' | 'manager' | 'user';

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'
  | 'transition'
  | 'view'
  | 'deactivate';

export type Resource =
  | 'request'
  | 'workflow'
  | 'master-data'
  | 'reports'
  | 'users'
  | 'audit'
  | 'roles'
  | 'donor-history';

// ── Permission Matrix ─────────────────────────────────────────
type PermissionMatrix = Record<Role, Partial<Record<Resource, Action[]>>>;

export const PERMISSIONS: PermissionMatrix = {
  admin: {
    'request':       ['create', 'read', 'update', 'delete'],
    'workflow':      ['transition'],
    'master-data':   ['manage'],
    'reports':       ['view'],
    'users':         ['manage', 'deactivate'],
    'audit':         ['view'],
    'roles':         ['manage'],
    'donor-history': ['view'],
  },
  manager: {
    'request':       ['create', 'read', 'update'],
    'workflow':      ['transition'],
    'reports':       ['view'],
    'donor-history': ['view'],
  },
  user: {
    'request':       ['create', 'read', 'update'],
    'donor-history': ['view'],
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  admin:   'Admin',
  manager: 'Manager',
  user:    'Donor',
};
