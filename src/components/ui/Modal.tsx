import React, { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

interface ModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  title?:   string;
  size?:    ModalSize;
  children: ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm:         'max-w-sm',
  md:         'max-w-lg',
  lg:         'max-w-2xl',
  xl:         'max-w-4xl',
  fullscreen: 'max-w-full h-full rounded-none',
};

export function Modal({
  isOpen,
  onClose,
  title,
  size    = 'md',
  children,
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={[
          'relative w-full bg-surface-800 rounded-xl border border-surface-600/60',
          'shadow-modal flex flex-col max-h-[90vh]',
          sizeClasses[size],
        ].join(' ')}
        style={{
          animation: 'modalIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
            <h2 id="modal-title" className="text-lg font-semibold text-slate-100 font-display">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-surface-700"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────
interface ConfirmDialogProps {
  isOpen:    boolean;
  onConfirm: () => void;
  onCancel:  () => void;
  title?:    string;
  message:   string;
  danger?:   boolean;
  loading?:  boolean;
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title   = 'Confirm Action',
  message,
  danger  = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-slate-300 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          Confirm
        </Button>
      </div>
    </Modal>
  );
}
