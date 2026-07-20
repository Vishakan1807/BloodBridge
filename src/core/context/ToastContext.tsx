import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

// ── Types ─────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id:       string;
  message:  string;
  variant:  ToastVariant;
}

interface ToastContextValue {
  toasts:       Toast[];
  showSuccess(message: string): void;
  showError(message: string):   void;
  showWarning(message: string): void;
  showInfo(message: string):    void;
  dismiss(id: string):          void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);

    const duration = variant === 'error' ? 6000 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toasts,
    showSuccess: (msg) => addToast(msg, 'success'),
    showError:   (msg) => addToast(msg, 'error'),
    showWarning: (msg) => addToast(msg, 'warning'),
    showInfo:    (msg) => addToast(msg, 'info'),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
