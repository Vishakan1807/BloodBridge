import React from 'react';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
        <ShieldOff size={36} className="text-danger" />
      </div>
      <div>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Access Denied</h1>
        <p className="text-muted max-w-sm">
          You don't have permission to view this page.
          Contact your administrator if you believe this is an error.
        </p>
      </div>
      <Button
        variant="secondary"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate(-1)}
      >
        Go Back
      </Button>
    </div>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-6 text-center px-4">
      <div>
        <p className="font-display font-bold text-8xl text-brand-500/30 mb-2">404</p>
        <h1 className="font-display font-bold text-3xl text-white mb-2">Page Not Found</h1>
        <p className="text-muted max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button
        variant="primary"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/')}
      >
        Back to Dashboard
      </Button>
    </div>
  );
}
