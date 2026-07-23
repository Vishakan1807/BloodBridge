import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:      Variant;
  size?:         Size;
  loading?:      boolean;
  icon?:         ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?:    boolean;
  children:      ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm',
  secondary: 'bg-surface-800 text-slate-200 hover:bg-surface-700 hover:text-white border border-surface-600 shadow-sm',
  danger:    'bg-danger text-white hover:bg-red-600 active:bg-red-700',
  ghost:     'bg-transparent text-slate-300 hover:bg-surface-700 hover:text-white',
  outline:   'border border-surface-600 text-slate-200 hover:bg-surface-700 hover:text-white bg-surface-800/80 shadow-sm',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2.5',
};

export function Button({
  variant      = 'primary',
  size         = 'md',
  loading      = false,
  icon,
  iconPosition = 'left',
  fullWidth    = false,
  children,
  disabled,
  className    = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-all duration-150 ease-in-out',
        'focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2',
        'cursor-pointer select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" />
      ) : (
        icon && iconPosition === 'left' && (
          <span className="shrink-0">{icon}</span>
        )
      )}
      <span className={loading ? 'opacity-70' : ''}>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
}
