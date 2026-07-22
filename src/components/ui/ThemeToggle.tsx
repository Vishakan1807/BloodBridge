import React from 'react';
import { Moon, Sun, Activity, Droplet } from 'lucide-react';
import { useTheme, type Theme } from '@/core/context/ThemeContext';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; label: string; icon: React.ReactNode; activeColor: string }[] = [
    {
      id: 'dark',
      label: 'Crimson',
      icon: <Moon size={13} />,
      activeColor: 'bg-gradient-to-r from-brand-600 to-rose-600 text-white shadow-lg shadow-brand-500/30 border border-brand-400/40',
    },
    {
      id: 'light',
      label: 'Light',
      icon: <Sun size={13} />,
      activeColor: 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/25 border border-amber-300/40',
    },
    {
      id: 'emerald',
      label: 'Emerald',
      icon: <Activity size={13} />,
      activeColor: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/40',
    },
  ];

  return (
    <div
      className={`inline-flex items-center p-1 bg-surface-900/90 border border-surface-600/60 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 ${className}`}
      role="radiogroup"
      aria-label="Theme selector"
    >
      <div className="flex items-center gap-1">
        {themes.map((t) => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              aria-checked={isActive}
              role="radio"
              title={`${t.label} Theme`}
              className={`
                relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                transition-all duration-200 cursor-pointer select-none
                ${isActive
                  ? `${t.activeColor} font-bold scale-[1.03]`
                  : 'text-slate-400 hover:text-slate-100 hover:bg-surface-700/50'
                }
              `}
            >
              {t.icon}
              <span className="text-[11px] tracking-tight">{t.label}</span>
              {isActive && (
                <Droplet size={8} className="fill-current animate-pulse text-white/80 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
