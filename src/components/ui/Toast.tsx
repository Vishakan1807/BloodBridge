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
    bg:     'bg-surface-800',
  },
  error: {
    icon:   <XCircle size={18} className="text-danger shrink-0" />,
    border: 'border-l-danger',
    bg:     'bg-surface-800',
  },
  warning: {
    icon:   <AlertTriangle size={18} className="text-warning shrink-0" />,
    border: 'border-l-warning',
    bg:     'bg-surface-800',
  },
  info: {
    icon:   <Info size={18} className="text-info shrink-0" />,
    border: 'border-l-info',
    bg:     'bg-surface-800',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = VARIANT_CONFIG[toast.variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'flex items-start gap-3 p-4 rounded-lg border border-surface-600/50 border-l-4',
        'shadow-modal min-w-72 max-w-sm',
        'animate-[toastIn_0.2s_ease-out]',
        config.border,
        config.bg,
      ].join(' ')}
      style={{ animation: 'toastIn 0.2s ease-out' }}
    >
      {config.icon}
      <p className="text-sm text-slate-200 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-muted hover:text-slate-300 transition-colors shrink-0 mt-0.5"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
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
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
