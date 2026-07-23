import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, PlusCircle, CheckCircle2, FileText, MapPin, ArrowRight,
  Droplets, ToggleLeft, ToggleRight, AlertTriangle, HeartHandshake, Building2
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { KPICard } from '@/components/ui/KPICard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ROUTES } from '@/core/constants/routes';
import { STATE_CONFIG } from '@/core/constants/workflowStates';
import { setDonorAvailability } from '@/services/user.service';
import { individualDonate } from '@/services/workflow.service';
import { isBloodCompatible, sortByUrgencyAndDate } from '@/core/utils/bloodUtils';
import { subscribeHospitals, subscribeCamps } from '@/services/master.service';
import type { Hospital, Camp } from '@/types/master.types';
import type { DonationRequest } from '@/types/request.types';

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

const FIFTY_SIX_DAYS_MS = 56 * 24 * 60 * 60 * 1000;

export function DonorDashboard() {
  const { userProfile, refreshProfile } = useAuth();
  const { showSuccess, showError }      = useToast();

  const [requests, setRequests]           = useState<DonorRequestSummary[]>([]);
  const [broadcastReqs, setBroadcastReqs] = useState<DonationRequest[]>([]);
  const [hospitals, setHospitals]         = useState<Hospital[]>([]);
  const [camps, setCamps]                 = useState<Camp[]>([]);
  const [loading, setLoading]             = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);

  // Donate modal state
  const [donateTarget, setDonateTarget] = useState<DonationRequest | null>(null);
  const [donating, setDonating]         = useState(false);

  // Load hospitals & camps from DB
  useEffect(() => {
    const unsubHospitals = subscribeHospitals((loaded) => setHospitals(loaded));
    const unsubCamps = subscribeCamps((loaded) => setCamps(loaded));
    return () => {
      unsubHospitals();
      unsubCamps();
    };
  }, []);

  // ── 56-day eligibility calculation ─────────────────────────
  const lastDonationDate = userProfile?.lastDonationDate ?? null;
  const daysSinceLast    = lastDonationDate
    ? Math.floor((Date.now() - lastDonationDate) / (1000 * 60 * 60 * 24))
    : null;
  const withinLock     = daysSinceLast !== null && daysSinceLast < 56;
  const daysRemaining  = withinLock ? 56 - (daysSinceLast ?? 0) : 0;
  const isAvailable    = userProfile?.isAvailableToDonate === true;

  // ── Load user's own requests ─────────────────────────────────
  useEffect(() => {
    if (!userProfile?.uid) return;

    const requestsRef = ref(db, 'requests');
    const unsub = onValue(requestsRef, (snapshot) => {
      if (!snapshot.exists()) { setRequests([]); setLoading(false); return; }

      const data       = snapshot.val();
      const allReqs    = Object.values(data) as any[];
      const userReqs   = allReqs
        .filter((req) => req.createdBy === userProfile.uid)
        .sort((a, b) => b.createdAt - a.createdAt);

      setRequests(userReqs);
      setLoading(false);

      // Broadcast requests in the donor's district (STRICT MATCH ONLY)
      const donorDistrict = (userProfile.city || '').toLowerCase().trim();
      const visible  = allReqs.filter((r) => {
        if (r.status !== 'verified') return false;
        if (r.campId !== 'broadcast') return false;
        if (!donorDistrict) return false;

        // Resolve request's district (from donorCity or hospital's district)
        const hosp = hospitals.find((h) => h.id === r.hospitalId);
        const reqDistrict = (r.donorCity || hosp?.city || '').toLowerCase().trim();

        // STRICT MATCH ONLY!
        return reqDistrict === donorDistrict;
      }) as DonationRequest[];
      setBroadcastReqs(sortByUrgencyAndDate(visible));
    });

    return () => unsub();
  }, [userProfile?.uid, userProfile?.city, hospitals]);

  // ── Toggle availability ──────────────────────────────────────
  const handleToggle = useCallback(async () => {
    if (!userProfile) return;
    if (withinLock && !isAvailable) {
      showError(`You are within the 56-day recovery period. You can enable donations again in ${daysRemaining} day(s).`);
      return;
    }
    setTogglingAvail(true);
    try {
      const next = !isAvailable;
      await setDonorAvailability(userProfile.uid, next);
      await refreshProfile();
      showSuccess(next
        ? '✅ You are now visible in the broadcast network. Donation requests in your district will appear below.'
        : '⏸️ Availability turned off. You will no longer receive broadcast requests.',
      );
    } catch (err: any) {
      showError(err?.message || 'Failed to update availability.');
    } finally {
      setTogglingAvail(false);
    }
  }, [userProfile, isAvailable, withinLock, daysRemaining, refreshProfile, showSuccess, showError]);

  // ── Confirm individual donation ──────────────────────────────
  const handleConfirmDonate = useCallback(async () => {
    if (!donateTarget || !userProfile) return;
    setDonating(true);
    try {
      const result = await individualDonate(donateTarget.id, userProfile);
      await refreshProfile(); // Refresh to get updated lastDonationDate
      if (result.fulfilled) {
        showSuccess(`Thanks for saving a life! 🎉 Request ${donateTarget.referenceNumber} fully fulfilled! Your 1 unit completed the requirement.`);
      } else {
        showSuccess(`Thanks for saving a life! ✅ 1 unit donated to ${donateTarget.referenceNumber}. ${result.unitsFulfilled}/${donateTarget.unitsRequired} units secured.`);
      }
      setDonateTarget(null);
    } catch (err: any) {
      showError(err?.message || 'Donation failed. Please try again.');
    } finally {
      setDonating(false);
    }
  }, [donateTarget, userProfile, refreshProfile, showSuccess, showError]);

  const activeCount    = requests.filter((r) => r.status !== 'closed' && r.status !== 'donated').length;
  const fulfilledCount = requests.filter((r) => r.status === 'closed' || r.status === 'donated').length;

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Hello, {userProfile?.displayName ?? 'Member'}! 🩸
          </h1>
          <p className="text-muted text-sm mt-1">
            Blood Group: <span className="font-semibold text-brand-400">{userProfile?.bloodGroup ?? 'Not Set'}</span>
            {' · '}District: <span className="font-semibold text-slate-200">{userProfile?.city || 'Not Set'}</span>
          </p>
        </div>
        <Link to={ROUTES.REQUEST_NEW}>
          <Button variant="primary" icon={<PlusCircle size={18} />}>
            Raise Donation Request
          </Button>
        </Link>
      </div>

      {/* ── Donor Availability Toggle Card ─────────────────── */}
      <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
        isAvailable
          ? 'bg-success/10 border-success/40'
          : 'bg-surface-800 border-surface-600/40'
      }`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <HeartHandshake size={20} className={isAvailable ? 'text-success' : 'text-muted'} />
            <h2 className="font-display font-semibold text-white text-base">
              Donor Availability
            </h2>
            {isAvailable && (
              <span className="text-[10px] font-bold bg-success/20 text-success px-2 py-0.5 rounded-full animate-pulse">
                ACTIVE IN NETWORK
              </span>
            )}
          </div>

          {withinLock ? (
            <div className="flex items-start gap-2 mt-1">
              <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">
                You donated recently. <strong>Mandatory 56-day recovery period.</strong>{' '}
                Eligible to donate again in <strong className="text-white">{daysRemaining} day(s)</strong>.
              </p>
            </div>
          ) : isAvailable ? (
            <p className="text-xs text-success/80">
              You are visible in the broadcast network for <strong>{userProfile?.city}</strong>. Blood requests in your district will appear below.
            </p>
          ) : (
            <p className="text-xs text-muted">
              Turn on availability to receive blood donation requests from your district. You can turn this off any time.
            </p>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={togglingAvail || withinLock}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 border ${
            withinLock
              ? 'opacity-40 cursor-not-allowed bg-surface-700 border-surface-600 text-muted'
              : isAvailable
                ? 'bg-success/20 border-success/40 text-success hover:bg-success/30'
                : 'bg-surface-700 border-surface-600 text-muted hover:border-success/40 hover:text-success'
          }`}
        >
          {isAvailable
            ? <><ToggleRight size={22} className="text-success" /> Available (ON)</>
            : <><ToggleLeft size={22} /> Unavailable (OFF)</>
          }
        </button>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Active Requests"
          value={loading ? '—' : activeCount}
          subtitle="Requests in progress"
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
          title="Broadcast District"
          value={userProfile?.city || 'Not Set'}
          subtitle="Local blood network area"
          icon={<MapPin size={20} />}
          variant="default"
        />
      </div>

      {/* ── Broadcast Requests Panel (only visible when available) ── */}
      {isAvailable && (
        <Card padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
                <Droplets size={20} className="text-brand-400" />
                Blood Requests in {userProfile?.city || 'Your District'}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                First-come-first-serve. You can donate <strong className="text-slate-200">exactly 1 unit</strong> per request. After donating, you enter a mandatory 56-day recovery period.
              </p>
            </div>
          </div>

          {broadcastReqs.length === 0 ? (
            <div className="text-center py-10 bg-surface-700/30 rounded-xl border border-surface-600/30">
              <CheckCircle2 size={34} className="text-success mx-auto mb-2 opacity-70" />
              <p className="text-slate-200 font-medium text-sm">No active requests in {userProfile?.city || 'your district'}</p>
              <p className="text-xs text-muted mt-1">You'll see requests here once admin broadcasts them to your district.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcastReqs.map((req) => {
                const fulfilled   = req.unitsFulfilled || 0;
                const stillNeeded = req.unitsRequired - fulfilled;
                const pct         = Math.round((fulfilled / req.unitsRequired) * 100);
                const alreadyDonated = (req.individualDonations || []).some(
                  (d) => d.donorUid === userProfile?.uid,
                );

                return (
                  <div key={req.id} className="p-4 bg-surface-700/50 rounded-xl border border-surface-600/50 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-brand-400 text-sm">{req.referenceNumber}</span>
                          <span className="font-display font-bold text-white">{req.requiredBloodGroup}</span>
                          {req.urgency === 'critical' && (
                            <span className="text-[10px] font-bold bg-danger/20 text-danger px-1.5 py-0.5 rounded-full">CRITICAL</span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          Patient: <strong className="text-slate-200">{req.patientName}</strong> @ {req.hospitalName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted">Units still needed</p>
                        <p className="font-display font-bold text-lg text-white">
                          {stillNeeded}<span className="text-xs text-muted font-normal"> / {req.unitsRequired}</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted">
                        <span>{fulfilled} unit(s) secured so far</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-surface-600 rounded-full h-2">
                        <div
                          className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {/* Individual donor contributions */}
                      {(req.individualDonations || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {req.individualDonations!.map((d, i) => (
                            <span key={i} className="text-[10px] bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded-full">
                              👤 {d.donorName}: 1u
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Blood bank contributions */}
                      {(req.partialDonations || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {req.partialDonations!.map((d, i) => (
                            <span key={i} className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full">
                              🏢 {d.campName}: {d.units}u
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                      {alreadyDonated ? (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 size={13} /> You already donated to this request
                        </span>
                      ) : stillNeeded <= 0 ? (
                        <span className="text-xs text-muted">This request is fully fulfilled</span>
                      ) : !isBloodCompatible(userProfile?.bloodGroup || '', req.requiredBloodGroup) ? (
                        <span className="text-xs text-muted bg-surface-800/80 border border-surface-600/50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                          <AlertTriangle size={13} className="text-warning shrink-0" />
                          Incompatible Blood Group (Your Group: <strong className="text-slate-200">{userProfile?.bloodGroup || 'Not Set'}</strong>)
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<HeartHandshake size={14} />}
                          onClick={() => setDonateTarget(req)}
                        >
                          I'll Donate 1 Unit
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Active Blood Camps in District ───────────────────── */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-white flex items-center gap-2">
              <Building2 size={20} className="text-brand-400" />
              Upcoming Blood Donation Camps in {userProfile?.city || 'Your District'}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Volunteer to donate blood at local charity drives.
            </p>
          </div>
        </div>
        
        {(() => {
          // TODO: Fetch temporary charity camps in the future. 
          // Currently, we only have permanent blood banks in the database, so we force empty state.
          const upcomingCamps: any[] = [];
          
          if (upcomingCamps.length === 0) {
            return (
              <div className="text-center py-10 bg-surface-700/30 rounded-xl border border-surface-600/30">
                <p className="text-slate-200 font-medium text-sm">No upcoming blood donation camps in your district right now.</p>
              </div>
            );
          }
          
          return null;
        })()}
      </Card>

      {/* ── My Requests List ─────────────────────────────────── */}
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
                      Needs <strong className="text-slate-200">{req.unitsRequired} unit(s)</strong> of{' '}
                      <strong className="text-white font-display">{req.requiredBloodGroup}</strong>
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

      {/* ── Donate Confirmation Modal ─────────────────────────── */}
      <Modal
        isOpen={Boolean(donateTarget)}
        onClose={() => setDonateTarget(null)}
        title={`Confirm Blood Donation — ${donateTarget?.referenceNumber}`}
      >
        {donateTarget && (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-success text-sm">❤️ Thank you for stepping up!</p>
              <div className="flex justify-between">
                <span className="text-muted">Patient:</span>
                <strong className="text-white">{donateTarget.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Blood Group Needed:</span>
                <strong className="text-brand-400 font-display text-base">{donateTarget.requiredBloodGroup}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Hospital:</span>
                <strong className="text-white">{donateTarget.hospitalName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Your Contribution:</span>
                <strong className="text-success">1 unit (your blood group: {userProfile?.bloodGroup})</strong>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-warning flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <strong>Important:</strong> After confirming, your availability will be automatically turned OFF and you will be locked from donating for <strong>56 days</strong> (mandatory WHO recovery period).
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
              <Button variant="ghost" onClick={() => setDonateTarget(null)}>Cancel</Button>
              <Button variant="primary" loading={donating} onClick={handleConfirmDonate} icon={<HeartHandshake size={16} />}>
                Confirm — I'll Donate 1 Unit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
