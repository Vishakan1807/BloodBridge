import React, { useEffect, useState } from 'react';
import { ScrollText, Search, Download, Shield, Filter, Clock } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useToast } from '@/core/context/ToastContext';
import { exportToCSV } from '@/services/report.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';

export interface AuditEntry {
  id:            string;
  type:          'WORKFLOW' | 'USER' | 'MASTER_DATA' | 'INVENTORY' | 'SYSTEM';
  action:        string;
  actorUid:      string;
  actorName:     string;
  actorRole:     string;
  targetId:      string;
  targetType:    string;
  previousValue?: any;
  newValue?:      any;
  metadata?:      any;
  timestamp:     number;
}

export function AuditLogPage() {
  const { showError } = useToast();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const auditRef = ref(db, 'audit');
    return onValue(auditRef, (snapshot) => {
      if (!snapshot.exists()) {
        setLogs([]);
        setLoading(false);
        return;
      }
      const data = Object.values(snapshot.val()) as AuditEntry[];
      setLogs(data.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });
  }, []);

  function handleExportCSV() {
    if (logs.length === 0) return;
    const exportData = filteredLogs.map((log) => ({
      ID: log.id,
      Timestamp: new Date(log.timestamp).toISOString(),
      Type: log.type,
      Action: log.action,
      Actor: log.actorName,
      Role: log.actorRole,
      TargetType: log.targetType,
      TargetID: log.targetId,
    }));
    exportToCSV(exportData, `BloodBridge_AuditTrail_${Date.now()}`);
  }

  const typeFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Event Types' },
    { value: 'WORKFLOW', label: 'Workflow Transitions' },
    { value: 'INVENTORY', label: 'Inventory & Stock' },
    { value: 'USER', label: 'User & RBAC Changes' },
    { value: 'MASTER_DATA', label: 'Master Data CRUD' },
  ];

  const filteredLogs = logs.filter((l) => {
    const matchesType = typeFilter === 'all' || l.type === typeFilter;
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.targetId.toLowerCase().includes(search.toLowerCase()) ||
      (l.metadata?.referenceNumber || '').toLowerCase().includes(search.toLowerCase());

    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <ScrollText className="text-brand-400" /> System Audit Trail
          </h1>
          <p className="text-muted text-sm mt-1">
            Immutable, time-stamped log of all system transitions, stock changes, and user actions
          </p>
        </div>

        <Button variant="secondary" icon={<Download size={16} />} onClick={handleExportCSV}>
          Export Audit Log CSV
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            placeholder="Search by action, actor name, or ref #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />

          <Select
            options={typeFilterOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={36} className="text-muted mx-auto mb-3" />
            <p className="text-slate-300 font-medium text-sm">No audit logs found</p>
            <p className="text-xs text-muted mt-1">Audit events will record automatically as system actions occur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Event Type</th>
                  <th className="py-3.5 px-6">Action / Event</th>
                  <th className="py-3.5 px-6">Actor</th>
                  <th className="py-3.5 px-6">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {filteredLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-700/40 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-muted whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          entry.type === 'WORKFLOW'
                            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                            : entry.type === 'INVENTORY'
                            ? 'bg-success/20 text-success border border-success/30'
                            : entry.type === 'USER'
                            ? 'bg-warning/20 text-warning border border-warning/30'
                            : 'bg-surface-700 text-slate-200'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-semibold text-white text-xs">
                      {entry.action}
                      {entry.metadata?.referenceNumber && (
                        <span className="text-brand-400 block text-[11px] font-normal">
                          Ref: {entry.metadata.referenceNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-200">
                      <span className="font-medium">{entry.actorName || 'System'}</span>
                      <span className="text-xs text-muted block">({entry.actorRole || 'system'})</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-muted">
                      {entry.targetType}: {entry.targetId}
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
