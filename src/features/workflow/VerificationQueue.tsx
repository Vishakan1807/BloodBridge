import React, { useEffect, useState } from 'react';
import { ShieldCheck, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
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
import type { DonationRequest } from '@/types/request.types';

export function VerificationQueue() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { requests, loading } = useRequests();
  const [camps, setCamps] = useState<Camp[]>([]);

  // Verification Modal State
  const [selectedReq, setSelectedReq] = useState<DonationRequest | null>(null);
  const [selectedCampId, setSelectedCampId] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    return subscribeCamps((list) => {
      const active = list.filter((c) => c.isActive);
      setCamps(active);
      if (active.length > 0 && !selectedCampId) {
        setSelectedCampId(active[0].id);
      }
    });
  }, []);

  const pendingRequests = requests.filter((r) => r.status === 'registered');

  function handleOpenVerify(req: DonationRequest) {
    setSelectedReq(req);
    if (camps.length > 0) setSelectedCampId(camps[0].id);
    // Modal will render if selectedReq is not null
  }

  async function handleConfirmVerify() {
    if (!selectedReq || !userProfile) return;
    const targetCamp = camps.find((c) => c.id === selectedCampId);

    setVerifying(true);
    try {
      await transitionWorkflowState(selectedReq.id, 'verified', userProfile, {
        campId:   selectedCampId,
        campName: targetCamp?.name || 'Camp',
        note:     `Verified donor details and assigned to camp ${targetCamp?.name}`,
      });
      showSuccess(`Request ${selectedReq.referenceNumber} verified successfully!`);
      setSelectedReq(null);
    } catch (err: any) {
      showError(err?.message || 'Verification failed.');
    } finally {
      setVerifying(false);
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
            Review incoming donation requests in REGISTERED state and assign processing camps
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
                        Verify Request
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
      >
        <div className="space-y-4">
          <div className="bg-surface-700/50 p-4 rounded-lg space-y-2 text-xs text-slate-300 border border-surface-600/50">
            <div className="flex justify-between">
              <span className="text-muted">Patient:</span>
              <strong className="text-white">{selectedReq?.patientName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Blood Group:</span>
              <strong className="text-brand-400 font-display text-sm">{selectedReq?.requiredBloodGroup} ({selectedReq?.unitsRequired} units)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Hospital:</span>
              <strong className="text-white">{selectedReq?.hospitalName}</strong>
            </div>
          </div>

          <Select
            label="Assign Processing Camp"
            options={campOptions}
            value={selectedCampId}
            onChange={(e) => setSelectedCampId(e.target.value)}
            required
          />

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
