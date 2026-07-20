import React, { type ReactNode } from 'react';
import { useRBAC } from '@/core/context/RBACContext';
import { AccessDenied } from '@/components/feedback/PageError';
import type { Role } from '@/core/constants/roles';

interface RoleGuardProps {
  allow:    Role[];
  children: ReactNode;
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { role } = useRBAC();

  if (!allow.includes(role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
