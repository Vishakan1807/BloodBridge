import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { Settings, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { ROUTES } from '@/core/constants/routes';

interface HeaderProps {
  onMenuClick: () => void;
}

// ── Breadcrumb generation from pathname ───────────────────────
function buildBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [
    { label: 'Dashboard', path: '/' },
  ];

  const LABELS: Record<string, string> = {
    requests:       'Requests',
    new:            'New Request',
    edit:           'Edit',
    workflow:       'Workflow',
    verify:         'Verify Donors',
    match:          'Match Donors',
    master:         'Master Data',
    'blood-groups': 'Blood Groups',
    camps:          'Camps',
    hospitals:      'Hospitals',
    reports:        'Reports',
    summary:        'Summary',
    status:         'Status',
    activity:       'Activity',
    admin:          'Administration',
    users:          'Users',
    roles:          'Roles',
    audit:          'Audit Log',
    settings:       'Settings',
    donor:          'Donor',
    history:        'History',
  };

  let builtPath = '';
  for (const seg of segments) {
    builtPath += `/${seg}`;
    const label = LABELS[seg] ?? (seg.startsWith('-') || seg.length > 10 ? 'Detail' : seg);
    crumbs.push({ label, path: builtPath });
  }

  return crumbs;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { userProfile } = useAuth();
  const location        = useLocation();
  const breadcrumbs     = buildBreadcrumbs(location.pathname);

  const isDonorOrManager = userProfile?.role === 'user' || userProfile?.role === 'manager';

  return (
    <header className="sticky top-0 z-20 bg-surface-800/80 backdrop-blur-md border-b border-surface-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-muted hover:text-slate-200 transition-colors p-1 -ml-1 rounded-md"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && (
                <span className="text-surface-600 select-none">/</span>
              )}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-slate-100 truncate" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-muted hover:text-slate-300 transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right Controls: Notifications, Theme Toggle & Top Right Settings */}
      <div className="flex items-center gap-3">
        <NotificationCenter />

        {/* Theme Toggle pushed towards center */}
        <ThemeToggle />

        {/* Settings button on top right for Donor and Manager accounts */}
        {isDonorOrManager && (
          <Link
            to={ROUTES.SETTINGS}
            title="Profile & Location Settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-900/90 border border-surface-600/70 text-xs font-semibold text-slate-200 hover:text-white hover:border-brand-500/50 hover:bg-surface-700/80 transition-all cursor-pointer shadow-md backdrop-blur-md"
          >
            <Settings size={14} className="text-brand-400" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        )}
      </div>
    </header>
  );
}
