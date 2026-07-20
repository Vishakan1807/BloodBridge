import React, {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:       string;
  error?:       string;
  hint?:        string;
  icon?:        ReactNode;
  iconRight?:   ReactNode;
  onIconRightClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconRight,
      onIconRightClick,
      id,
      className = '',
      ...props
    },
    ref,
  ) => {
    const inputId    = id ?? `input-${Math.random().toString(36).slice(2)}`;
    const errorId    = `${inputId}-error`;
    const hintId     = `${inputId}-hint`;
    const hasError   = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-300"
          >
            {label}
            {props.required && (
              <span className="text-brand-400 ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-describedby={[
              error ? errorId : '',
              hint  ? hintId  : '',
            ].filter(Boolean).join(' ') || undefined}
            aria-invalid={hasError}
            className={[
              'w-full bg-surface-700 border rounded-lg text-sm text-slate-100',
              'placeholder:text-muted transition-all duration-150',
              'focus:outline-none focus:ring-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon      ? 'pl-10' : 'pl-4',
              iconRight ? 'pr-10' : 'pr-4',
              'py-2.5',
              hasError
                ? 'border-danger focus:ring-danger/40'
                : 'border-surface-600 focus:ring-brand-500/40 focus:border-brand-500',
              className,
            ].filter(Boolean).join(' ')}
            {...props}
          />

          {iconRight && (
            <button
              type="button"
              onClick={onIconRightClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-slate-300 transition-colors"
              tabIndex={-1}
              aria-label="Toggle input action"
            >
              {iconRight}
            </button>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger flex items-center gap-1">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
