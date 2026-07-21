import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Calendar, Clock, PlusCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/context/AuthContext';
import { KPICard } from '@/components/ui/KPICard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/core/constants/routes';

interface DonorRequestSummary {
  id:                 string;
  referenceNumber:    string;
  requiredBloodGroup: string;
  unitsRequired:       number;
  status:             string;
  createdAt:          number;
}

export function DonorDashboard() {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState<DonorRequestSummary[]>([]);
  const [lastDonationDate, setLastDonationDate] = useState<number | null>(null);
  const [totalDonations, setTotalDonations] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

    // Listen to donor history index
    const historyRef = ref(db, `donorHistory/${userProfile.uid}`);
    const unsubscribeHistory = onValue(historyRef, (snapshot) => {
      if (!snapshot.exists()) {
        setTotalDonations(0);
        setLastDonationDate(null);
        return;
      }
      const historyItems = Object.values(snapshot.val()) as any[];
      setTotalDonations(historyItems.length);

      const latest = historyItems.reduce((max, item) => {
        return item.donatedAt && item.donatedAt > max ? item.donatedAt : max;
      }, 0);

      setLastDonationDate(latest > 0 ? latest : null);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeHistory();
    };
  }, [userProfile?.uid]);

  // Eligibility calculation (56 days)
  const daysSinceLast = lastDonationDate
    ? Math.floor((Date.now() - lastDonationDate) / (1000 * 60 * 60 * 24))
    : null;

  const isEligible = daysSinceLast === null || daysSinceLast >= 56;
  const daysRemaining = daysSinceLast !== null && daysSinceLast < 56 ? 56 - daysSinceLast : 0;

  const activeCount = requests.filter((r) => r.status !== 'closed' && r.status !== 'donated').length;

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Hello, {userProfile?.displayName ?? 'Donor'}! 🩸
          </h1>
          <p className="text-muted text-sm mt-1">
            Blood Group: <span className="font-semibold text-brand-400">{userProfile?.bloodGroup ?? 'Not Set'}</span> · Account Status: <span className="text-success font-semibold">Active Donor 🩸</span>
          </p>
        </div>

        <Link to={ROUTES.REQUEST_NEW}>
          <Button variant="primary" icon={<PlusCircle size={18} />}>
            Raise Donation Request
          </Button>
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KPICard
          title="Active Requests"
          value={loading ? '—' : activeCount}
          subtitle="Requests in progress"
          icon={<Clock size={20} />}
          variant="primary"
        />

        <KPICard
          title="Total Donations"
          value={loading ? '—' : totalDonations}
          subtitle="Completed donations"
          icon={<HeartHandshake size={20} />}
          variant="success"
        />

        <KPICard
          title="Donation Eligibility"
          value={isEligible ? 'Eligible Now' : `${daysRemaining} Days`}
          subtitle={isEligible ? '56+ days since last donation' : 'Until next eligible donation'}
          icon={<Calendar size={20} />}
          variant={isEligible ? 'success' : 'warning'}
        />
      </div>

      {/* Recent Requests Section */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-white">My Recent Requests</h2>
          <Link to={ROUTES.REQUESTS} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
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
          <div className="divide-y divide-surface-700">
            {requests.slice(0, 5).map((req) => (
              <div key={req.id} className="py-3.5 flex items-center justify-between text-sm">
                <div>
                  <Link to={`/requests/${req.id}`} className="font-mono font-medium text-brand-400 hover:underline">
                    {req.referenceNumber}
                  </Link>
                  <p className="text-xs text-muted mt-0.5">
                    Needs {req.unitsRequired} unit(s) of <span className="font-semibold text-slate-300">{req.requiredBloodGroup}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase bg-surface-700 text-slate-300">
                    {req.status}
                  </span>
                  <Link to={`/requests/${req.id}`} className="text-muted hover:text-white">
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
