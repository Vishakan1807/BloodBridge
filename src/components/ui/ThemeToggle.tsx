import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Activity, Sparkles, Check, ChevronDown, ArrowRight } from 'lucide-react';
import { useTheme, type Theme } from '@/core/context/ThemeContext';

interface ThemeConfig {
  id:          Theme;
  name:        string;
  tagline:     string;
  icon:        React.ReactNode;
  accentBg:    string;
  hoverBg:     string;
  glowColor:   string;
  badgeBorder: string;
  dotColor:    string;
}

const THEME_CONFIGS: ThemeConfig[] = [
  {
    id: 'dark',
    name: 'Crimson Dark',
    tagline: 'Deep Midnight & Crimson Red',
    icon: <Moon size={16} className="text-rose-400 shrink-0" />,
    accentBg: 'bg-[#2a0612] border-2 border-rose-500 text-white shadow-md shadow-rose-500/20',
    hoverBg: 'bg-[#180309] border border-rose-900/80 hover:bg-[#2b0814] hover:border-rose-500/80',
    glowColor: 'shadow-rose-500/25 ring-rose-500/40',
    badgeBorder: 'border-rose-500/40',
    dotColor: 'bg-rose-500',
  },
  {
    id: 'light',
    name: 'Executive Light',
    tagline: 'Clean High-Contrast Clinical',
    icon: <Sun size={16} className="text-amber-400 shrink-0" />,
    accentBg: 'bg-[#0e2439] border-2 border-amber-400 text-white shadow-md shadow-amber-400/20',
    hoverBg: 'bg-[#081522] border border-slate-700 hover:bg-[#122e49] hover:border-amber-400/80',
    glowColor: 'shadow-amber-500/25 ring-amber-500/40',
    badgeBorder: 'border-amber-400/40',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'emerald',
    name: 'Emerald Health',
    tagline: 'Vibrant Clinical Green',
    icon: <Activity size={16} className="text-emerald-400 shrink-0" />,
    accentBg: 'bg-[#032e22] border-2 border-emerald-400 text-white shadow-md shadow-emerald-400/20',
    hoverBg: 'bg-[#021c15] border border-emerald-900/80 hover:bg-[#043d2d] hover:border-emerald-400/80',
    glowColor: 'shadow-emerald-500/25 ring-emerald-500/40',
    badgeBorder: 'border-emerald-400/40',
    dotColor: 'bg-emerald-400',
  },
];

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen]  = useState(false);
  const containerRef         = useRef<HTMLDivElement>(null);

  const currentConfig = THEME_CONFIGS.find((t) => t.id === theme) || THEME_CONFIGS[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* ── Unique "Blood Core" Orb Trigger Button ─────────────────────── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle Theme Menu"
        aria-expanded={isOpen}
        className={`
          group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full
          bg-[#0b0f17] border ${currentConfig.badgeBorder}
          shadow-lg ${currentConfig.glowColor}
          hover:scale-[1.04] hover:shadow-xl active:scale-[0.98]
          transition-all duration-300 cursor-pointer select-none
        `}
      >
        {/* Pulsing Liquid Aura Ring */}
        <span className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentConfig.dotColor} opacity-40`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentConfig.dotColor} shadow-sm`} />
        </span>

        {/* Current Theme Icon & Name */}
        <div className="flex items-center gap-1.5">
          {currentConfig.icon}
          <span className="text-xs font-bold text-white tracking-wide">
            {currentConfig.name}
          </span>
        </div>

        {/* Fancy Sparkle & Chevron Indicator */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-700 text-slate-400 group-hover:text-white transition-colors">
          <Sparkles size={11} className="text-amber-400 animate-pulse" />
          <ChevronDown
            size={13}
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-400' : ''}`}
          />
        </div>
      </button>

      {/* ── 100% Solid Opaque Popover Palette Menu ────────────────── */}
      {isOpen && (
        <div
          style={{ backgroundColor: '#0b0f17' }}
          className="absolute right-0 mt-2.5 w-72 p-2.5 z-[999999] border-2 border-slate-600 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.99)] opacity-100 space-y-2 select-none"
        >
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-700/80 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand-400" /> Select Theme Mode
            </span>
            <span className="text-[10px] text-brand-400 font-mono font-bold">BloodBridge</span>
          </div>

          {THEME_CONFIGS.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`
                  group w-full flex items-center justify-between p-3 rounded-xl text-left
                  transition-all duration-200 cursor-pointer shadow-sm
                  hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
                  ${isActive
                    ? `${t.accentBg}`
                    : `${t.hoverBg}`
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2.5 rounded-lg bg-[#05080e] border ${t.badgeBorder} shrink-0
                    group-hover:scale-110 group-hover:rotate-6
                    transition-all duration-200
                  `}>
                    {t.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                        {t.name}
                      </span>
                      {isActive && (
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dotColor} animate-ping`} />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300 group-hover:text-white transition-colors tracking-tight mt-0.5 font-medium">
                      {t.tagline}
                    </p>
                  </div>
                </div>

                {isActive ? (
                  <div className="w-5 h-5 rounded-full bg-brand-500/30 border border-brand-400 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-brand-400" />
                  </div>
                ) : (
                  <ArrowRight size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
