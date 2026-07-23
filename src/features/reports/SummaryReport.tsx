import React, { useEffect, useState } from 'react';
import { Download, BarChart3, PieChart, Activity, Calendar } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { fetchSummaryReport, exportToCSV, type SummaryReportMetrics } from '@/services/report.service';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function SummaryReport() {
  const { userProfile } = useAuth();
  const { showError } = useToast();
  const [metrics, setMetrics] = useState<SummaryReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummaryReport()
      .then(setMetrics)
      .catch((err) => showError(err?.message || 'Failed to load report.'))
      .finally(() => setLoading(false));
  }, []);

  function handleExportCSV() {
    if (!metrics) return;
    const exportData = [
      { Metric: 'Total Requests', Value: metrics.totalRequests },
      { Metric: 'Completed Donations', Value: metrics.donatedCount },
      { Metric: 'Pending Requests', Value: metrics.pendingCount },
      { Metric: 'Total Units Donated', Value: metrics.totalUnitsDonated },
    ];
    exportToCSV(exportData, `BloodBridge_SummaryReport_${Date.now()}`);
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <BarChart3 className="text-brand-400" /> Summary Report
          </h1>
          <p className="text-muted text-sm mt-1">
            Aggregate performance metrics and blood group distribution
          </p>
        </div>

        <Button variant="outline" icon={<Download size={16} className="text-emerald-400" />} onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <KPICard
          title="Total Requests"
          value={loading ? '—' : metrics?.totalRequests || 0}
          subtitle="System transactions"
          variant="primary"
        />
        <KPICard
          title="Completed Donations"
          value={loading ? '—' : metrics?.donatedCount || 0}
          subtitle="Successful cases"
          variant="success"
        />
        <KPICard
          title="Pending Queue"
          value={loading ? '—' : metrics?.pendingCount || 0}
          subtitle="Awaiting completion"
          variant="warning"
        />
        <KPICard
          title="Units Donated"
          value={loading ? '—' : metrics?.totalUnitsDonated || 0}
          subtitle="Total 450ml units"
          variant="default"
        />
      </div>

      {/* Blood Group Breakdown Grid */}
      <Card padding="lg">
        <h2 className="font-display font-semibold text-lg text-white mb-4">
          Requests by Blood Group
        </h2>

        {loading ? (
          <div className="skeleton h-20 w-full" />
        ) : !metrics || Object.keys(metrics.groupBreakdown).length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">No transaction records available.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(metrics.groupBreakdown).map(([bg, count]) => (
              <div key={bg} className="p-4 bg-surface-700/50 rounded-xl border border-surface-600/40 text-center">
                <p className="font-display font-bold text-xl text-brand-400">{bg}</p>
                <p className="text-slate-200 font-semibold text-base mt-1">{count} <span className="text-xs text-muted font-normal">reqs</span></p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
