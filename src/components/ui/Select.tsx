import React, { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:       string;
  options:      SelectOption[];
  error?:       string;
  hint?:        string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hint, placeholder, id, className = '', ...props }, ref) => {
    const defaultId = useId();
    const selectId  = id ?? defaultId;
    const errorId   = `${selectId}-error`;
    const hintId    = `${selectId}-hint`;
    const hasError  = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-slate-300">
            {label}
            {props.required && (
              <span className="text-brand-400 ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-describedby={[
              error ? errorId : '',
              hint  ? hintId  : '',
            ].filter(Boolean).join(' ') || undefined}
            aria-invalid={hasError}
            className={[
              'w-full appearance-none bg-surface-700 border rounded-lg',
              'pl-4 pr-10 py-2.5 text-sm transition-all duration-150',
              'focus:outline-none focus:ring-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'cursor-pointer',
              hasError
                ? 'border-danger text-slate-100 focus:ring-danger/40'
                : 'border-surface-600 text-slate-100 focus:ring-brand-500/40 focus:border-brand-500',
              className,
            ].filter(Boolean).join(' ')}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger">
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
Select.displayName = 'Select';
