import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Target, Droplet, AlertTriangle, PlusCircle, Droplets, Clock, CheckCircle2, Activity } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { KPICard } from '@/components/ui/KPICard';
import { InventoryGauge } from '@/components/ui/InventoryGauge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ROUTES } from '@/core/constants/routes';
import { subscribeCampInventory, subscribeCamps, updateInventoryStock } from '@/services/master.service';
import { partialDonate } from '@/services/workflow.service';
import type { CampInventory, Camp } from '@/types/master.types';
import type { DonationRequest } from '@/types/request.types';
import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';

const BLOOD_GROUPS = CLINICAL_BLOOD_GROUPS.map((g) => g.value);

export function CoordinatorDashboard() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();

  const isAdmin   = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager';

  const [camps, setCamps]               = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string>('');
  const [inventory, setInventory]       = useState<CampInventory>({});
  const [pendingVerifications, setPendingVerifications] = useState(0);

  // City requests (broadcast requests in coordinator's city)
  const [cityRequests, setCityRequests] = useState<DonationRequest[]>([]);

  // Stock Inward Modal
  const [stockModalOpen, setStockModalOpen]   = useState(false);
  const [stockBloodGroup, setStockBloodGroup] = useState('O+');
  const [stockUnits, setStockUnits]           = useState(0);
  const [savingStock, setSavingStock]         = useState(false);

  // Donate to Request Modal
  const [donateReq, setDonateReq]       = useState<DonationRequest | null>(null);
  const [donateUnits, setDonateUnits]   = useState(1);
  const [donating, setDonating]         = useState(false);

  // Load real camps from DB
  useEffect(() => {
    return subscribeCamps((loadedCamps) => {
      const active = loadedCamps.filter((c) => c.isActive);
      setCamps(active);

      if (isManager && userProfile) {
        const myCamp = active.find(
          (c) => c.id === userProfile.campId || c.coordinatorUid === userProfile.uid,
        );
        if (myCamp) setSelectedCampId(myCamp.id);
      } else if (isAdmin && active.length > 0) {
        setSelectedCampId((prev) => prev || active[0].id);
      }
    });
  }, [userProfile, isManager, isAdmin]);

  // Load inventory for selected camp
  useEffect(() => {
    if (!selectedCampId) { setInventory({}); return; }
    return subscribeCampInventory(selectedCampId, setInventory);
  }, [selectedCampId]);

  const currentCamp = camps.find((c) => c.id === selectedCampId);

  // Load pending verification count and city-broadcast requests
  useEffect(() => {
    const requestsRef = ref(db, 'requests');
    return onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPendingVerifications(0);
        setCityRequests([]);
        return;
      }
      const data = Object.values(snapshot.val()) as DonationRequest[];
      setPendingVerifications(data.filter((r) => r.status === 'registered').length);

      // City-broadcast requests visible to this camp
      const campCity = currentCamp?.city?.toLowerCase() || userProfile?.city?.toLowerCase() || '';

      const cityBroadcastReqs = data.filter((r) => {
        if (r.status !== 'verified') return false;
        if (r.campId !== 'broadcast') return false;
        // Match city — show if camp's city matches donor's city, or if no city info, show all
        if (!campCity) return true;
        const reqCity = (r.donorCity || '').toLowerCase();
        return !reqCity || reqCity === campCity;
      });

      setCityRequests(cityBroadcastReqs);
    });
  }, [selectedCampId, currentCamp, userProfile]);

  // Computed values
  const totalUnits   = Object.values(inventory).reduce((sum, item) => sum + (item.units || 0), 0);
  const lowStockCount = BLOOD_GROUPS.filter((bg) => (inventory[bg]?.units || 0) <= 3).length;

  // Open Donate Modal for a specific request
  function handleOpenDonate(req: DonationRequest) {
    const alreadyFulfilled = req.unitsFulfilled || 0;
    const stillNeeded      = req.unitsRequired - alreadyFulfilled;
    const campStock        = inventory[req.requiredBloodGroup]?.units || 0;
    const canDonate        = Math.min(stillNeeded, campStock);
    setDonateReq(req);
    setDonateUnits(canDonate > 0 ? canDonate : 1);
  }

  async function handleConfirmDonate() {
    if (!donateReq || !userProfile || !currentCamp) return;
    setDonating(true);
    try {
      const result = await partialDonate(
        donateReq.id,
        userProfile,
        currentCamp.id,
        currentCamp.name,
        donateUnits,
      );
      if (result.fulfilled) {
        showSuccess(`🎉 Request ${donateReq.referenceNumber} fully fulfilled! All ${donateReq.unitsRequired} units allocated.`);
      } else {
        showSuccess(`✅ Donated ${donateUnits} unit(s) to request ${donateReq.referenceNumber}. ${result.unitsFulfilled}/${donateReq.unitsRequired} units fulfilled.`);
      }
      setDonateReq(null);
    } catch (err: any) {
      showError(err?.message || 'Donation failed.');
    } finally {
      setDonating(false);
    }
  }

  async function handleSaveStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampId) return;
    setSavingStock(true);
    try {
      await updateInventoryStock(selectedCampId, stockBloodGroup, Number(stockUnits), userProfile?.uid ?? 'system');
      showSuccess(`Updated ${stockBloodGroup} to ${stockUnits} units for ${currentCamp?.name}.`);
      setStockModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to update stock.');
    } finally {
      setSavingStock(false);
    }
  }

  const bloodGroupSelectOptions: SelectOption[] = CLINICAL_BLOOD_GROUPS.map((bg) => ({
    value: bg.value,
    label: bg.label,
  }));

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Camp Coordinator Dashboard 🏢</h1>
          <p className="text-muted text-sm mt-1">Real-time blood stock monitoring and city request fulfillment</p>
        </div>

        {isAdmin ? (
          camps.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">Select Camp (Admin):</span>
              <select
                value={selectedCampId}
                onChange={(e) => setSelectedCampId(e.target.value)}
                className="bg-surface-700 border border-surface-600 text-slate-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {camps.map((camp) => (
                  <option key={camp.id} value={camp.id}>{camp.name} ({camp.city})</option>
                ))}
              </select>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 bg-surface-700/60 border border-surface-600 px-4 py-2 rounded-xl text-xs">
            <span className="text-muted">Assigned Blood Bank:</span>
            <span className="font-bold text-brand-400 text-sm font-display">
              {currentCamp ? `${currentCamp.name} (${currentCamp.city})` : 'Loading...'}
            </span>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <KPICard title="Pending Verification" value={pendingVerifications} subtitle="Requests in Registered state" icon={<ShieldCheck size={20} />} variant="warning" />
        <KPICard title="City Requests" value={cityRequests.length} subtitle="Broadcast requests in your city" icon={<Activity size={20} />} variant="primary" />
        <KPICard title="Camp Stock Units" value={totalUnits} subtitle="Total available units" icon={<Droplet size={20} />} variant="success" />
        <KPICard title="Low Stock Alerts" value={lowStockCount} subtitle="Blood groups ≤ 3 units" icon={<AlertTriangle size={20} />} variant={lowStockCount > 0 ? 'danger' : 'default'} />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link to={ROUTES.WORKFLOW_VERIFY} className="flex-1">
          <Button variant="secondary" fullWidth icon={<ShieldCheck size={18} />}>
            Open Verification Queue ({pendingVerifications})
          </Button>
        </Link>
        <Link to={ROUTES.WORKFLOW_MATCH} className="flex-1">
          <Button variant="secondary" fullWidth icon={<Target size={18} />}>
            Fulfillment Status
          </Button>
        </Link>
      </div>

      {/* City Requests — First-Come-First-Serve Donate Panel */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
              <Droplets size={20} className="text-brand-400" />
              Blood Requests in {currentCamp?.city || 'Your City'}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Broadcast requests that need fulfillment — donate available units on a first-come-first-serve basis
            </p>
          </div>
        </div>

        {cityRequests.length === 0 ? (
          <div className="text-center py-10 bg-surface-700/30 rounded-xl border border-surface-600/30">
            <CheckCircle2 size={34} className="text-success mx-auto mb-2 opacity-70" />
            <p className="text-slate-200 font-medium text-sm">No pending requests in {currentCamp?.city || 'your city'}</p>
            <p className="text-xs text-muted mt-1">All city requests are fulfilled or none have been broadcast yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cityRequests.map((req) => {
              const fulfilled   = req.unitsFulfilled || 0;
              const stillNeeded = req.unitsRequired - fulfilled;
              const campStock   = inventory[req.requiredBloodGroup]?.units || 0;
              const canDonate   = Math.min(stillNeeded, campStock);
              const alreadyDonatedByUs = (req.partialDonations || []).some(
                (d) => d.campId === selectedCampId,
              );
              const pct = Math.round((fulfilled / req.unitsRequired) * 100);

              return (
                <div key={req.id} className="p-4 bg-surface-700/50 rounded-xl border border-surface-600/50 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-brand-400 text-sm">{req.referenceNumber}</span>
                        <span className="text-xs text-muted">•</span>
                        <span className="font-display font-bold text-white">{req.requiredBloodGroup}</span>
                        {req.urgency === 'critical' && (
                          <span className="text-[10px] font-bold bg-danger/20 text-danger px-1.5 py-0.5 rounded-full">CRITICAL</span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">Patient: <strong className="text-slate-200">{req.patientName}</strong> @ {req.hospitalName}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted">Units needed</p>
                      <p className="font-display font-bold text-lg text-white">
                        {stillNeeded}
                        <span className="text-xs text-muted font-normal"> / {req.unitsRequired}</span>
                      </p>
                    </div>
                  </div>

                  {/* Fulfillment progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted">
                      <span>{fulfilled} unit(s) fulfilled</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-surface-600 rounded-full h-2">
                      <div
                        className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {/* Partial donations breakdown */}
                    {(req.partialDonations || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {req.partialDonations!.map((pd, i) => (
                          <span key={i} className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full">
                            {pd.campName}: {pd.units}u
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">
                      {campStock > 0
                        ? <span>Your stock: <strong className="text-slate-200">{campStock} unit(s) of {req.requiredBloodGroup}</strong></span>
                        : <span className="text-warning">You have no {req.requiredBloodGroup} in stock</span>
                      }
                    </p>

                    {alreadyDonatedByUs ? (
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 size={13} /> Already donated
                      </span>
                    ) : stillNeeded <= 0 ? (
                      <span className="text-xs text-muted">Fully fulfilled</span>
                    ) : campStock <= 0 ? (
                      <span className="text-xs text-warning">No stock available</span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Droplets size={14} />}
                        onClick={() => handleOpenDonate(req)}
                      >
                        Donate Units ({canDonate} available)
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Live Inventory */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">
              Live Inventory — {currentCamp?.name || '...'}
            </h2>
            <p className="text-xs text-muted">
              Stock levels for <strong className="text-slate-200">{currentCamp?.name}</strong>.
              Decrements automatically when you donate to a request.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedCampId}
            icon={<PlusCircle size={16} />}
            onClick={() => {
              setStockBloodGroup('O+');
              setStockUnits(inventory['O+']?.units || 0);
              setStockModalOpen(true);
            }}
          >
            Inward Stock / Adjust Units
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {BLOOD_GROUPS.map((bg) => (
            <InventoryGauge key={bg} bloodGroup={bg} units={inventory[bg]?.units || 0} />
          ))}
        </div>
      </Card>

      {/* Donate to Request Modal */}
      <Modal
        isOpen={Boolean(donateReq)}
        onClose={() => setDonateReq(null)}
        title={`Donate Units — ${donateReq?.referenceNumber}`}
      >
        {donateReq && (
          <div className="space-y-4">
            <div className="bg-surface-700/50 p-4 rounded-lg space-y-2 text-xs text-slate-300 border border-surface-600/50">
              <div className="flex justify-between">
                <span className="text-muted">Patient:</span>
                <strong className="text-white">{donateReq.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Blood Group:</span>
                <strong className="text-brand-400 font-display text-base">{donateReq.requiredBloodGroup}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Still Needed:</span>
                <strong className="text-warning">
                  {donateReq.unitsRequired - (donateReq.unitsFulfilled || 0)} unit(s)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Your Camp's Stock:</span>
                <strong className={inventory[donateReq.requiredBloodGroup]?.units > 0 ? 'text-success' : 'text-danger'}>
                  {inventory[donateReq.requiredBloodGroup]?.units || 0} unit(s)
                </strong>
              </div>
            </div>

            <Input
              label={`Units to Donate (max ${Math.min(
                donateReq.unitsRequired - (donateReq.unitsFulfilled || 0),
                inventory[donateReq.requiredBloodGroup]?.units || 0,
              )})`}
              type="number"
              min={1}
              max={Math.min(
                donateReq.unitsRequired - (donateReq.unitsFulfilled || 0),
                inventory[donateReq.requiredBloodGroup]?.units || 0,
              )}
              value={donateUnits}
              onChange={(e) => setDonateUnits(Number(e.target.value))}
              hint={`Your ${donateReq.requiredBloodGroup} stock will be decremented by ${donateUnits} unit(s)`}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
              <Button variant="ghost" onClick={() => setDonateReq(null)}>Cancel</Button>
              <Button variant="primary" loading={donating} onClick={handleConfirmDonate}>
                Confirm Donation
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Stock Inward Modal */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title={`Inward Stock / Adjust Units — ${currentCamp?.name}`}
      >
        <form onSubmit={handleSaveStock} className="space-y-4">
          <Select
            label="Blood Group"
            options={bloodGroupSelectOptions}
            value={stockBloodGroup}
            onChange={(e) => {
              setStockBloodGroup(e.target.value);
              setStockUnits(inventory[e.target.value]?.units || 0);
            }}
            required
          />
          <Input
            label="Total Units in Stock"
            type="number"
            min={0}
            max={500}
            value={stockUnits}
            onChange={(e) => setStockUnits(Number(e.target.value))}
            hint={`Current: ${inventory[stockBloodGroup]?.units || 0} units of ${stockBloodGroup}`}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" type="button" onClick={() => setStockModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={savingStock}>Update Stock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
