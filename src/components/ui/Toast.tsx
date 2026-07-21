import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, type Toast, type ToastVariant } from '@/core/context/ToastContext';

const VARIANT_CONFIG: Record<ToastVariant, {
  icon: React.ReactNode;
  border: string;
  bg: string;
}> = {
  success: {
    icon:   <CheckCircle size={18} className="text-success shrink-0" />,
    border: 'border-l-success',
    bg:     'bg-surface-800 border-surface-600',
  },
  error: {
    icon:   <XCircle size={18} className="text-danger shrink-0" />,
    border: 'border-l-danger',
    bg:     'bg-surface-800 border-surface-600',
  },
  warning: {
    icon:   <AlertTriangle size={18} className="text-warning shrink-0" />,
    border: 'border-l-warning',
    bg:     'bg-surface-800 border-surface-600',
  },
  info: {
    icon:   <Info size={18} className="text-info shrink-0" />,
    border: 'border-l-info',
    bg:     'bg-surface-800 border-surface-600',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = VARIANT_CONFIG[toast.variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'flex items-start gap-3 p-4 rounded-xl border border-l-4',
        'shadow-2xl min-w-72 max-w-md w-full',
        'animate-[toastUp_0.25s_ease-out]',
        config.border,
        config.bg,
      ].join(' ')}
      style={{ animation: 'toastUp 0.25s ease-out' }}
    >
      {config.icon}
      <p className="text-sm font-medium text-slate-100 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-muted hover:text-slate-300 transition-colors shrink-0 mt-0.5 cursor-pointer p-0.5 rounded-md hover:bg-surface-700"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes toastUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 max-w-md w-full pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
