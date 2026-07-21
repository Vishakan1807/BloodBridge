import React, { useEffect, useState } from 'react';
import { Target, User, CheckCircle2, Clock, AlertTriangle, ArrowRight, Droplet, Building2 } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { useRequests } from '@/features/requests/hooks/useRequests';
import { listUsers } from '@/services/user.service';
import { subscribeCampInventory, subscribeCamps } from '@/services/master.service';
import { transitionWorkflowState } from '@/services/workflow.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { UserProfile } from '@/types/auth.types';
import type { DonationRequest } from '@/types/request.types';
import type { CampInventory, Camp } from '@/types/master.types';
import { isBloodCompatible } from '@/core/utils/bloodUtils';

export function MatchingConsole() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { requests, loading } = useRequests();
  const [allDonors, setAllDonors] = useState<UserProfile[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);

  // Selected Request & Match Modal
  const [selectedReq, setSelectedReq] = useState<DonationRequest | null>(null);
  const [campInventory, setCampInventory] = useState<CampInventory>({});
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    listUsers().then((users) => {
      setAllDonors(users.filter((u) => u.role === 'user' && u.isActive));
    });
    return subscribeCamps((loaded) => {
      setCamps(loaded);
    });
  }, []);

  // Listen to live inventory for selected request's camp
  useEffect(() => {
    if (!selectedReq) {
      setCampInventory({});
      return;
    }
    const campId = selectedReq.campId || (camps.length > 0 ? camps[0].id : '');
    if (!campId) return;

    return subscribeCampInventory(campId, (inv) => {
      setCampInventory(inv);
    });
  }, [selectedReq, camps]);

  const verifiedRequests = requests.filter((r) => r.status === 'verified');

  // Match from Registered Donor
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
      showSuccess(`Successfully matched donor ${donor.displayName} to request ${selectedReq.referenceNumber}!`);
      setSelectedReq(null);
    } catch (err: any) {
      showError(err?.message || 'Matching failed.');
    } finally {
      setMatching(false);
    }
  }

  // Match / Fulfill from Live Camp Inventory Stock
  async function handleConfirmInventoryMatch(availableUnits: number) {
    if (!selectedReq || !userProfile) return;
    const campName = selectedReq.campName || 'Camp Inventory';

    setMatching(true);
    try {
      await transitionWorkflowState(selectedReq.id, 'matched', userProfile, {
        campId:   selectedReq.campId || undefined,
        campName: selectedReq.campName || undefined,
        matchedDonor: {
          uid:  `inventory-${selectedReq.campId || 'default'}`,
          name: `Live Camp Inventory Stock (${campName})`,
        },
        note: `Allocated ${selectedReq.unitsRequired} unit(s) of ${selectedReq.requiredBloodGroup} from ${campName} live stock (Available: ${availableUnits} units).`,
      });
      showSuccess(`Allocated ${selectedReq.unitsRequired} unit(s) of ${selectedReq.requiredBloodGroup} from ${campName} stock!`);
      setSelectedReq(null);
    } catch (err: any) {
      showError(err?.message || 'Inventory allocation failed.');
    } finally {
      setMatching(false);
    }
  }

  // Filter compatible donors for selected request
  const compatibleDonors = selectedReq
    ? allDonors.filter((d) => isBloodCompatible(d.bloodGroup || '', selectedReq.requiredBloodGroup))
    : [];

  // Check inventory stock for selected request
  const stockItem = selectedReq ? campInventory[selectedReq.requiredBloodGroup] : undefined;
  const availableStockUnits = stockItem?.units || 0;
  const hasSufficientStock = availableStockUnits >= (selectedReq?.unitsRequired || 1);

  return (
    <div className="space-y-6 page-enter">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Target className="text-warning" /> Donor & Inventory Matching Console
          </h1>
          <p className="text-muted text-sm mt-1">
            Match verified requests to live camp inventory stock or compatible registered donors
          </p>
        </div>

        <div className="bg-warning-dim/40 border border-warning/30 rounded-xl px-4 py-2 text-right">
          <p className="text-xs text-muted">Awaiting Match</p>
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
            <p className="text-xs text-muted mt-1">No requests currently waiting for a donor or stock match.</p>
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
                        Open Match Console
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Match Console Modal */}
      <Modal
        isOpen={Boolean(selectedReq)}
        onClose={() => setSelectedReq(null)}
        title={`Matching Console — ${selectedReq?.referenceNumber}`}
        size="lg"
      >
        <div className="space-y-5">
          {/* Target Request Banner */}
          <div className="bg-surface-700/50 p-4 rounded-xl flex items-center justify-between text-xs text-slate-300 border border-surface-600/50">
            <div>
              <p className="text-muted">Target Patient & Destination:</p>
              <p className="font-semibold text-white text-sm">{selectedReq?.patientName} @ {selectedReq?.hospitalName}</p>
              <p className="text-muted mt-0.5">Processing Camp: <span className="text-slate-200">{selectedReq?.campName || 'Default Camp'}</span></p>
            </div>
            <div className="text-right">
              <p className="text-muted">Blood Required:</p>
              <p className="font-display font-bold text-brand-400 text-lg">{selectedReq?.requiredBloodGroup} ({selectedReq?.unitsRequired} units)</p>
            </div>
          </div>

          {/* Option 1: Live Camp Stock Inventory Allocation */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-xs text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Droplet size={14} className="text-brand-400" /> Option 1: Live Camp Inventory Stock
            </h3>

            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              hasSufficientStock
                ? 'bg-success/10 border-success/30'
                : availableStockUnits > 0
                ? 'bg-warning/10 border-warning/30'
                : 'bg-surface-700/40 border-surface-600/40'
            }`}>
              <div>
                <p className="font-semibold text-white text-sm flex items-center gap-2">
                  <span>{selectedReq?.campName || 'Assigned Camp Inventory'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    availableStockUnits > 0 ? 'bg-success/20 text-success' : 'bg-surface-700 text-muted'
                  }`}>
                    {availableStockUnits} units in stock
                  </span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {hasSufficientStock
                    ? `Sufficient stock available! Fulfill ${selectedReq?.unitsRequired} unit(s) of ${selectedReq?.requiredBloodGroup} directly from inventory.`
                    : availableStockUnits > 0
                    ? `Partial stock available (${availableStockUnits} / ${selectedReq?.unitsRequired} units needed).`
                    : `No ${selectedReq?.requiredBloodGroup} units currently in camp stock.`}
                </p>
              </div>

              <Button
                variant={hasSufficientStock ? 'primary' : 'secondary'}
                size="sm"
                disabled={availableStockUnits === 0}
                loading={matching}
                onClick={() => handleConfirmInventoryMatch(availableStockUnits)}
              >
                Allocate Camp Stock
              </Button>
            </div>
          </div>

          {/* Option 2: Compatible Registered Donors */}
          <div className="space-y-2 pt-2">
            <h3 className="font-display font-semibold text-xs text-muted uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} className="text-info" /> Option 2: Compatible Registered Donors ({compatibleDonors.length})
            </h3>

            {compatibleDonors.length === 0 ? (
              <div className="text-center py-5 text-muted text-xs bg-surface-700/30 rounded-xl border border-surface-600/30">
                No individual registered donors found matching group {selectedReq?.requiredBloodGroup}.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
        </div>
      </Modal>
    </div>
  );
}
