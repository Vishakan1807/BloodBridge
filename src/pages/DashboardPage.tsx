import React from 'react';
import { useRBAC } from '@/core/context/RBACContext';
import { DonorDashboard } from '@/features/dashboard/DonorDashboard';
import { CoordinatorDashboard } from '@/features/dashboard/CoordinatorDashboard';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';

export default function DashboardPage() {
  const { role } = useRBAC();

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'manager') {
    return <CoordinatorDashboard />;
  }

  return <DonorDashboard />;
}
