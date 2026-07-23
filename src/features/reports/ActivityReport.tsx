import React, { useEffect, useState } from 'react';
import { Download, Activity } from 'lucide-react';
import { fetchActivityReport, exportToCSV, type ActivityReportItem } from '@/services/report.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function ActivityReport() {
  const [logs, setLogs] = useState<ActivityReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityReport().then(setLogs).finally(() => setLoading(false));
  }, []);

  function handleExportCSV() {
    if (logs.length === 0) return;
    const exportData = logs.map((log) => ({
      Timestamp: new Date(log.timestamp).toISOString(),
      Type: log.type,
      Action: log.action,
      Actor: log.actorName,
      Role: log.actorRole,
      TargetID: log.targetId,
    }));
    exportToCSV(exportData, `BloodBridge_ActivityReport_${Date.now()}`);
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Activity className="text-info" /> Activity Report
          </h1>
          <p className="text-muted text-sm mt-1">
            System-wide audit trail of workflow state transitions and governance events
          </p>
        </div>

        <Button variant="outline" icon={<Download size={16} className="text-emerald-400" />} onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-muted text-sm p-6 text-center">No system activity logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Action</th>
                  <th className="py-3.5 px-6">Actor</th>
                  <th className="py-3.5 px-6">Target ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {logs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-surface-700/40 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-xs text-muted">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-700 text-slate-200">
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-brand-400">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-6 text-slate-200">
                      {log.actorName} <span className="text-xs text-muted">({log.actorRole})</span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-muted">
                      {log.targetId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
