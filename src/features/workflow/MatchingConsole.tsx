import React, { useEffect, useState } from 'react';
import { Target, User, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { useRequests } from '@/features/requests/hooks/useRequests';
import { listUsers } from '@/services/user.service';
import { transitionWorkflowState } from '@/services/workflow.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { UserProfile } from '@/types/auth.types';
import type { DonationRequest } from '@/types/request.types';

export function MatchingConsole() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { requests, loading } = useRequests();
  const [allDonors, setAllDonors] = useState<UserProfile[]>([]);

  // Selected Request & Match Modal
  const [selectedReq, setSelectedReq] = useState<DonationRequest | null>(null);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    listUsers().then((users) => {
      setAllDonors(users.filter((u) => u.role === 'user' && u.isActive));
    });
  }, []);

  const verifiedRequests = requests.filter((r) => r.status === 'verified');

  async function handleConfirmMatch(donor: UserProfile) {
    if (!selectedReq || !userProfile) return;

    setMatching(true);
    try {
      await transitionWorkflowState(selectedReq.id, 'matched', userProfile, {
        matchedDonor: {
          uid:  donor.uid,
          name: donor.displayName || 'Donor',
        },
        note: `Matched donor ${donor.displayName} (${donor.bloodGroup}) to request ${selectedReq.referenceNumber}`,
      });
      showSuccess(`Successfully matched ${donor.displayName} to request ${selectedReq.referenceNumber}!`);
      setSelectedReq(null);
    } catch (err: any) {
      showError(err?.message || 'Matching failed.');
    } finally {
      setMatching(false);
    }
  }

  // Filter compatible donors for selected request
  const compatibleDonors = selectedReq
    ? allDonors.filter((d) => {
        // Exact or compatible match (simplified: exact or O- universal donor)
        return (
          d.bloodGroup === selectedReq.requiredBloodGroup ||
          d.bloodGroup === 'O-' ||
          d.bloodGroup === 'O+'
        );
      })
    : [];

  return (
    <div className="space-y-6 page-enter">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Target className="text-warning" /> Donor Matching Console
          </h1>
          <p className="text-muted text-sm mt-1">
            Match verified requests to eligible registered blood donors
          </p>
        </div>

        <div className="bg-warning-dim/40 border border-warning/30 rounded-xl px-4 py-2 text-right">
          <p className="text-xs text-muted">Awaiting Donor Match</p>
          <p className="font-display font-bold text-xl text-warning">{verifiedRequests.length} Requests</p>
        </div>
      </div>

      {/* Verified Requests List */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : verifiedRequests.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 size={40} className="text-success mx-auto mb-3 opacity-80" />
            <p className="text-slate-200 font-medium text-base">All Verified Requests Matched!</p>
            <p className="text-xs text-muted mt-1">No requests currently waiting for a donor match.</p>
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
                  <th className="py-3 px-6">Assigned Camp</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {verifiedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-700/40 transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-brand-400">
                      {req.referenceNumber}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      {req.patientName}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-display font-bold text-white">{req.requiredBloodGroup}</span>{' '}
                      <span className="text-xs text-muted">({req.unitsRequired} u)</span>
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {req.hospitalName}
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {req.campName || 'Unassigned'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Target size={14} />}
                        onClick={() => setSelectedReq(req)}
                      >
                        Match Donor
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Match Donor Console Modal */}
      <Modal
        isOpen={Boolean(selectedReq)}
        onClose={() => setSelectedReq(null)}
        title={`Matching Console — ${selectedReq?.referenceNumber}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-surface-700/50 p-4 rounded-lg flex items-center justify-between text-xs text-slate-300 border border-surface-600/50">
            <div>
              <p className="text-muted">Target Request:</p>
              <p className="font-semibold text-white text-sm">{selectedReq?.patientName} @ {selectedReq?.hospitalName}</p>
            </div>
            <div className="text-right">
              <p className="text-muted">Blood Required:</p>
              <p className="font-display font-bold text-brand-400 text-base">{selectedReq?.requiredBloodGroup} ({selectedReq?.unitsRequired} units)</p>
            </div>
          </div>

          <h3 className="font-display font-semibold text-sm text-white pt-2">
            Compatible Registered Donors ({compatibleDonors.length})
          </h3>

          {compatibleDonors.length === 0 ? (
            <div className="text-center py-6 text-muted text-xs bg-surface-700/30 rounded-lg">
              No compatible donors currently available for group {selectedReq?.requiredBloodGroup}.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {compatibleDonors.map((donor) => (
                <div
                  key={donor.uid}
                  className="flex items-center justify-between p-3 bg-surface-700/60 rounded-xl border border-surface-600/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center font-display font-bold text-brand-400 text-xs">
                      {donor.bloodGroup}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{donor.displayName}</p>
                      <p className="text-xs text-muted">{donor.city} · {donor.phone || 'No phone'}</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={matching}
                    onClick={() => handleConfirmMatch(donor)}
                  >
                    Confirm Match
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
