import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, ShieldCheck, Target,
  Droplet, Building2, Hospital, BarChart3, PieChart, Activity,
  Users, KeyRound, ScrollText, Settings, Droplets,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useRBAC } from '@/core/context/RBACContext';
import { useToast } from '@/core/context/ToastContext';
import { ConfirmDialog } from '@/components/ui/Modal';
import { ROUTES } from '@/core/constants/routes';
import { ROLE_LABELS } from '@/core/constants/roles';
import type { Role } from '@/core/constants/roles';

interface NavItem {
  label:        string;
  path:         string;
  icon:         React.ReactNode;
  allowedRoles: Role[];
}

interface NavSection {
  title:        string;
  items:        NavItem[];
  allowedRoles: Role[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    allowedRoles: ['admin', 'manager', 'user'],
    items: [
      { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: <LayoutDashboard size={18} />, allowedRoles: ['admin', 'manager', 'user'] },
    ],
  },
  {
    title: 'Manage',
    allowedRoles: ['admin', 'manager', 'user'],
    items: [
      { label: 'Donation Requests', path: ROUTES.REQUESTS,        icon: <ClipboardList size={18} />, allowedRoles: ['admin', 'manager'] },
      { label: 'My Requests',       path: ROUTES.REQUESTS,        icon: <ClipboardList size={18} />, allowedRoles: ['user'] },
      { label: 'Verify Donors',     path: ROUTES.WORKFLOW_VERIFY, icon: <ShieldCheck size={18} />,  allowedRoles: ['admin', 'manager'] },
      { label: 'Match Donors',      path: ROUTES.WORKFLOW_MATCH,  icon: <Target size={18} />,        allowedRoles: ['admin', 'manager'] },
      { label: 'Profile & Location', path: ROUTES.SETTINGS,       icon: <Settings size={18} />,      allowedRoles: ['admin', 'manager', 'user'] },
    ],
  },
  {
    title: 'Master Data',
    allowedRoles: ['admin'],
    items: [
      { label: 'Blood Groups', path: ROUTES.MASTER_BLOOD_GROUPS, icon: <Droplet size={18} />,    allowedRoles: ['admin'] },
      { label: 'Camps',        path: ROUTES.MASTER_CAMPS,        icon: <Building2 size={18} />,  allowedRoles: ['admin'] },
      { label: 'Hospitals',    path: ROUTES.MASTER_HOSPITALS,    icon: <Hospital size={18} />,   allowedRoles: ['admin'] },
    ],
  },
  {
    title: 'Insights',
    allowedRoles: ['admin', 'manager'],
    items: [
      { label: 'Summary Report',  path: ROUTES.REPORTS_SUMMARY,  icon: <BarChart3 size={18} />, allowedRoles: ['admin', 'manager'] },
      { label: 'Status Report',   path: ROUTES.REPORTS_STATUS,   icon: <PieChart size={18} />,  allowedRoles: ['admin', 'manager'] },
      { label: 'Activity Report', path: ROUTES.REPORTS_ACTIVITY, icon: <Activity size={18} />,  allowedRoles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'System',
    allowedRoles: ['admin'],
    items: [
      { label: 'Users',      path: ROUTES.ADMIN_USERS,    icon: <Users size={18} />,     allowedRoles: ['admin'] },
      { label: 'Roles',      path: ROUTES.ADMIN_ROLES,    icon: <KeyRound size={18} />,  allowedRoles: ['admin'] },
      { label: 'Audit Log',  path: ROUTES.ADMIN_AUDIT,    icon: <ScrollText size={18} />,allowedRoles: ['admin'] },
      { label: 'System Config', path: ROUTES.ADMIN_SETTINGS, icon: <Settings size={18} />,  allowedRoles: ['admin'] },
    ],
  },
];

interface SidebarProps {
  isOpen:           boolean;
  isCollapsed:      boolean;
  onClose:          () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const { userProfile, signOut } = useAuth();
  const { role }                 = useRBAC();
  const { showSuccess, showError } = useToast();
  const navigate                 = useNavigate();

  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [signingOut, setSigningOut]               = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      showSuccess('Signed out successfully.');
      setShowConfirmLogout(false);
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err: any) {
      showError(err?.message || 'Failed to sign out.');
    } finally {
      setSigningOut(false);
    }
  }

