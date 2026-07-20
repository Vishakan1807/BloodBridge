import React from 'react';

interface InventoryGaugeProps {
  bloodGroup: string;
  units:      number;
  maxUnits?:  number;
}

export function InventoryGauge({ bloodGroup, units, maxUnits = 25 }: InventoryGaugeProps) {
  const percentage = Math.min(100, Math.round((units / maxUnits) * 100));

  let colorClass = 'bg-success';
  let badgeText = 'Normal Stock';
  let badgeClass = 'text-success bg-success-dim/50 border-success/30';

  if (units <= 3) {
    colorClass = 'bg-danger';
    badgeText = units === 0 ? 'Out of Stock' : 'Critical Low';
    badgeClass = 'text-danger bg-danger-dim/50 border-danger/30';
  } else if (units <= 8) {
    colorClass = 'bg-warning';
    badgeText = 'Low Stock';
    badgeClass = 'text-warning bg-warning-dim/50 border-warning/30';
  }

  return (
    <div className="bg-surface-800 border border-surface-600/40 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center font-display font-bold text-brand-400 text-sm">
            {bloodGroup}
          </span>
          <div>
            <p className="text-xs text-muted font-medium">Blood Stock</p>
            <p className="font-display font-bold text-lg text-white leading-none">
              {units} <span className="text-xs font-normal text-muted">units</span>
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
          {badgeText}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-surface-700 h-2 rounded-full overflow-hidden mt-2">
        <div
          className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
