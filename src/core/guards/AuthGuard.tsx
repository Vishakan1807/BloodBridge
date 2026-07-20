import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { ROUTES } from '@/core/constants/routes';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!currentUser) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}
