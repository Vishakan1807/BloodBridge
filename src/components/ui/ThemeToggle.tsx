import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/core/context/ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'dark',     label: 'Dark',     icon: <Moon size={13} /> },
    { id: 'light',    label: 'Light',    icon: <Sun size={13} /> },
    { id: 'moderate', label: 'Moderate', icon: <Monitor size={13} /> },
  ];

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 bg-surface-800/80 border border-surface-600/60 rounded-xl backdrop-blur-md ${className}`}
      role="radiogroup"
      aria-label="Select theme"
    >
      {themes.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-checked={isActive}
            role="radio"
            className={[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold',
              'transition-all duration-150 select-none cursor-pointer',
              isActive
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-muted hover:text-slate-200 hover:bg-surface-700/60',
            ].join(' ')}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
