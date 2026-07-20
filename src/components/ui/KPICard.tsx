import React, { type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

interface KPICardProps {
  title:     string;
  value:     string | number;
  subtitle?: string;
  icon?:     ReactNode;
  trend?:    {
    value:  string;
    isUp?:   boolean;
  };
  variant?:  'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantIconStyles: Record<NonNullable<KPICardProps['variant']>, string> = {
  default: 'bg-surface-700 text-slate-300 border-surface-600',
  primary: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger:  'bg-danger/15 text-danger border-danger/30',
};

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: KPICardProps) {
  return (
    <Card padding="md" className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="font-display font-bold text-3xl text-white tracking-tight">
            {value}
          </p>
        </div>

        {icon && (
          <div className={`p-3 rounded-xl border ${variantIconStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs">
          {subtitle && <span className="text-muted">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                trend.isUp ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
