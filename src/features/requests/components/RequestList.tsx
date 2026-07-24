import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter, ArrowRight, ClipboardList, Clock, Archive, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useRequests } from '../hooks/useRequests';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ROUTES } from '@/core/constants/routes';
import { STATE_CONFIG } from '@/core/constants/workflowStates';
import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';
import { transitionWorkflowState } from '@/services/workflow.service';
import type { DonationRequest } from '@/types/request.types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function RequestList() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { requests, loading, filters, setFilters } = useRequests();

  const isUserRole = userProfile?.role === 'user';
  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Tab State: 'active' (< 7 days) vs 'expired' (> 7 days)
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');

  // Expired Tab Filter State: 'all' | 'unclosed' | 'closed'
  const [expiredFilter, setExpiredFilter] = useState<'all' | 'unclosed' | 'closed'>('all');

  // Quick Close Modal for Expired Tab
  const [closeTarget, setCloseTarget] = useState<DonationRequest | null>(null);
  const [closureNotes, setClosureNotes] = useState('');
  const [closing, setClosing]         = useState(false);

  const now = Date.now();

  // Partition requests into Active (< 7 days old) vs Expired (>= 7 days old)
  const activeRequests = requests.filter((r) => (now - r.createdAt) < SEVEN_DAYS_MS);
  const expiredRequests = requests.filter((r) => (now - r.createdAt) >= SEVEN_DAYS_MS);

  // Unclosed expired count for badge
  const unclosedExpiredCount = expiredRequests.filter((r) => r.status !== 'closed').length;

  // Filter expired requests based on expiredFilter selection
  const filteredExpiredRequests = expiredRequests.filter((r) => {
    if (expiredFilter === 'unclosed') return r.status !== 'closed';
    if (expiredFilter === 'closed')   return r.status === 'closed';
    return true;
  });

  const displayedRequests = activeTab === 'active' ? activeRequests : filteredExpiredRequests;

  const statusOptions: SelectOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'registered', label: 'Registered' },
    { value: 'verified', label: 'Verified' },
    { value: 'matched', label: 'Matched' },
    { value: 'donated', label: 'Donated' },
    { value: 'closed', label: 'Closed' },
  ];

  const bloodGroupOptions: SelectOption[] = [
    { value: 'all', label: 'All Blood Groups' },
    ...CLINICAL_BLOOD_GROUPS.map((bg) => ({ value: bg.value, label: bg.label })),
  ];

  const urgencyOptions: SelectOption[] = [
    { value: 'all', label: 'All Urgency Levels' },
    { value: 'critical', label: 'Critical (Immediate)' },
    { value: 'urgent', label: 'Urgent (Within 12h)' },
    { value: 'normal', label: 'Normal (Routine)' },
  ];

  const expiredFilterOptions: SelectOption[] = [
    { value: 'all',      label: 'All Expired Requests' },
    { value: 'unclosed', label: '⚠️ Still Not Closed (Needs Cleanup)' },
    { value: 'closed',   label: '✅ Closed Expired Cases' },
  ];

  async function handleCloseExpiredCase() {
    if (!closeTarget || !userProfile || !closureNotes.trim()) {
      showError('Closure notes are required.');
      return;
    }
    setClosing(true);
    try {
      await transitionWorkflowState(closeTarget.id, 'closed', userProfile, {
        closureNotes: closureNotes.trim(),
      });
      showSuccess(`Expired request ${closeTarget.referenceNumber} has been closed.`);
      setCloseTarget(null);
      setClosureNotes('');
    } catch (err: any) {
      showError(err?.message || 'Failed to close request.');
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            {isUserRole ? 'My Donation Requests 🩸' : 'Donation Requests Management 🩸'}
          </h1>
          <p className="text-muted text-sm mt-1">
            {isUserRole
              ? 'Track and manage your submitted donation requests'
              : 'System-wide donation transaction records, urgency priorities, and 7-day archive'}
          </p>
        </div>

        {isUserRole && (
          <Link to={ROUTES.REQUEST_NEW}>
            <Button variant="primary" icon={<PlusCircle size={18} />}>
              New Request
            </Button>
          </Link>
        )}
      </div>

      {/* ── Active vs Expired Tab Switcher ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-700 pb-3">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 font-bold'
              : 'bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-700'
          }`}
        >
          <Clock size={16} />
          Active Requests (&lt; 7 Days)
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-surface-700 text-slate-300'}`}>
            {activeRequests.length}
          </span>
        </button>

        {isAdminOrManager && (
          <button
            onClick={() => setActiveTab('expired')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'expired'
                ? 'bg-warning/20 border border-warning/40 text-warning shadow-lg font-bold'
                : 'bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            <Archive size={16} />
            Expired Section (&gt; 7 Days)
            {unclosedExpiredCount > 0 ? (
              <span className="text-xs font-bold bg-warning text-slate-950 px-2 py-0.5 rounded-full animate-pulse">
                {unclosedExpiredCount} unclosed
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-slate-300">
                {expiredRequests.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        {activeTab === 'active' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search ref, patient, hospital..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              icon={<Search size={16} />}
            />

            <Select
              options={statusOptions}
              value={filters.status || 'all'}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            />

            <Select
              options={bloodGroupOptions}
              value={filters.bloodGroup || 'all'}
              onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}
            />

            <Select
              options={urgencyOptions}
              value={filters.urgency || 'all'}
              onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
            />
          </div>
        ) : (
          /* Expired Section Filters */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <Input
              placeholder="Search expired requests by ref, patient..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              icon={<Search size={16} />}
            />

            <Select
              label="Expired Request Status Filter"
              options={expiredFilterOptions}
              value={expiredFilter}
              onChange={(e) => setExpiredFilter(e.target.value as any)}
            />
          </div>
        )}
      </Card>

      {/* Data Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : displayedRequests.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList size={36} className="text-muted mx-auto mb-3" />
            <p className="text-slate-300 font-medium text-sm">
              {activeTab === 'active' ? 'No active requests found' : 'No expired requests found'}
            </p>
            <p className="text-xs text-muted mt-1">
              {activeTab === 'active'
                ? 'Try adjusting your filters or raise a new request.'
                : 'All requests older than 7 days will automatically appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3 px-6">Ref #</th>
                  <th className="py-3 px-6">Patient</th>
                  <th className="py-3 px-6">Blood Needed</th>
                  <th className="py-3 px-6">Hospital</th>
                  <th className="py-3 px-6">Urgency Priority</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {displayedRequests.map((req) => {
                  const stateCfg = STATE_CONFIG[req.status];
                  const ageDays  = Math.floor((now - req.createdAt) / (1000 * 60 * 60 * 24));
                  const isClosed = req.status === 'closed';

                  return (
                    <tr key={req.id} className="hover:bg-surface-700/40 transition-colors">
                      <td className="py-4 px-6 font-mono font-medium text-brand-400">
                        <Link to={`/requests/${req.id}`} className="hover:underline">
                          {req.referenceNumber}
                        </Link>
                        {activeTab === 'expired' && (
                          <span className="block text-[10px] text-muted font-normal">
                            Raised {ageDays} days ago
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 font-semibold text-white">
                        {req.patientName}
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-display font-bold text-slate-200">
                          {req.requiredBloodGroup}
                        </span>{' '}
                        <span className="text-xs text-muted">({req.unitsRequired} u)</span>
                      </td>

                      <td className="py-4 px-6 text-slate-300">
                        {req.hospitalName}
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit ${
                            req.urgency === 'critical'
                              ? 'bg-danger/20 text-danger border border-danger/40 animate-pulse font-bold'
                              : req.urgency === 'urgent'
                              ? 'bg-warning/20 text-warning border border-warning/30 font-semibold'
                              : 'bg-surface-700 text-slate-300'
                          }`}
                        >
                          {req.urgency === 'critical' ? '🔴 Critical' : req.urgency === 'urgent' ? '⚡ Urgent' : 'Routine'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stateCfg.bgColor} ${stateCfg.color}`}>
                          {stateCfg.label}
                        </span>
                        {activeTab === 'expired' && !isClosed && (
                          <span className="block text-[10px] text-warning font-bold mt-1 flex items-center gap-1">
                            <AlertTriangle size={11} /> Unclosed
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        <Link
                          to={`/requests/${req.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300"
                        >
                          View <ArrowRight size={14} />
                        </Link>

                        {activeTab === 'expired' && isAdminOrManager && !isClosed && (
                          <button
                            onClick={() => setCloseTarget(req)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-warning hover:text-warning/80 bg-warning/10 px-2 py-1 rounded-lg border border-warning/30 transition-colors cursor-pointer"
                          >
                            Close Case
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Quick Close Expired Case Modal ──────────────────────────── */}
      <Modal
        isOpen={Boolean(closeTarget)}
        onClose={() => setCloseTarget(null)}
        title={`Close Expired Case — ${closeTarget?.referenceNumber}`}
      >
        {closeTarget && (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-warning text-sm flex items-center gap-1">
                <AlertTriangle size={15} /> Expired Request Cleanup (&gt; 7 Days)
              </p>
              <p>This request for <strong>{closeTarget.patientName}</strong> ({closeTarget.requiredBloodGroup}) was raised {Math.floor((now - closeTarget.createdAt)/(1000*60*60*24))} days ago and is currently in <strong>{closeTarget.status.toUpperCase()}</strong> status.</p>
              <p>Closing this case cleans up the database archive and completes the request record.</p>
            </div>

            <Input
              label="Mandatory Case Closure Notes"
              placeholder="e.g. Expired case cleanup by admin after 7 days."
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
              <Button variant="ghost" onClick={() => setCloseTarget(null)}>Cancel</Button>
              <Button variant="primary" loading={closing} onClick={handleCloseExpiredCase}>
                Confirm Case Closure
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
