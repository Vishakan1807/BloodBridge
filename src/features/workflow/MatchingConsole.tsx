import React, { useEffect, useState } from 'react';
import { Target, User, CheckCircle2, Clock, AlertTriangle, ArrowRight, Droplet, Building2, Layers } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { useRequests } from '@/features/requests/hooks/useRequests';
import { listUsers } from '@/services/user.service';
import { subscribeCamps } from '@/services/master.service';
import { transitionWorkflowState } from '@/services/workflow.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { UserProfile } from '@/types/auth.types';
import type { DonationRequest, CampAllocation } from '@/types/request.types';
import type { Camp } from '@/types/master.types';
import { isBloodCompatible } from '@/core/utils/bloodUtils';

interface CampStockInfo {
  campId:   string;
  campName: string;
  city:     string;
  units:    number;
}

export function MatchingConsole() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const { requests, loading } = useRequests();
  const [allDonors, setAllDonors] = useState<UserProfile[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);

  // Selected Request & Match Modal
  const [selectedReq, setSelectedReq] = useState<DonationRequest | null>(null);
  const [allCampStocks, setAllCampStocks] = useState<CampStockInfo[]>([]);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    listUsers().then((users) => {
      setAllDonors(users.filter((u) => u.role === 'user' && u.isActive));
    });
    return subscribeCamps((loaded) => {
      setCamps(loaded);
    });
  }, []);

  // Listen to live inventory across ALL camps when a request is selected
  useEffect(() => {
    if (!selectedReq || camps.length === 0) {
      setAllCampStocks([]);
      return;
    }

    const invRef = ref(db, 'inventory');
    return onValue(invRef, (snapshot) => {
      if (!snapshot.exists()) {
        setAllCampStocks([]);
        return;
      }
      const data = snapshot.val() as Record<string, Record<string, { units: number }>>;
      const stocks: CampStockInfo[] = [];

      for (const camp of camps) {
        const campInv = data[camp.id];
        const bgUnits = campInv?.[selectedReq.requiredBloodGroup]?.units || 0;
        if (bgUnits > 0) {
          stocks.push({
            campId:   camp.id,
            campName: camp.name,
            city:     camp.city,
            units:    bgUnits,
          });
        }
      }
      setAllCampStocks(stocks);
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

  // Single Camp Allocation
  async function handleConfirmSingleCampMatch(campId: string, campName: string, availableUnits: number) {
    if (!selectedReq || !userProfile) return;

    setMatching(true);
    try {
      await transitionWorkflowState(selectedReq.id, 'matched', userProfile, {
        campId,
        campName,
        matchedDonor: {
          uid:  `inventory-${campId}`,
          name: `Live Camp Inventory Stock (${campName})`,
        },
        note: `Allocated ${selectedReq.unitsRequired} unit(s) of ${selectedReq.requiredBloodGroup} from ${campName} stock.`,
      });
      showSuccess(`Allocated ${selectedReq.unitsRequired} unit(s) of ${selectedReq.requiredBloodGroup} from ${campName} stock!`);
      setSelectedReq(null);
    } catch (err: any) {
      showError(err?.message || 'Inventory allocation failed.');
    } finally {
      setMatching(false);
    }
  }

  // Multi-Camp Split Stock Allocation
  async function handleConfirmMultiCampMatch(allocations: CampAllocation[]) {
    if (!selectedReq || !userProfile) return;

    const summaryStr = allocations.map((a) => `${a.campName}: ${a.units}u`).join(', ');

    setMatching(true);
    try {
      await transitionWorkflowState(selectedReq.id, 'matched', userProfile, {
        allocations,
        campId:   allocations[0].campId,
        campName: `Multi-Camp Inventory (${summaryStr})`,
        matchedDonor: {
          uid:  'multi-camp-inventory',
          name: `Multi-Camp Inventory Stock (${summaryStr})`,
        },
        note: `Allocated total ${selectedReq.unitsRequired} units of ${selectedReq.requiredBloodGroup} across multiple camps: ${summaryStr}`,
      });
      showSuccess(`Allocated ${selectedReq.unitsRequired} units of ${selectedReq.requiredBloodGroup} across multiple camps!`);
      setSelectedReq(null);
    } catch (err: any) {
      showError(err?.message || 'Multi-camp allocation failed.');
    } finally {
      setMatching(false);
    }
  }

  // Calculate split allocations across multiple camps to fulfill required units
  function computeMultiCampAllocations(neededUnits: number): CampAllocation[] {
    let remaining = neededUnits;
    const allocations: CampAllocation[] = [];

    for (const c of allCampStocks) {
      if (remaining <= 0) break;
      const allocatedUnits = Math.min(remaining, c.units);
      if (allocatedUnits > 0) {
        allocations.push({
          campId:   c.campId,
          campName: c.campName,
          units:    allocatedUnits,
        });
        remaining -= allocatedUnits;
      }
    }
    return allocations;
  }

  // Filter compatible donors for selected request
  const compatibleDonors = selectedReq
    ? allDonors.filter((d) => isBloodCompatible(d.bloodGroup || '', selectedReq.requiredBloodGroup))
    : [];

  // Stock calculations for selected request
  const totalCombinedStock = allCampStocks.reduce((sum, c) => sum + c.units, 0);
  const unitsNeeded = selectedReq?.unitsRequired || 1;
  const multiCampAllocations = selectedReq ? computeMultiCampAllocations(unitsNeeded) : [];
  const hasFullMultiCampStock = totalCombinedStock >= unitsNeeded;

  return (
    <div className="space-y-6 page-enter">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Target className="text-warning" /> Donor & Multi-Camp Inventory Matching Console
          </h1>
          <p className="text-muted text-sm mt-1">
            Match verified requests via single/multi-camp inventory allocation or registered donors
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
            </div>
            <div className="text-right">
              <p className="text-muted">Blood Required:</p>
              <p className="font-display font-bold text-brand-400 text-lg">{selectedReq?.requiredBloodGroup} ({selectedReq?.unitsRequired} units)</p>
            </div>
          </div>

          {/* Option 1: Multi-Camp & Single-Camp Stock Allocation */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-xs text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Droplet size={14} className="text-brand-400" /> Option 1: Camp Inventory Stock Allocation
            </h3>

            {/* Multi-Camp Split Allocation Banner (If multiple camps are required to fulfill total units) */}
            {allCampStocks.length > 1 && hasFullMultiCampStock && (
              <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white text-sm flex items-center gap-2">
                      <Layers size={16} className="text-brand-400" />
                      Multi-Camp Split Allocation Available!
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Fulfill <strong className="text-brand-400">{unitsNeeded} units</strong> of {selectedReq?.requiredBloodGroup} by combining stock from multiple camps:
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={matching}
                    onClick={() => handleConfirmMultiCampMatch(multiCampAllocations)}
                  >
                    Fulfill via Split Allocation
                  </Button>
                </div>

                {/* Split Allocation breakdown */}
                <div className="bg-surface-900/60 p-3 rounded-lg border border-surface-700/60 text-xs space-y-1.5">
                  <p className="text-muted font-medium">Split Allocation Breakdown:</p>
                  {multiCampAllocations.map((alloc) => (
                    <div key={alloc.campId} className="flex justify-between text-slate-200">
                      <span>• {alloc.campName}:</span>
                      <strong className="text-brand-400">{alloc.units} unit(s)</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Camp Stock Cards */}
            {allCampStocks.length === 0 ? (
              <div className="text-center py-5 text-muted text-xs bg-surface-700/30 rounded-xl border border-surface-600/30">
                No camps currently have {selectedReq?.requiredBloodGroup} in stock.
              </div>
            ) : (
              <div className="space-y-2">
                {allCampStocks.map((c) => {
                  const isSufficient = c.units >= unitsNeeded;
                  return (
                    <div
                      key={c.campId}
                      className="p-3 bg-surface-700/50 rounded-xl border border-surface-600/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white text-sm flex items-center gap-2">
                          <span>{c.campName} ({c.city})</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSufficient ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                          }`}>
                            {c.units} u in stock
                          </span>
                        </p>
                      </div>

                      <Button
                        variant={isSufficient ? 'primary' : 'secondary'}
                        size="sm"
                        disabled={c.units === 0}
                        loading={matching}
                        onClick={() => handleConfirmSingleCampMatch(c.campId, c.campName, c.units)}
                      >
                        {isSufficient ? 'Allocate Full Stock' : `Allocate ${Math.min(c.units, unitsNeeded)} u`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
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
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