  const displayName = userProfile?.displayName ?? userProfile?.email?.split('@')[0] ?? 'User';
  const initials    = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel   = ROLE_LABELS[role];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={[
          'hidden lg:flex flex-col fixed top-0 left-0 h-full z-40',
          'bg-surface-800 border-r border-surface-700 transition-all duration-200',
          isCollapsed ? 'w-16' : 'w-60',
        ].join(' ')}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className={[
          'flex items-center gap-3 px-4 py-5 border-b border-surface-700',
          isCollapsed && 'justify-center',
        ].filter(Boolean).join(' ')}>
          <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shrink-0">
            <Droplets size={16} className="text-brand-500" />
          </div>
          {!isCollapsed && (
            <span className="font-display font-bold text-lg text-white leading-none">
              Blood<span className="text-brand-500">Bridge</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {NAV_SECTIONS.map((section) => {
            if (!section.allowedRoles.includes(role)) return null;
            const visibleItems = section.items.filter((item) =>
              item.allowedRoles.includes(role),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="mb-4">
                {!isCollapsed && (
                  <p className="px-3 mb-1 text-xs font-semibold text-muted uppercase tracking-widest">
                    {section.title}
                  </p>
                )}
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => [
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                      'transition-all duration-150 mb-0.5 group relative',
                      isActive
                        ? 'bg-brand-500/10 text-brand-400 font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-brand-500 before:rounded-full'
                        : 'text-slate-400 hover:bg-surface-700 hover:text-slate-200',
                    ].join(' ')}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="border-t border-surface-700 p-3">
          <div className={[
            'flex items-center gap-3 px-2 py-2',
            isCollapsed && 'justify-center flex-col',
          ].filter(Boolean).join(' ')}>
            {/* Avatar */}
            <NavLink to={ROUTES.SETTINGS} title="Account & Location Settings" className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-semibold text-xs shrink-0 hover:border-brand-400 transition-colors">
              {initials}
            </NavLink>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <NavLink to={ROUTES.SETTINGS} className="hover:underline">
                  <p className="text-sm font-medium text-slate-200 truncate">{displayName}</p>
                </NavLink>
                <p className="text-xs text-muted">{roleLabel}</p>
              </div>
            )}
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <NavLink
                  to={ROUTES.SETTINGS}
                  className="text-muted hover:text-white transition-colors p-1 rounded-md hover:bg-surface-700 cursor-pointer"
                  aria-label="Account Settings"
                  title="Account & Location Settings"
                >
                  <Settings size={16} />
                </NavLink>
                <button
                  onClick={() => setShowConfirmLogout(true)}
                  className="text-muted hover:text-danger transition-colors p-1 rounded-md hover:bg-surface-700 cursor-pointer"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                       text-xs text-muted hover:bg-surface-700 hover:text-slate-300 transition-all cursor-pointer"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <ChevronRight size={14} />
              : <><ChevronLeft size={14} /><span>Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <aside
        className={[
          'flex lg:hidden flex-col fixed top-0 left-0 h-full z-40 w-72',
          'bg-surface-800 border-r border-surface-700 transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Mobile navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-700">
          <Droplets size={20} className="text-brand-500" />
          <span className="font-display font-bold text-lg text-white">
            Blood<span className="text-brand-500">Bridge</span>
          </span>
        </div>

        {/* Nav (same content, never collapsed on mobile) */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_SECTIONS.map((section) => {
            if (!section.allowedRoles.includes(role)) return null;
            const visibleItems = section.items.filter((item) => item.allowedRoles.includes(role));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} className="mb-4">
                <p className="px-3 mb-1 text-xs font-semibold text-muted uppercase tracking-widest">{section.title}</p>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onClose}
                    className={({ isActive }) => [
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mb-0.5 relative',
                      isActive
                        ? 'bg-brand-500/10 text-brand-400 font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-brand-500 before:rounded-full'
                        : 'text-slate-400 hover:bg-surface-700 hover:text-slate-200',
                    ].join(' ')}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-surface-700 p-4">
          <div className="flex items-center gap-3 mb-3">
            <NavLink to={ROUTES.SETTINGS} onClick={onClose} className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-semibold text-sm shrink-0">
              {initials}
            </NavLink>
            <div className="flex-1 min-w-0">
              <NavLink to={ROUTES.SETTINGS} onClick={onClose} className="hover:underline">
                <p className="text-sm font-medium text-slate-200 truncate">{displayName}</p>
              </NavLink>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-surface-700/60">
            <NavLink
              to={ROUTES.SETTINGS}
              onClick={onClose}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Settings size={14} /> Profile & Settings
            </NavLink>
            <button
              onClick={() => setShowConfirmLogout(true)}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors cursor-pointer"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Spacer for desktop layout */}
      <div className={[
        'hidden lg:block shrink-0 transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-60',
      ].join(' ')} aria-hidden="true" />

      {/* Sign Out Confirmation Modal */}
      <ConfirmDialog
        isOpen={showConfirmLogout}
        onCancel={() => setShowConfirmLogout(false)}
        onConfirm={handleSignOut}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of BloodBridge?"
        danger
        loading={signingOut}
      />
    </>
  );
}
