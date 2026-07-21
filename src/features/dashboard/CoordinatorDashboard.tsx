import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Target, Droplet, ArrowRight, AlertTriangle, PlusCircle, Building2 } from 'lucide-react';
import { ref, onValue, update, push, set } from 'firebase/database';
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
import type { CampInventory, Camp } from '@/types/master.types';
import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';

const BLOOD_GROUPS = CLINICAL_BLOOD_GROUPS.map((g) => g.value);

export function CoordinatorDashboard() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager';

  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string>('');
  const [inventory, setInventory] = useState<CampInventory>({});
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [pendingMatches, setPendingMatches] = useState(0);

  // Stock Inward / Adjust Modal State
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockBloodGroup, setStockBloodGroup] = useState('O+');
  const [stockUnits, setStockUnits] = useState(5);
  const [savingStock, setSavingStock] = useState(false);

  // Load camps & auto-provision manager's own dedicated blood bank if needed
  useEffect(() => {
    return subscribeCamps(async (loadedCamps) => {
      setCamps(loadedCamps);

      if (isManager && userProfile) {
        const cleanName = userProfile.displayName.toLowerCase().replace(/manager|coordinator|admin/g, '').trim();
        
        let assignedCamp = loadedCamps.find((c) => {
          if (c.id === userProfile.campId) return true;
          if (c.coordinatorUid === userProfile.uid) return true;
          if (cleanName && c.name.toLowerCase().includes(cleanName)) return true;
          if (cleanName && cleanName.includes(c.name.toLowerCase())) return true;
          return false;
        });

        // Auto-provision dedicated Camp for Manager if none exists!
        if (!assignedCamp) {
          try {
            const campRef = push(ref(db, 'master/camps'));
            const newCampId = campRef.key || `camp-${Date.now()}`;
            const campName = userProfile.displayName.includes('Camp') || userProfile.displayName.includes('Bank')
              ? userProfile.displayName
              : `${userProfile.displayName} Blood Bank`;

            const newCamp = {
              id:             newCampId,
              name:           campName,
              address:        userProfile.city ? `${userProfile.city} Central Center` : 'Central Blood Bank',
              city:           userProfile.city || 'Chennai',
              phone:          userProfile.phone || '+91-9876543210',
              coordinatorUid: userProfile.uid,
              isActive:       true,
              createdBy:      userProfile.uid,
              createdAt:      Date.now(),
              updatedAt:      Date.now(),
            };

            await set(campRef, newCamp);
            await update(ref(db, `users/${userProfile.uid}`), { campId: newCampId });

            setSelectedCampId(newCampId);
            return;
          } catch (e) {
            console.error('Failed to auto-provision manager camp:', e);
          }
        } else {
          setSelectedCampId(assignedCamp.id);

          // Permanently sync campId and coordinatorUid if unlinked
          if (userProfile.campId !== assignedCamp.id || assignedCamp.coordinatorUid !== userProfile.uid) {
            update(ref(db, `users/${userProfile.uid}`), { campId: assignedCamp.id }).catch(() => {});
            update(ref(db, `master/camps/${assignedCamp.id}`), { coordinatorUid: userProfile.uid }).catch(() => {});
          }
        }
      } else if (isAdmin && !selectedCampId && loadedCamps.length > 0) {
        setSelectedCampId(loadedCamps[0].id);
      }
    });
  }, [userProfile, isManager, isAdmin]);

  // Load inventory for selected camp
  useEffect(() => {
    if (!selectedCampId) {
      setInventory({});
      return;
    }
    return subscribeCampInventory(selectedCampId, (inv) => {
      setInventory(inv);
    });
  }, [selectedCampId]);

  // Load request queues for selected camp
  useEffect(() => {
    const requestsRef = ref(db, 'requests');
    return onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPendingVerifications(0);
        setPendingMatches(0);
        return;
      }
      const data = Object.values(snapshot.val()) as any[];

      const reg = data.filter((r) => r.status === 'registered');
      const ver = data.filter(
        (r) => r.status === 'verified' && (!r.campId || r.campId === selectedCampId),
      );

      setPendingVerifications(reg.length);
      setPendingMatches(ver.length);
    });
  }, [selectedCampId]);

  // Stock calculations
  const totalUnits = Object.values(inventory).reduce((sum, item) => sum + (item.units || 0), 0);
  const lowStockCount = BLOOD_GROUPS.filter((bg) => (inventory[bg]?.units || 0) <= 3).length;

  const currentAssignedCamp = camps.find((c) => c.id === selectedCampId);

  // Stock Inward / Adjustment Handler
  async function handleSaveStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampId) {
      showError('No camp assigned to this account.');
      return;
    }
    if (stockUnits < 0) {
      showError('Units cannot be negative.');
      return;
    }

    setSavingStock(true);
    try {
      await updateInventoryStock(
        selectedCampId,
        stockBloodGroup,
        Number(stockUnits),
        userProfile?.uid ?? 'system',
      );
      showSuccess(`Updated ${stockBloodGroup} stock to ${stockUnits} units for ${currentAssignedCamp?.name || 'Camp'}.`);
      setStockModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to update stock.');
    } finally {
      setSavingStock(false);
    }
  }

  const bloodGroupSelectOptions: SelectOption[] = CLINICAL_BLOOD_GROUPS.map((bg) => ({
    value: bg.value,
    label: `${bg.label}${bg.category !== 'standard' ? ' 🌟' : ''}`,
  }));

  return (
    <div className="space-y-6 page-enter">
      {/* Header & Camp Scoping */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Camp Coordinator Dashboard 🏢
          </h1>
          <p className="text-muted text-sm mt-1">
            Real-time blood stock monitoring and workflow execution
          </p>
        </div>

        {/* Access Control Scoping */}
        {isAdmin ? (
          camps.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">Select Camp View (Admin):</span>
              <select
                value={selectedCampId}
                onChange={(e) => setSelectedCampId(e.target.value)}
                className="bg-surface-700 border border-surface-600 text-slate-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {camps.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name} ({camp.city})
                  </option>
                ))}
              </select>
            </div>
          )
        ) : (
          /* Manager Role: Strictly scoped to assigned camp */
          <div className="flex items-center gap-2 bg-surface-700/60 border border-surface-600 px-4 py-2 rounded-xl text-xs">
            <span className="text-muted">Assigned Blood Bank:</span>
            <span className="font-bold text-brand-400 text-sm font-display">
              {currentAssignedCamp ? `${currentAssignedCamp.name} (${currentAssignedCamp.city})` : `${userProfile?.displayName || 'Blood Bank'} (Initializing...)`}
            </span>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <KPICard
          title="Pending Verification"
          value={pendingVerifications}
          subtitle="Requests in Registered state"
          icon={<ShieldCheck size={20} />}
          variant="warning"
        />

        <KPICard
          title="Pending Matching"
          value={pendingMatches}
          subtitle="Requests ready for match"
          icon={<Target size={20} />}
          variant="primary"
        />

        <KPICard
          title="Camp Stock Units"
          value={totalUnits}
          subtitle="Total available units"
          icon={<Droplet size={20} />}
          variant="success"
        />

        <KPICard
          title="Low Stock Alerts"
          value={lowStockCount}
          subtitle="Blood groups <= 3 units"
          icon={<AlertTriangle size={20} />}
          variant={lowStockCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Quick Action Banner */}
      <div className="flex gap-4">
        <Link to={ROUTES.WORKFLOW_VERIFY} className="flex-1">
          <Button variant="secondary" fullWidth icon={<ShieldCheck size={18} />}>
            Open Verification Queue ({pendingVerifications})
          </Button>
        </Link>
        <Link to={ROUTES.WORKFLOW_MATCH} className="flex-1">
          <Button variant="primary" fullWidth icon={<Target size={18} />}>
            Open Matching Console ({pendingMatches})
          </Button>
        </Link>
      </div>

      {/* Live Inventory Gauges Grid */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">
              Live Inventory — {currentAssignedCamp?.name || userProfile?.displayName || 'Blood Bank'}
            </h2>
            <p className="text-xs text-muted">
              Stock availability for <strong className="text-slate-200">{currentAssignedCamp?.name || userProfile?.displayName || 'Blood Bank'}</strong> ({currentAssignedCamp?.city || userProfile?.city || 'Location'}).
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            disabled={!selectedCampId}
            icon={<PlusCircle size={16} />}
            onClick={() => setStockModalOpen(true)}
          >
            Inward Stock / Adjust Units
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {BLOOD_GROUPS.map((bg) => (
            <InventoryGauge
              key={bg}
              bloodGroup={bg}
              units={inventory[bg]?.units || 0}
            />
          ))}
        </div>
      </Card>

      {/* Stock Inward / Adjustment Modal */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title={`Inward Stock & Inventory Adjustment — ${currentAssignedCamp?.name || 'Blood Bank'}`}
      >
        <form onSubmit={handleSaveStock} className="space-y-4">
          <p className="text-xs text-muted">
            Record newly collected blood units from donation drives or adjust live stock for {currentAssignedCamp?.name || 'your Blood Bank'}.
          </p>

          <Select
            label="Select Blood Group"
            options={bloodGroupSelectOptions}
            value={stockBloodGroup}
            onChange={(e) => {
              setStockBloodGroup(e.target.value);
              setStockUnits(inventory[e.target.value]?.units || 0);
            }}
            required
          />

          <Input
            label="Total Available Units in Stock"
            type="number"
            min={0}
            max={500}
            value={stockUnits}
            onChange={(e) => setStockUnits(Number(e.target.value))}
            hint={`Current stock for ${stockBloodGroup}: ${inventory[stockBloodGroup]?.units || 0} units`}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" type="button" onClick={() => setStockModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={savingStock}>
              Update Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
