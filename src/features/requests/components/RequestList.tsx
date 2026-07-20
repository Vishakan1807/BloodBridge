import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter, ArrowRight, ClipboardList } from 'lucide-react';
import { useRequests } from '../hooks/useRequests';
import { useAuth } from '@/core/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/core/constants/routes';
import { STATE_CONFIG } from '@/core/constants/workflowStates';
import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';

export function RequestList() {
  const { userProfile } = useAuth();
  const { requests, loading, filters, setFilters } = useRequests();

  const isUserRole = userProfile?.role === 'user';

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
    { value: 'critical', label: 'Critical' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'normal', label: 'Normal' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            {isUserRole ? 'My Donation Requests 🩸' : 'Donation Requests Management 🩸'}
          </h1>
          <p className="text-muted text-sm mt-1">
            {isUserRole
              ? 'Track and manage your submitted donation requests'
              : 'System-wide donation transaction records and workflow states'}
          </p>
        </div>

        <Link to={ROUTES.REQUEST_NEW}>
          <Button variant="primary" icon={<PlusCircle size={18} />}>
            New Request
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
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
      </Card>

      {/* Data Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList size={36} className="text-muted mx-auto mb-3" />
            <p className="text-slate-300 font-medium text-sm">No donation requests found</p>
            <p className="text-xs text-muted mt-1">Try adjusting your filters or raise a new request.</p>
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
                  <th className="py-3 px-6">Urgency</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {requests.map((req) => {
                  const stateCfg = STATE_CONFIG[req.status];
                  return (
                    <tr key={req.id} className="hover:bg-surface-700/40 transition-colors">
                      <td className="py-4 px-6 font-mono font-medium text-brand-400">
                        <Link to={`/requests/${req.id}`} className="hover:underline">
                          {req.referenceNumber}
                        </Link>
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
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase ${
                            req.urgency === 'critical'
                              ? 'bg-danger/20 text-danger border border-danger/30'
                              : req.urgency === 'urgent'
                              ? 'bg-warning/20 text-warning border border-warning/30'
                              : 'bg-surface-700 text-slate-300'
                          }`}
                        >
                          {req.urgency}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stateCfg.bgColor} ${stateCfg.color}`}>
                          {stateCfg.label}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/requests/${req.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300"
                        >
                          View <ArrowRight size={14} />
                        </Link>
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
