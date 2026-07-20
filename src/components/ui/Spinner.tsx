import React from 'react';
import { Loader2 } from 'lucide-react';

type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 40,
};

interface SpinnerProps {
  size?:      SpinnerSize;
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <Loader2
      size={sizeMap[size]}
      className={`animate-spin text-brand-500 ${className}`}
      aria-label="Loading"
    />
  );
}
