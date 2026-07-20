import React from 'react';
import { Moon, Sun, Activity } from 'lucide-react';
import { useTheme, type Theme } from '@/core/context/ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: 'dark',    label: 'Crimson Dark',    icon: <Moon size={13} /> },
    { id: 'light',   label: 'Executive Light', icon: <Sun size={13} /> },
    { id: 'emerald', label: 'Emerald Health',  icon: <Activity size={13} /> },
  ];

  return (
    <div
      className="inline-flex items-center gap-1 p-1 bg-surface-800 border border-surface-600 rounded-xl shadow-md"
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
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold',
              'transition-all duration-150 select-none cursor-pointer',
              isActive
                ? 'bg-brand-500 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white hover:bg-surface-700/60',
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
