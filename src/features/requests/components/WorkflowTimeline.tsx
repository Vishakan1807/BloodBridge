import React from 'react';
import { WORKFLOW_STATES_ORDERED, STATE_CONFIG, type WorkflowState } from '@/core/constants/workflowStates';
import { Check } from 'lucide-react';

interface WorkflowTimelineProps {
  currentState: WorkflowState;
}

export function WorkflowTimeline({ currentState }: WorkflowTimelineProps) {
  const currentConfig = STATE_CONFIG[currentState];
  const currentStep = currentConfig.step;

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-surface-700 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-brand-500 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (WORKFLOW_STATES_ORDERED.length - 1)) * 100}%` }}
        />

        {WORKFLOW_STATES_ORDERED.map((state) => {
          const cfg = STATE_CONFIG[state];
          const isPassed = cfg.step < currentStep;
          const isCurrent = cfg.step === currentStep;

          return (
            <div key={state} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isPassed
                    ? 'bg-brand-500 text-white'
                    : isCurrent
                    ? 'bg-surface-800 border-2 border-brand-500 text-brand-400 pulse-glow'
                    : 'bg-surface-800 border-2 border-surface-600 text-muted'
                }`}
              >
                {isPassed ? <Check size={14} /> : cfg.step}
              </div>

              <span
                className={`text-[11px] font-semibold mt-2 ${
                  isCurrent ? 'text-brand-400' : isPassed ? 'text-slate-200' : 'text-muted'
                }`}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
