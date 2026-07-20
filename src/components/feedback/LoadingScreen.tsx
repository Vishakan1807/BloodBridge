import React from 'react';
import { Droplets } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-6">
      {/* Brand mark */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Droplets size={24} className="text-brand-500" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Blood<span className="text-brand-500">Bridge</span>
          </h1>
          <p className="text-xs text-muted">Bridging Donors and Patients</p>
        </div>
      </div>

      <Spinner size="md" />
    </div>
  );
}
