import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  PERMISSIONS,
  type Role,
  type Action,
  type Resource,
} from '@/core/constants/roles';

// ── Context Shape ─────────────────────────────────────────────
interface RBACContextValue {
  role:      Role;
  can(action: Action, resource: Resource): boolean;
  isAdmin:   boolean;
  isManager: boolean;
  isUser:    boolean;
}

const RBACContext = createContext<RBACContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function RBACProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();

  const value = useMemo<RBACContextValue>(() => {
    // Default to lowest privilege while loading or if profile missing
    const role: Role = userProfile?.role ?? 'user';

    function can(action: Action, resource: Resource): boolean {
      const allowed = PERMISSIONS[role]?.[resource];
      if (!allowed) return false;
      return allowed.includes(action);
    }

    return {
      role,
      can,
      isAdmin:   role === 'admin',
      isManager: role === 'manager',
      isUser:    role === 'user',
    };
  }, [userProfile]);

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────
export function useRBAC(): RBACContextValue {
  const ctx = useContext(RBACContext);
  if (!ctx) throw new Error('useRBAC must be used within <RBACProvider>');
  return ctx;
}
