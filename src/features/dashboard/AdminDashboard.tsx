import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, CheckCircle2, Droplets, ScrollText, ArrowRight } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/core/constants/routes';
import { subscribeAllInventory } from '@/services/master.service';

export function AdminDashboard() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [completedDonations, setCompletedDonations] = useState(0);
  const [totalSystemStock, setTotalSystemStock] = useState(0);
  const [recentAudit, setRecentAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Users count
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) setTotalUsers(Object.keys(snap.val()).length);
      else setTotalUsers(0);
    });

    // Requests count & status
    const reqsRef = ref(db, 'requests');
    const unsubReqs = onValue(reqsRef, (snap) => {
      if (snap.exists()) {
        const list = Object.values(snap.val()) as any[];
        setTotalRequests(list.length);
        setCompletedDonations(list.filter((r) => r.status === 'donated' || r.status === 'closed').length);
      } else {
        setTotalRequests(0);
        setCompletedDonations(0);
      }
      setLoading(false);
    });

    // All Inventory stock sum
    const unsubInv = subscribeAllInventory((allInv) => {
      let sum = 0;
      Object.values(allInv).forEach((campInv) => {
        Object.values(campInv).forEach((item) => {
          sum += item.units || 0;
        });
      });
      setTotalSystemStock(sum);
    });

    // Recent Audit Trail
    const auditRef = ref(db, 'audit');
    const unsubAudit = onValue(auditRef, (snap) => {
      if (snap.exists()) {
        const list = Object.values(snap.val()) as any[];
        setRecentAudit(list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
      } else {
        setRecentAudit([]);
      }
    });

    return () => {
      unsubUsers();
      unsubReqs();
      unsubInv();
      unsubAudit();
    };
  }, []);

  return (
    <div className="space-y-6 page-enter">
      {/* Banner */}
      <div className="bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <h1 className="font-display font-bold text-2xl text-white">
          System Administration Dashboard ⚙️
        </h1>
        <p className="text-muted text-sm mt-1">
          System-wide KPIs, Master Data, Governance & Audit Trail
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <KPICard
          title="Total Registered Users"
          value={loading ? '—' : totalUsers}
          subtitle="Donors, Managers, Admins"
          icon={<Users size={20} />}
          variant="primary"
        />

        <KPICard
          title="Total Requests"
          value={loading ? '—' : totalRequests}
          subtitle="All lifecycle transactions"
          icon={<ClipboardList size={20} />}
          variant="default"
        />

        <KPICard
          title="Completed Donations"
          value={loading ? '—' : completedDonations}
          subtitle="Successful donations"
          icon={<CheckCircle2 size={20} />}
          variant="success"
        />

        <KPICard
          title="Total System Stock"
          value={loading ? '—' : totalSystemStock}
          subtitle="Units across all camps"
          icon={<Droplets size={20} />}
          variant="warning"
        />
      </div>

      {/* Quick Navigation Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card padding="md" variant="interactive">
          <Link to={ROUTES.MASTER_BLOOD_GROUPS} className="block">
            <h3 className="font-display font-semibold text-base text-white">🩸 Master Blood Groups</h3>
            <p className="text-xs text-muted mt-1">Manage valid blood groups and compatibility</p>
          </Link>
        </Card>

        <Card padding="md" variant="interactive">
          <Link to={ROUTES.MASTER_CAMPS} className="block">
            <h3 className="font-display font-semibold text-base text-white">🏢 Master Camps</h3>
            <p className="text-xs text-muted mt-1">Manage donation camps & coordinator assignments</p>
          </Link>
        </Card>

        <Card padding="md" variant="interactive">
          <Link to={ROUTES.MASTER_HOSPITALS} className="block">
            <h3 className="font-display font-semibold text-base text-white">🏥 Master Hospitals</h3>
            <p className="text-xs text-muted mt-1">Manage medical center destinations</p>
          </Link>
        </Card>
      </div>

      {/* Audit Trail Section */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ScrollText size={18} className="text-brand-400" />
            <h2 className="font-display font-semibold text-lg text-white">System Audit Log</h2>
          </div>
          <Link to={ROUTES.ADMIN_AUDIT} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
            Full Audit Trail <ArrowRight size={14} />
          </Link>
        </div>

        {recentAudit.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">No audit events recorded yet.</p>
        ) : (
          <div className="divide-y divide-surface-700">
            {recentAudit.map((entry, idx) => (
              <div key={entry.id || idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{entry.actorName || 'System'}</span>
                  <span className="text-muted"> performed </span>
                  <span className="font-mono text-brand-400">{entry.action}</span>
                  <span className="text-muted"> ({entry.type})</span>
                </div>
                <span className="text-muted">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
