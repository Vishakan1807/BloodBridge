import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Hospital, ShieldCheck, Target, CheckCircle2, AlertCircle, PackageCheck, Clock, Radio, Phone, User, Search, MapPin } from 'lucide-react';
import { useRequestDetail } from '../hooks/useRequestDetail';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { WorkflowTimeline } from './WorkflowTimeline';
import { CommentThread } from '@/features/comments/CommentThread';
import { AttachmentPanel } from '@/features/attachments/AttachmentPanel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { STATE_CONFIG } from '@/core/constants/workflowStates';
import { getProfile, getCompatibleDonorsInDistrict } from '@/services/user.service';
import { getCampsInDistrict } from '@/services/master.service';
import { transitionWorkflowState } from '@/services/workflow.service';
import type { UserProfile } from '@/types/auth.types';
import type { Camp } from '@/types/master.types';
import { NotFoundPage } from '@/components/feedback/PageError';

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { request, loading } = useRequestDetail(id);
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Emergency Directory State
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [directoryTab, setDirectoryTab] = useState<'donors' | 'camps'>('donors');
  const [compatibleDonors, setCompatibleDonors] = useState<UserProfile[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [fetchingDirectory, setFetchingDirectory] = useState(false);

  // Workflow Transition Modal States
  const [closeModalOpen, setCloseModalOpen]         = useState(false);
  const [closureNotes, setClosureNotes]               = useState('');
  const [transitioning, setTransitioning]             = useState(false);

  // Live Donor Phone Lookup (for records predating donorPhone field or cached donors)
  const [donorPhones, setDonorPhones] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!request?.individualDonations) return;
    request.individualDonations.forEach((d) => {
      const storedPhone = (d as any).donorPhone;
      if (storedPhone) {
        setDonorPhones((prev) => ({ ...prev, [d.donorUid]: storedPhone }));
      } else if (d.donorUid) {
        getProfile(d.donorUid).then((prof) => {
          if (prof?.phone) {
            setDonorPhones((prev) => ({ ...prev, [d.donorUid]: prof.phone }));
          }
        }).catch(() => {});
      }
    });
  }, [request?.individualDonations]);

  // Stale request detection: donated but not closed for > 3 days
  const STALE_DAYS = 3;
  const donatedAt  = (request as any)?.donatedAt as number | null;
  const staleDays  = donatedAt
    ? Math.floor((Date.now() - donatedAt) / (1000 * 60 * 60 * 24))
    : 0;
  const isStale = request?.status === 'donated' && staleDays >= STALE_DAYS;

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-40 w-full" />
        <div className="skeleton h-60 w-full" />
      </div>
    );
  }

  if (!request) {
    return <NotFoundPage />;
  }

  const isOwner   = userProfile?.uid === request.createdBy;
  const isAdmin   = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager';
  const canEdit   = (isOwner || isAdmin) && request.status === 'registered';

  const stateCfg = STATE_CONFIG[request.status];

  // Individual donations on this request
  const individualDonations = request.individualDonations || [];
  const partialDonations    = request.partialDonations    || [];

  async function handleRecordDonation() {
    if (!userProfile || !request) return;
    setTransitioning(true);
    try {
      await transitionWorkflowState(request.id, 'donated', userProfile);
      showSuccess(`Donation event recorded for request ${request.referenceNumber}!`);
    } catch (err: any) {
      showError(err?.message || 'Failed to record donation.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleConfirmClose() {
    if (!userProfile || !request || !closureNotes.trim()) {
      showError('Mandatory closure notes required.');
      return;
    }
    setTransitioning(true);
    try {
      await transitionWorkflowState(request.id, 'closed', userProfile, {
        closureNotes: closureNotes.trim(),
      });
      showSuccess(`Request ${request.referenceNumber} closed successfully.`);
      setCloseModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to close request.');
    } finally {
      setTransitioning(false);
    }
  }

  async function openEmergencyDirectory() {
    if (!request) return;
    setDirectoryModalOpen(true);
    setFetchingDirectory(true);
    try {
      const donorCity = request.donorCity || '';
      const bg = request.requiredBloodGroup;
      
      const [fetchedDonors, fetchedCamps] = await Promise.all([
        getCompatibleDonorsInDistrict(donorCity, bg),
        getCampsInDistrict(donorCity)
      ]);
      
      setCompatibleDonors(fetchedDonors);
      setCamps(fetchedCamps);
    } catch (err: any) {
      showError('Failed to load emergency directory');
    } finally {
      setFetchingDirectory(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto page-enter">
      {/* Top Nav & Action Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/requests')}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Requests
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          {canEdit && (
            <Link to={`/requests/${request.id}/edit`}>
              <Button variant="outline" size="sm" icon={<Edit size={16} />}>
                Edit Request
              </Button>
            </Link>
          )}



          {/* Workflow Actions for Manager / Admin */}
          {(isManager || isAdmin) && (
            <>
              {request.status === 'registered' && (
                <Link to="/workflow/verify">
                  <Button variant="primary" size="sm" icon={<ShieldCheck size={16} />}>
                    Go to Verification Queue
                  </Button>
                </Link>
              )}

              {request.status === 'verified' && (
                <Link to="/workflow/match">
                  <Button variant="primary" size="sm" icon={<Target size={16} />}>
                    Go to Fulfillment Status
                  </Button>
                </Link>
              )}

              {request.status === 'donated' && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<CheckCircle2 size={16} />}
                  onClick={() => setCloseModalOpen(true)}
                >
                  Close Request Case
                </Button>
              )}
            </>
          )}

          {/* Requester: Close Case */}
          {isOwner && request.status !== 'closed' && (
            <Button
              variant="primary"
              size="sm"
              icon={request.status === 'donated' ? <PackageCheck size={16} /> : <CheckCircle2 size={16} />}
              onClick={() => setCloseModalOpen(true)}
            >
              {request.status === 'donated' ? '✅ Confirm Blood Received & Close Case' : 'Close Request (Found Blood)'}
            </Button>
          )}

        </div>
      </div>

      {/* Main Request Info Card */}
      <Card padding="lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-700 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-2xl text-brand-400">
                {request.referenceNumber}
              </span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${stateCfg.bgColor} ${stateCfg.color}`}>
                {stateCfg.label}
              </span>
            </div>
            <p className="text-muted text-xs mt-1">
              Raised by <strong className="text-slate-300">{request.donorName}</strong> on{' '}
              {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Blood Group Needed</p>
            <p className="font-display font-black text-3xl text-white">{request.requiredBloodGroup}</p>
            <span className="text-sm font-normal text-muted">({request.unitsRequired} units)</span>
          </div>
        </div>

        {/* Action Buttons */}
        {request.status !== 'closed' && (
          <div className="mt-6 mb-2 space-y-3">
            <Button
              variant="primary"
              className="w-full py-4 text-base sm:text-lg font-bold justify-center shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:shadow-[0_0_25px_rgba(225,29,72,0.6)] transition-all"
              icon={<Phone size={20} className="animate-pulse" />}
              onClick={openEmergencyDirectory}
            >
              Contact Available Donors & Blood Banks
            </Button>

            <p className="text-center text-xs text-muted mt-2">
              Instantly view and contact registered donors and blood banks in <strong className="text-slate-300">{request.donorCity}</strong>.
            </p>
          </div>
        )}

        {/* Workflow Lifecycle Progress */}
        <div className="pt-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Workflow Lifecycle</p>
          <WorkflowTimeline currentState={request.status} />
        </div>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient / Clinical Details */}
        <Card padding="md" className="space-y-3">
          <h3 className="font-display font-semibold text-base text-white border-b border-surface-700 pb-2">
            Patient &amp; Clinical Details
          </h3>

          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted">Patient Name:</span>
              <span className="font-semibold text-slate-100">{request.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Urgency Level:</span>
              <span className="font-semibold uppercase text-brand-400">{request.urgency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Required By Date:</span>
              <span className="font-semibold text-slate-100">
                {new Date(request.requiredByDate).toLocaleDateString()}
              </span>
            </div>
            {request.matchedDonorName && (
              <div className="flex justify-between pt-2 border-t border-surface-700">
                <span className="text-muted">Matched Donor / Source:</span>
                <span className="font-semibold text-success text-right">{request.matchedDonorName}</span>
              </div>
            )}
            {request.allocations && request.allocations.length > 0 && (
              <div className="pt-2 border-t border-surface-700 space-y-1.5">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider block">
                  Multi-Camp Split Allocations:
                </span>
                {request.allocations.map((alloc) => (
                  <div key={alloc.campId} className="flex justify-between text-xs bg-surface-700/50 p-2 rounded-lg border border-surface-600/50">
                    <span className="text-slate-200">🏢 {alloc.campName}:</span>
                    <span className="font-bold text-brand-400">{alloc.units} unit(s)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {request.notes && (
            <div className="pt-2 border-t border-surface-700">
              <p className="text-xs text-muted mb-1">Diagnosis / Notes:</p>
              <p className="text-xs text-slate-300 bg-surface-700/50 p-2.5 rounded-lg border border-surface-600/50">
                {request.notes}
              </p>
            </div>
          )}
        </Card>

        {/* Destination Hospital + Donor contacts */}
        <Card padding="md" className="space-y-3">
          <h3 className="font-display font-semibold text-base text-white border-b border-surface-700 pb-2 flex items-center gap-2">
            <Hospital size={18} className="text-brand-400" /> Destination Hospital
          </h3>

          <div className="text-sm space-y-2">
            <div>
              <p className="font-semibold text-slate-100 text-base">{request.hospitalName}</p>
              <p className="text-xs text-muted mt-0.5">Assigned Hospital Destination</p>
            </div>

            {request.campName && (
              <div className="pt-2 border-t border-surface-700">
                <span className="text-muted text-xs">Processing Camp:</span>
                <p className="font-semibold text-slate-200 text-sm">{request.campName}</p>
              </div>
            )}

            {/* Blood Bank Contributions */}
            {partialDonations.length > 0 && (
              <div className="pt-2 border-t border-surface-700 space-y-1.5">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider block">
                  🏢 Blood Bank Contributions:
                </span>
                {partialDonations.map((pd, i) => (
                  <div key={i} className="flex justify-between text-xs bg-success/10 px-2.5 py-1.5 rounded-lg border border-success/20">
                    <span className="text-slate-200">{pd.campName}</span>
                    <span className="font-bold text-success">{pd.units} unit(s)</span>
                  </div>
                ))}
              </div>
            )}

            {/* Individual Donor Contact Cards — visible to requester and admin */}
            {individualDonations.length > 0 && (isOwner || isAdmin || isManager) && (
              <div className="pt-2 border-t border-surface-700 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-400 block flex items-center gap-1">
                  👤 Individual Donors — Contact Details
                </span>
                <p className="text-[10px] text-muted">
                  {isOwner
                    ? 'Please contact these donors to arrange blood collection. If a donor is unreachable, contact the admin via Comments & Discussion below.'
                    : 'Donors who volunteered for this request:'}
                </p>
                {individualDonations.map((donor, i) => {
                  const phone = (donor as any).donorPhone || donorPhones[donor.donorUid];
                  return (
                    <div key={i} className="bg-brand-500/10 border border-brand-500/25 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-brand-400" />
                        <span className="font-semibold text-white text-sm">{donor.donorName}</span>
                        <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full font-bold">
                          1 unit committed
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-1">
                        <Phone size={12} className="text-success" />
                        {phone ? (
                          <a
                            href={`tel:${phone}`}
                            className="text-success font-semibold text-sm hover:underline"
                          >
                            {phone}
                          </a>
                        ) : (
                          <span className="text-xs text-muted italic">Fetching phone...</span>
                        )}
                        <span className="text-xs text-muted ml-auto">{donor.donorDistrict}</span>
                      </div>
                      <p className="text-[10px] text-muted">
                        Committed on {new Date(donor.donatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {request.closureNotes && (
              <div className="pt-2 border-t border-surface-700">
                <span className="text-muted text-xs">Case Closure Notes:</span>
                <p className="text-xs text-slate-300 italic">{request.closureNotes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Stale Request Warning Banner */}
      {isStale && (isOwner || isAdmin || isManager) && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-xl p-4">
          <Clock size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">Blood delivered but case not closed</p>
            <p className="text-xs text-muted mt-0.5">
              This request has been in <strong>Donated</strong> status for <strong>{staleDays} day{staleDays !== 1 ? 's' : ''}</strong>.
              {isOwner
                ? ' If you have received the blood units, please close the case below.'
                : ' Please follow up with the recipient or close the case.'}
            </p>
          </div>
        </div>
      )}

      {/* Comments & Attachments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md">
          <CommentThread requestId={request.id} />
        </Card>

        <Card padding="md">
          <AttachmentPanel requestId={request.id} />
        </Card>
      </div>

      {/* ── Close Request Modal ─────────────────────────────── */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title={isOwner && !isAdmin && !isManager
          ? `Confirm Blood Received — ${request.referenceNumber}`
          : `Close Request Case — ${request.referenceNumber}`
        }
      >
        <div className="space-y-4">
          {isOwner && !isAdmin && !isManager ? (
            <div className="bg-success/10 border border-success/30 rounded-xl p-3 text-xs text-slate-300">
              <p className="font-semibold text-success mb-1">✅ Confirm Blood Received</p>
              <p>Please confirm that you have received all {request.unitsRequired} unit(s) of <strong>{request.requiredBloodGroup}</strong> blood for {request.patientName}. This will close the case and mark it as complete.</p>
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              Closing this case marks the transaction lifecycle complete. Mandatory closure notes are required.
            </p>
          )}

          <Input
            label={isOwner && !isAdmin && !isManager ? 'Confirmation Notes (e.g. Blood received at hospital)' : 'Mandatory Closure Notes'}
            placeholder={isOwner && !isAdmin && !isManager
              ? 'e.g. All 3 units received at Apollo Hospital. Transfusion completed.'
              : 'e.g. Donation completed successfully.'}
            value={closureNotes}
            onChange={(e) => setClosureNotes(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setCloseModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmClose} loading={transitioning}>
              {isOwner && !isAdmin && !isManager ? 'Confirm & Close Case' : 'Confirm Case Closure'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Emergency Directory Modal ─────────────────────────── */}
      <Modal
        isOpen={directoryModalOpen}
        onClose={() => setDirectoryModalOpen(false)}
        title={`Available Donors & Blood Banks — ${request.donorCity}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Immediate contacts available in <strong>{request.donorCity}</strong> for <strong>{request.requiredBloodGroup}</strong>.
          </p>

          <div className="flex gap-2 border-b border-surface-700 pb-2">
            <button
              onClick={() => setDirectoryTab('donors')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                directoryTab === 'donors'
                  ? 'bg-surface-700 text-brand-400 border-b-2 border-brand-400'
                  : 'text-muted hover:text-slate-200'
              }`}
            >
              Compatible Donors ({compatibleDonors.length})
            </button>
            <button
              onClick={() => setDirectoryTab('camps')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                directoryTab === 'camps'
                  ? 'bg-surface-700 text-info border-b-2 border-info'
                  : 'text-muted hover:text-slate-200'
              }`}
            >
              Blood Banks ({camps.length})
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {fetchingDirectory ? (
              <div className="space-y-3">
                <div className="skeleton h-16 w-full" />
                <div className="skeleton h-16 w-full" />
              </div>
            ) : directoryTab === 'donors' ? (
              compatibleDonors.length > 0 ? (
                <div className="overflow-x-auto border border-surface-700 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Name</th>
                        <th className="py-3 px-4 font-semibold">Blood Group</th>
                        <th className="py-3 px-4 font-semibold">Location</th>
                        <th className="py-3 px-4 font-semibold text-right">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-700">
                      {compatibleDonors.map(donor => (
                        <tr key={donor.uid} className="hover:bg-surface-700/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-200">{donor.displayName}</td>
                          <td className="py-3 px-4">
                            <span className="font-display font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded text-xs">
                              {donor.bloodGroup}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-muted flex items-center gap-1.5"><MapPin size={12} /> {donor.city}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {donor.phone ? (
                              <a href={`tel:${donor.phone}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-info bg-info/10 hover:bg-info/20 px-2.5 py-1.5 rounded-lg transition-colors">
                                <Phone size={14} /> {donor.phone}
                              </a>
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted text-sm border border-dashed border-surface-700 rounded-xl">
                  No compatible donors found in {request.donorCity}.
                </div>
              )
            ) : (
              camps.length > 0 ? (
                <div className="overflow-x-auto border border-surface-700 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Blood Bank Name</th>
                        <th className="py-3 px-4 font-semibold">Location</th>
                        <th className="py-3 px-4 font-semibold text-right">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-700">
                      {camps.map(camp => (
                        <tr key={camp.id} className="hover:bg-surface-700/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {camp.name}
                            <span className="block text-[10px] text-muted uppercase mt-0.5 tracking-wider">BLOOD BANK</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-muted flex items-center gap-1.5"><MapPin size={12} /> {camp.city}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {camp.phone ? (
                              <a href={`tel:${camp.phone}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-info bg-info/10 hover:bg-info/20 px-2.5 py-1.5 rounded-lg transition-colors">
                                <Phone size={14} /> {camp.phone}
                              </a>
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted text-sm border border-dashed border-surface-700 rounded-xl">
                  No blood banks or camps found in {request.donorCity}.
                </div>
              )
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setDirectoryModalOpen(false)}>Close Directory</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
