import React, { type ReactNode } from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardVariant = 'default' | 'interactive' | 'glass';

interface CardProps {
  children:    ReactNode;
  padding?:    CardPadding;
  variant?:    CardVariant;
  onClick?:    () => void;
  className?:  string;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

const variantClasses: Record<CardVariant, string> = {
  default:     'bg-surface-800 border border-surface-600/40',
  interactive: 'bg-surface-800 border border-surface-600/40 hover:border-brand-500/40 hover:shadow-glow cursor-pointer transition-all duration-200 hover:-translate-y-0.5',
  glass:       'bg-surface-800/60 backdrop-blur-md border border-white/5',
};

export function Card({
  children,
  padding   = 'md',
  variant   = 'default',
  onClick,
  className = '',
}: CardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'rounded-xl',
        variantClasses[variant],
        paddingClasses[padding],
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
