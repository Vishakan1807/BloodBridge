import React, { useEffect, useState } from 'react';
import { Download, PieChart } from 'lucide-react';
import { fetchSummaryReport, exportToCSV, type SummaryReportMetrics } from '@/services/report.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STATE_CONFIG, type WorkflowState } from '@/core/constants/workflowStates';

export function StatusReport() {
  const [metrics, setMetrics] = useState<SummaryReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummaryReport().then(setMetrics).finally(() => setLoading(false));
  }, []);

  function handleExportCSV() {
    if (!metrics) return;
    const exportData = Object.entries(metrics.statusBreakdown).map(([status, count]) => ({
      Status: status.toUpperCase(),
      Count: count,
      Percentage: metrics.totalRequests > 0 ? `${((count / metrics.totalRequests) * 100).toFixed(1)}%` : '0%',
    }));
    exportToCSV(exportData, `BloodBridge_StatusReport_${Date.now()}`);
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <PieChart className="text-warning" /> Status Report
          </h1>
          <p className="text-muted text-sm mt-1">
            Detailed breakdown of requests across 5-stage workflow lifecycle
          </p>
        </div>

        <Button variant="secondary" icon={<Download size={16} />} onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : !metrics ? (
          <p className="text-muted text-sm p-6 text-center">No data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3.5 px-6">Lifecycle Status</th>
                  <th className="py-3.5 px-6">Request Count</th>
                  <th className="py-3.5 px-6">Percentage</th>
                  <th className="py-3.5 px-6">Status Indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {Object.entries(metrics.statusBreakdown).map(([statusKey, count]) => {
                  const cfg = STATE_CONFIG[statusKey as WorkflowState];
                  const pct = metrics.totalRequests > 0 ? ((count / metrics.totalRequests) * 100).toFixed(1) : '0';
                  return (
                    <tr key={statusKey} className="hover:bg-surface-700/40 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white uppercase">
                        {cfg?.label || statusKey}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-brand-400 text-base">
                        {count}
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-medium">
                        {pct}%
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-full bg-surface-700 h-2.5 rounded-full overflow-hidden max-w-xs">
                          <div
                            className={`h-full rounded-full ${cfg?.bgColor || 'bg-brand-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
