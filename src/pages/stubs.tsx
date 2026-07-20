import React from 'react';

// ── Generic stub for pages implemented in Day 2–5 ────────────
function ComingSoon({ page }: { page: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-2xl">
        🚧
      </div>
      <h1 className="font-display font-bold text-2xl text-white">{page}</h1>
      <p className="text-muted text-sm max-w-xs">This module is being built. Check back after Day 2.</p>
    </div>
  );
}

export const RoleAssignmentPage   = () => <ComingSoon page="Role Assignment" />;
export const AuditLogPage         = () => <ComingSoon page="Audit Log" />;
export const SystemSettingsPage   = () => <ComingSoon page="System Settings" />;
