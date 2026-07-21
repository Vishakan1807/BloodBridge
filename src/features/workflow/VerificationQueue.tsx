import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Layers, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { useRequests } from '@/features/requests/hooks/useRequests';
import { subscribeCamps } from '@/services/master.service';
import { transitionWorkflowState } from '@/services/workflow.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import type { Camp } from '@/types/master.types';
import type { DonationRequest, CampAllocation } from '@/types/request.types';

export function VerificationQueue() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { requests, loading } = useRequests();
  const [camps, setCamps] = useState<Camp[]>([]);

  // Verification Modal State
  const [selectedReq, setSelectedReq] = useState<DonationRequest | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Single-camp assignment
  const [selectedCampId, setSelectedCampId] = useState('');

  // Multi-camp assignment
  const [isMultiCamp, setIsMultiCamp] = useState(false);
  const [allocations, setAllocations] = useState<CampAllocation[]>([
    { campId: '', campName: '', units: 1 },
  ]);

  // Load ONLY real camps from database
  useEffect(() => {
    return subscribeCamps((list) => {
      const active = list.filter((c) => c.isActive);
      setCamps(active);

      if (active.length > 0 && !selectedCampId) {
        // If manager, default to their camp
        if (userProfile?.role === 'manager') {
          const myCamp = active.find(
            (c) => c.id === userProfile.campId || c.coordinatorUid === userProfile.uid,
          );
          setSelectedCampId(myCamp?.id || active[0].id);
        } else {
          setSelectedCampId(active[0].id);
        }
      }
    });
  }, [userProfile]);

  const pendingRequests = requests.filter((r) => r.status === 'registered');

  function handleOpenVerify(req: DonationRequest) {
    setSelectedReq(req);
    setIsMultiCamp(false);
    setAllocations([{ campId: '', campName: '', units: req.unitsRequired }]);

    if (userProfile?.role === 'manager') {
      const myCamp = camps.find(
        (c) => c.id === userProfile.campId || c.coordinatorUid === userProfile.uid,
      );
      setSelectedCampId(myCamp?.id || (camps[0]?.id || ''));
    } else {
      setSelectedCampId(camps[0]?.id || '');
    }
  }

  // Update an allocation row
  function updateAllocation(index: number, field: keyof CampAllocation, value: string | number) {
    setAllocations((prev) => {
      const next = [...prev];
      if (field === 'campId') {
        const camp = camps.find((c) => c.id === value);
        next[index] = { ...next[index], campId: value as string, campName: camp?.name || '' };
      } else if (field === 'units') {
        next[index] = { ...next[index], units: Number(value) };
      }
      return next;
    });
  }

  function addAllocationRow() {
    setAllocations((prev) => [...prev, { campId: '', campName: '', units: 1 }]);
  }

  function removeAllocationRow(index: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  }

  const totalAllocatedUnits = allocations.reduce((sum, a) => sum + (a.units || 0), 0);

  async function handleConfirmVerify() {
    if (!selectedReq || !userProfile) return;

    if (isMultiCamp) {
      // Validate multi-camp allocation
      const validAllocs = allocations.filter((a) => a.campId && a.units > 0);
      if (validAllocs.length === 0) {
        showError('Please assign at least one camp with units.');
        return;
      }
      if (totalAllocatedUnits !== selectedReq.unitsRequired) {
        showError(
          `Total allocated units (${totalAllocatedUnits}) must equal units required (${selectedReq.unitsRequired}).`,
        );
        return;
      }

      setVerifying(true);
      try {
        await transitionWorkflowState(selectedReq.id, 'verified', userProfile, {
          campId:   validAllocs[0].campId,
          campName: `Multi-Camp: ${validAllocs.map((a) => a.campName).join(' + ')}`,
          allocations: validAllocs,
          note: `Verified & pre-allocated ${selectedReq.unitsRequired} units across: ${validAllocs.map((a) => `${a.campName} (${a.units}u)`).join(', ')}`,
        });
        showSuccess(`Request ${selectedReq.referenceNumber} verified with multi-camp allocation!`);
        setSelectedReq(null);
      } catch (err: any) {
        showError(err?.message || 'Verification failed.');
      } finally {
        setVerifying(false);
      }
    } else {
      // Single-camp assignment
      const targetCamp = camps.find((c) => c.id === selectedCampId);
      if (!targetCamp) {
        showError('Please select a processing camp.');
        return;
      }

      setVerifying(true);
      try {
        await transitionWorkflowState(selectedReq.id, 'verified', userProfile, {
          campId:   targetCamp.id,
          campName: targetCamp.name,
          note:     `Verified donor details and assigned to processing camp ${targetCamp.name}`,
        });
        showSuccess(`Request ${selectedReq.referenceNumber} verified and assigned to ${targetCamp.name}!`);
        setSelectedReq(null);
      } catch (err: any) {
        showError(err?.message || 'Verification failed.');
      } finally {
        setVerifying(false);
      }
    }
  }

  const campOptions: SelectOption[] = camps.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.city})`,
  }));

  return (
    <div className="space-y-6 page-enter">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <ShieldCheck className="text-info" /> Donor Verification Queue
          </h1>
          <p className="text-muted text-sm mt-1">
            Review incoming donation requests and assign processing blood bank(s)
          </p>
        </div>

        <div className="bg-info-dim/40 border border-info/30 rounded-xl px-4 py-2 text-right">
          <p className="text-xs text-muted">Pending Verification</p>
          <p className="font-display font-bold text-xl text-info">{pendingRequests.length} Requests</p>
        </div>
      </div>

      {/* Queue Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 size={40} className="text-success mx-auto mb-3 opacity-80" />
            <p className="text-slate-200 font-medium text-base">Verification Queue Clear!</p>
            <p className="text-xs text-muted mt-1">All incoming donation requests have been verified.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3 px-6">Ref #</th>
                  <th className="py-3 px-6">Donor / Requester</th>
                  <th className="py-3 px-6">Patient</th>
                  <th className="py-3 px-6">Blood Needed</th>
                  <th className="py-3 px-6">Hospital Destination</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-700/40 transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-brand-400">
                      {req.referenceNumber}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      {req.donorName}
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {req.patientName}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-display font-bold text-white">{req.requiredBloodGroup}</span>{' '}
                      <span className="text-xs text-muted">({req.unitsRequired} u)</span>
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {req.hospitalName}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<ShieldCheck size={14} />}
                        onClick={() => handleOpenVerify(req)}
                      >
                        Verify & Assign
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Verify & Assign Camp Modal */}
      <Modal
        isOpen={Boolean(selectedReq)}
        onClose={() => setSelectedReq(null)}
        title={`Verify Request — ${selectedReq?.referenceNumber}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Request Summary */}
          <div className="bg-surface-700/50 p-4 rounded-lg space-y-2 text-xs text-slate-300 border border-surface-600/50">
            <div className="flex justify-between">
              <span className="text-muted">Patient:</span>
              <strong className="text-white">{selectedReq?.patientName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Blood Group:</span>
              <strong className="text-brand-400 font-display text-sm">
                {selectedReq?.requiredBloodGroup} ({selectedReq?.unitsRequired} units required)
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Hospital:</span>
              <strong className="text-white">{selectedReq?.hospitalName}</strong>
            </div>
          </div>

          {/* Toggle: Single vs Multi-Camp */}
          <div className="flex items-center gap-3 bg-surface-700/40 rounded-xl p-3 border border-surface-600/40">
            <button
              type="button"
              onClick={() => setIsMultiCamp(false)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                !isMultiCamp
                  ? 'bg-brand-500 text-white shadow'
                  : 'text-muted hover:text-white'
              }`}
            >
              Single Blood Bank
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMultiCamp(true);
                setAllocations([
                  { campId: '', campName: '', units: Math.ceil((selectedReq?.unitsRequired || 1) / 2) },
                  { campId: '', campName: '', units: Math.floor((selectedReq?.unitsRequired || 1) / 2) },
                ]);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                isMultiCamp
                  ? 'bg-brand-500 text-white shadow'
                  : 'text-muted hover:text-white'
              }`}
            >
              <Layers size={13} /> Multi Blood Bank Split
            </button>
          </div>

          {/* Single-Camp Assignment */}
          {!isMultiCamp && (
            <Select
              label="Assign Processing Blood Bank"
              options={campOptions}
              value={selectedCampId}
              onChange={(e) => setSelectedCampId(e.target.value)}
              required
            />
          )}

          {/* Multi-Camp Assignment */}
          {isMultiCamp && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted font-semibold uppercase tracking-wider">
                  Allocate units across blood banks:
                </p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  totalAllocatedUnits === selectedReq?.unitsRequired
                    ? 'bg-success/20 text-success'
                    : 'bg-warning/20 text-warning'
                }`}>
                  {totalAllocatedUnits} / {selectedReq?.unitsRequired} units assigned
                </span>
              </div>

              {allocations.map((alloc, i) => (
                <div key={i} className="flex items-end gap-2 bg-surface-700/40 p-3 rounded-xl border border-surface-600/40">
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">Blood Bank {i + 1}</label>
                    <select
                      value={alloc.campId}
                      onChange={(e) => updateAllocation(i, 'campId', e.target.value)}
                      className="w-full bg-surface-700 border border-surface-600 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      required
                    >
                      <option value="">Select Blood Bank...</option>
                      {camps.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="block text-xs text-muted mb-1">Units</label>
                    <input
                      type="number"
                      min={1}
                      value={alloc.units}
                      onChange={(e) => updateAllocation(i, 'units', Number(e.target.value))}
                      className="w-full bg-surface-700 border border-surface-600 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-center"
                    />
                  </div>

                  {allocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAllocationRow(i)}
                      className="p-2 text-muted hover:text-danger rounded-lg hover:bg-surface-600 transition-colors mb-0.5"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                onClick={addAllocationRow}
              >
                Add Another Blood Bank
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setSelectedReq(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmVerify} loading={verifying}>
              Confirm Verification
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
