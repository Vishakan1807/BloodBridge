import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, PlusCircle, CheckCircle2, FileText, MapPin, ArrowRight } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/context/AuthContext';
import { KPICard } from '@/components/ui/KPICard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/core/constants/routes';
import { STATE_CONFIG } from '@/core/constants/workflowStates';

interface DonorRequestSummary {
  id:                 string;
  referenceNumber:    string;
  requiredBloodGroup: string;
  unitsRequired:       number;
  unitsFulfilled?:     number;
  status:             string;
  hospitalName?:      string;
  createdAt:          number;
}

export function DonorDashboard() {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState<DonorRequestSummary[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;

    // Listen to user's requests
    const requestsRef = ref(db, 'requests');
    const unsubscribeRequests = onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setRequests([]);
        setLoading(false);
        return;
      }
      const data = snapshot.val();
      const userReqs = (Object.values(data) as any[])
        .filter((req) => req.createdBy === userProfile.uid)
        .sort((a, b) => b.createdAt - a.createdAt);

      setRequests(userReqs);
      setLoading(false);
    });

    return () => {
      unsubscribeRequests();
    };
  }, [userProfile?.uid]);

  const activeCount    = requests.filter((r) => r.status !== 'closed' && r.status !== 'donated').length;
  const fulfilledCount = requests.filter((r) => r.status === 'closed' || r.status === 'donated').length;

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Hello, {userProfile?.displayName ?? 'Requester'}! 🩸
          </h1>
          <p className="text-muted text-sm mt-1">
            Blood Group: <span className="font-semibold text-brand-400">{userProfile?.bloodGroup ?? 'Not Set'}</span> · Account Status: <span className="text-success font-semibold">Active Member 🩸</span>
          </p>
        </div>

        <Link to={ROUTES.REQUEST_NEW}>
          <Button variant="primary" icon={<PlusCircle size={18} />}>
            Raise Donation Request
          </Button>
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        <KPICard
          title="Active Requests"
          value={loading ? '—' : activeCount}
          subtitle="Requests currently in progress"
          icon={<Clock size={20} />}
          variant="warning"
        />

        <KPICard
          title="Fulfilled Cases"
          value={loading ? '—' : fulfilledCount}
          subtitle="Blood allocated & closed"
          icon={<CheckCircle2 size={20} />}
          variant="success"
        />

        <KPICard
          title="Total Requests"
          value={loading ? '—' : requests.length}
          subtitle="Lifetime requests raised"
          icon={<FileText size={20} />}
          variant="primary"
        />

        <KPICard
          title="Broadcast City"
          value={userProfile?.city || 'Not Set'}
          subtitle="Connected blood bank network"
          icon={<MapPin size={20} />}
          variant="default"
        />
      </div>

      {/* Recent Requests Section */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-white">My Recent Requests</h2>
          <Link to={ROUTES.REQUESTS} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium transition-colors">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted text-sm mb-4">You have not raised any donation requests yet.</p>
            <Link to={ROUTES.REQUEST_NEW}>
              <Button variant="secondary" size="sm" icon={<PlusCircle size={16} />}>
                Create Your First Request
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-surface-700/60">
            {requests.slice(0, 5).map((req) => {
              const stateCfg = STATE_CONFIG[req.status as keyof typeof STATE_CONFIG] || STATE_CONFIG.registered;
              return (
                <div key={req.id} className="py-3.5 flex items-center justify-between text-sm hover:bg-surface-700/20 px-2 rounded-lg transition-colors">
                  <div>
                    <Link to={`/requests/${req.id}`} className="font-mono font-medium text-brand-400 hover:underline">
                      {req.referenceNumber}
                    </Link>
                    <p className="text-xs text-muted mt-0.5">
                      Needs <strong className="text-slate-200">{req.unitsRequired} unit(s)</strong> of <strong className="text-white font-display">{req.requiredBloodGroup}</strong>
                      {req.hospitalName ? ` · ${req.hospitalName}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stateCfg.bgColor} ${stateCfg.color}`}>
                      {stateCfg.label}
                    </span>
                    <Link to={`/requests/${req.id}`} className="text-muted hover:text-white transition-colors">
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
