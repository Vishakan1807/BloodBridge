import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Radio } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { useRequests } from '@/features/requests/hooks/useRequests';
import { subscribeCamps } from '@/services/master.service';
import { transitionWorkflowState } from '@/services/workflow.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Camp } from '@/types/master.types';
import type { DonationRequest } from '@/types/request.types';

export function VerificationQueue() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { requests, loading } = useRequests();
  const [camps, setCamps] = useState<Camp[]>([]);

  const [selectedReq, setSelectedReq]   = useState<DonationRequest | null>(null);
  const [verifying, setVerifying]         = useState(false);

  useEffect(() => {
    return subscribeCamps((list) => setCamps(list.filter((c) => c.isActive)));
  }, []);

  const pendingRequests = requests.filter((r) => r.status === 'registered');

  // Camps in the same city as the request's donor
  function campsInCity(city: string): Camp[] {
    return camps.filter((c) => c.city.toLowerCase() === city.toLowerCase());
  }

  async function handleBroadcast() {
    if (!selectedReq || !userProfile) return;

    const city = selectedReq.donorCity || userProfile.city || '';
    const cityCamps = campsInCity(city);
    const campSummary = cityCamps.length > 0
      ? cityCamps.map((c) => c.name).join(', ')
      : 'All registered blood banks (no camps in city yet)';

    setVerifying(true);
    try {
      await transitionWorkflowState(selectedReq.id, 'verified', userProfile, {
        campId:   'broadcast',
        campName: `Broadcast — ${city || 'All Cities'}`,
        note:     `Verified and broadcast to ${cityCamps.length} blood bank(s) in ${city}: ${campSummary}`,
      });
      showSuccess(
        `Request ${selectedReq.referenceNumber} verified & broadcast to ${cityCamps.length || 'all'} blood bank(s) in ${city}!`,
      );
      setSelectedReq(null);
    } catch (err: any) {
      showError(err?.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <ShieldCheck className="text-info" /> Donor Verification Queue
          </h1>
          <p className="text-muted text-sm mt-1">
            Review incoming requests and broadcast to blood banks in the donor's district
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
                  <th className="py-3 px-6">Requester</th>
                  <th className="py-3 px-6">Patient</th>
                  <th className="py-3 px-6">Blood Needed</th>
                  <th className="py-3 px-6">District</th>
                  <th className="py-3 px-6">Hospital</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {pendingRequests.map((req) => {
                  const city = req.donorCity || '';
                  const matchingCamps = campsInCity(city);
                  return (
                    <tr key={req.id} className="hover:bg-surface-700/40 transition-colors">
                      <td className="py-4 px-6 font-mono font-medium text-brand-400">{req.referenceNumber}</td>
                      <td className="py-4 px-6 font-semibold text-slate-200">{req.donorName}</td>
                      <td className="py-4 px-6 text-slate-300">{req.patientName}</td>
                      <td className="py-4 px-6">
                        <span className="font-display font-bold text-white">{req.requiredBloodGroup}</span>{' '}
                        <span className="text-xs text-muted">({req.unitsRequired} u)</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-200">{city || '—'}</span>
                        {matchingCamps.length > 0 && (
                          <span className="ml-2 text-xs text-success bg-success/15 px-1.5 py-0.5 rounded-full">
                            {matchingCamps.length} bank{matchingCamps.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-300">{req.hospitalName}</td>
                      <td className="py-4 px-6 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Radio size={14} />}
                          onClick={() => setSelectedReq(req)}
                        >
                          Verify & Broadcast
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Broadcast Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedReq)}
        onClose={() => setSelectedReq(null)}
        title={`Verify & Broadcast — ${selectedReq?.referenceNumber}`}
      >
        <div className="space-y-4">
          {/* Request Summary */}
          <div className="bg-surface-700/50 p-4 rounded-lg space-y-2 text-xs text-slate-300 border border-surface-600/50">
            <div className="flex justify-between">
              <span className="text-muted">Patient:</span>
              <strong className="text-white">{selectedReq?.patientName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Blood Group & Units:</span>
              <strong className="text-brand-400 font-display text-sm">
                {selectedReq?.requiredBloodGroup} × {selectedReq?.unitsRequired} units
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Hospital:</span>
              <strong className="text-white">{selectedReq?.hospitalName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Donor City:</span>
              <strong className="text-white">{selectedReq?.donorCity || '—'}</strong>
            </div>
          </div>

          {/* Who will receive this broadcast */}
          {(() => {
            const city = selectedReq?.donorCity || '';
            const cityCamps = campsInCity(city);
            return (
              <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                  <Radio size={13} /> Broadcast will be sent to:
                </p>
                {cityCamps.length > 0 ? (
                  <ul className="space-y-1">
                    {cityCamps.map((c) => (
                      <li key={c.id} className="text-xs text-slate-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
                        {c.name} ({c.city})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-warning">
                    No blood banks registered in <strong>{city}</strong> yet. The request will be broadcast system-wide.
                  </p>
                )}
              </div>
            );
          })()}

          <p className="text-xs text-muted">
            Once verified, blood banks in the donor's city will see this request on their dashboard and can donate available units on a <strong className="text-slate-300">first-come-first-serve</strong> basis.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setSelectedReq(null)}>Cancel</Button>
            <Button variant="primary" icon={<Radio size={16} />} onClick={handleBroadcast} loading={verifying}>
              Confirm Verification & Broadcast
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
