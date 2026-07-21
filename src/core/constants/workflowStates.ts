// ── Workflow State Enum ───────────────────────────────────────
export type WorkflowState =
  | 'registered'
  | 'verified'
  | 'matched'
  | 'donated'
  | 'closed';

import type { Role } from './roles';

// ── Allowed Transitions Map ───────────────────────────────────
// Key: current state → Value: states that can follow it, per role
export interface AllowedTransition {
  toState: WorkflowState;
  allowedRoles: Role[];
  requiresNote?: boolean;
}

export const ALLOWED_TRANSITIONS: Record<WorkflowState, AllowedTransition[]> = {
  registered: [
    { toState: 'verified', allowedRoles: ['manager', 'admin'] },
  ],
  verified: [
    { toState: 'matched', allowedRoles: ['manager', 'admin'] },
  ],
  matched: [
    { toState: 'donated', allowedRoles: ['manager', 'admin'] },
  ],
  donated: [
    { toState: 'closed', allowedRoles: ['user', 'manager', 'admin'], requiresNote: true },
  ],
  closed: [
    // Admin-only emergency rollback
    { toState: 'registered', allowedRoles: ['admin'] },
  ],
};

// ── State Display Config ──────────────────────────────────────
export interface StateConfig {
  label:     string;
  color:     string;   // CSS class fragment for badge
  bgColor:   string;
  dotColor:  string;
  step:      number;   // 1-based position in the timeline
}

export const STATE_CONFIG: Record<WorkflowState, StateConfig> = {
  registered: { label: 'Registered', color: 'text-neutral-400',  bgColor: 'bg-surface-700',    dotColor: 'bg-neutral-400', step: 1 },
  verified:   { label: 'Verified',   color: 'text-info',          bgColor: 'bg-info-dim',        dotColor: 'bg-info',        step: 2 },
  matched:    { label: 'Matched',    color: 'text-warning',       bgColor: 'bg-warning-dim',     dotColor: 'bg-warning',     step: 3 },
  donated:    { label: 'Donated',    color: 'text-success',       bgColor: 'bg-success-dim',     dotColor: 'bg-success',     step: 4 },
  closed:     { label: 'Closed',     color: 'text-muted',         bgColor: 'bg-surface-700',     dotColor: 'bg-muted',       step: 5 },
};

export const WORKFLOW_STATES_ORDERED: WorkflowState[] = [
  'registered', 'verified', 'matched', 'donated', 'closed',
];

export const TRANSITION_BUTTON_LABELS: Partial<Record<WorkflowState, string>> = {
  registered: 'Mark as Verified',
  verified:   'Assign Match',
  matched:    'Record Donation',
  donated:    'Close Request',
};
