import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Target, Droplet, ArrowRight, AlertTriangle } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/context/AuthContext';
import { KPICard } from '@/components/ui/KPICard';
import { InventoryGauge } from '@/components/ui/InventoryGauge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/core/constants/routes';
import { subscribeCampInventory, subscribeCamps } from '@/services/master.service';
import type { CampInventory, Camp } from '@/types/master.types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export function CoordinatorDashboard() {
  const { userProfile } = useAuth();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string>(userProfile?.campId ?? '');
  const [inventory, setInventory] = useState<CampInventory>({});
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [pendingMatches, setPendingMatches] = useState(0);

  // Load camps
  useEffect(() => {
    return subscribeCamps((loadedCamps) => {
      setCamps(loadedCamps);
      if (!selectedCampId && loadedCamps.length > 0) {
        setSelectedCampId(loadedCamps[0].id);
      }
    });
  }, []);

  // Load inventory for selected camp
  useEffect(() => {
    if (!selectedCampId) return;
    return subscribeCampInventory(selectedCampId, (inv) => {
      setInventory(inv);
    });
  }, [selectedCampId]);

  // Load request queues
  useEffect(() => {
    const requestsRef = ref(db, 'requests');
    return onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setPendingVerifications(0);
        setPendingMatches(0);
        return;
      }
      const data = Object.values(snapshot.val()) as any[];
      setPendingVerifications(data.filter((r) => r.status === 'registered').length);
      setPendingMatches(data.filter((r) => r.status === 'verified').length);
    });
  }, []);

  const totalUnits = Object.values(inventory).reduce((sum, item) => sum + (item.units || 0), 0);
  const lowStockCount = BLOOD_GROUPS.filter((bg) => (inventory[bg]?.units || 0) <= 3).length;

  return (
    <div className="space-y-6 page-enter">
      {/* Header & Camp Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Camp Coordinator Dashboard 🏢
          </h1>
          <p className="text-muted text-sm mt-1">
            Real-time blood stock monitoring and workflow execution
          </p>
        </div>

        {camps.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Select Camp:</span>
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">Live Camp Inventory</h2>
            <p className="text-xs text-muted">Stock availability per blood group</p>
          </div>
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
    </div>
  );
}
