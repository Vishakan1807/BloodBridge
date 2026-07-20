import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { HeartHandshake, Calendar, Building2, Hospital, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { getProfile } from '@/services/user.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { UserProfile } from '@/types/auth.types';

interface DonorHistoryEntry {
  requestId:          string;
  referenceNumber:    string;
  requiredBloodGroup: string;
  campId:             string;
  campName:           string;
  hospitalName:       string;
  status:             string;
  donatedAt:          number;
}

export function DonorHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { userProfile: currentUser } = useAuth();
  const navigate = useNavigate();

  const [donorProfile, setDonorProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<DonorHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const targetUid = id || currentUser?.uid;

  useEffect(() => {
    if (!targetUid) return;

    // Load Donor Profile
    getProfile(targetUid).then(setDonorProfile);

    // Load Donor History Index (/donorHistory/{uid})
    const historyRef = ref(db, `donorHistory/${targetUid}`);
    const unsubscribe = onValue(historyRef, (snapshot) => {
      if (!snapshot.exists()) {
        setHistory([]);
        setLoading(false);
        return;
      }
      const data = Object.values(snapshot.val()) as DonorHistoryEntry[];
      // Sort by donation date descending
      setHistory(data.sort((a, b) => b.donatedAt - a.donatedAt));
      setLoading(false);
    });

    return unsubscribe;
  }, [targetUid]);

  const latestDonation = history.length > 0 ? history[0].donatedAt : null;
  const daysSinceLast = latestDonation
    ? Math.floor((Date.now() - latestDonation) / (1000 * 60 * 60 * 24))
    : null;

  const isEligible = daysSinceLast === null || daysSinceLast >= 56;
  const daysRemaining = daysSinceLast !== null && daysSinceLast < 56 ? 56 - daysSinceLast : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto page-enter">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <span className="text-xs text-muted">Trainer Extension Module — CAP-23</span>
      </div>

      {/* Donor Profile Summary Card */}
      <Card padding="lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center font-display font-bold text-brand-400 text-xl">
              {donorProfile?.bloodGroup || '🩸'}
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white">
                {donorProfile?.displayName || 'Donor Profile'}
              </h1>
              <p className="text-xs text-muted mt-0.5">
                {donorProfile?.city || 'Location'} · {donorProfile?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-surface-700 pt-3 md:pt-0 md:pl-6">
            <div>
              <p className="text-xs text-muted">Total Donations</p>
              <p className="font-display font-bold text-2xl text-white">{history.length}</p>
            </div>

            <div>
              <p className="text-xs text-muted">Eligibility</p>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isEligible ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                }`}
              >
                {isEligible ? 'Eligible Now ✅' : `${daysRemaining} Days Left`}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Chronological Donation History Timeline */}
      <Card padding="lg">
        <h2 className="font-display font-semibold text-lg text-white mb-6 flex items-center gap-2">
          <HeartHandshake className="text-brand-400" /> Complete Donation History Timeline
        </h2>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={36} className="text-muted mx-auto mb-3" />
            <p className="text-slate-300 font-medium text-sm">No past donation records found</p>
            <p className="text-xs text-muted mt-1">When donations are completed, they will appear here automatically.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-700">
            {history.map((entry) => (
              <div key={entry.requestId} className="relative group">
                <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-brand-500 border-2 border-surface-800" />

                <div className="bg-surface-700/50 p-4 rounded-xl border border-surface-600/40 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-brand-400">
                      {entry.referenceNumber}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(entry.donatedAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-muted shrink-0" />
                      <span>Camp: <strong className="text-white">{entry.campName}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Hospital size={14} className="text-muted shrink-0" />
                      <span>Hospital: <strong className="text-white">{entry.hospitalName}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
