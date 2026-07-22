import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Hospital, ShieldCheck, Target, CheckCircle2, AlertCircle, PackageCheck, Clock, Radio, Phone, User } from 'lucide-react';
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
import { transitionWorkflowState, rebroadcastRequest } from '@/services/workflow.service';
import { NotFoundPage } from '@/components/feedback/PageError';

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { request, loading } = useRequestDetail(id);
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Workflow Transition Modal States
  const [closeModalOpen, setCloseModalOpen]         = useState(false);
  const [closureNotes, setClosureNotes]               = useState('');
  const [transitioning, setTransitioning]             = useState(false);

  // Rebroadcast Modal
  const [rebroadcastModalOpen, setRebroadcastModalOpen] = useState(false);
  const [rebroadcasting, setRebroadcasting]             = useState(false);

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

  async function handleRebroadcast() {
    if (!userProfile || !request) return;
    setRebroadcasting(true);
    try {
      await rebroadcastRequest(request.id, userProfile);
      showSuccess(`Request ${request.referenceNumber} has been rebroadcast. All eligible donors and blood banks in ${request.donorCity} will see the updated requirement.`);
      setRebroadcastModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to rebroadcast request.');
    } finally {
      setRebroadcasting(false);
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
              <Button variant="secondary" size="sm" icon={<Edit size={16} />}>
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

          {/* Admin only: Rebroadcast button (reset individual donors & re-open) */}
          {isAdmin && (request.status === 'verified' || request.status === 'donated') &&
            individualDonations.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Radio size={16} />}
              onClick={() => setRebroadcastModalOpen(true)}
            >
              Rebroadcast Request
            </Button>
          )}

          {/* Donor: Confirm Blood Received & Close */}
          {isOwner && request.status === 'donated' && (
            <Button
              variant="primary"
              size="sm"
              icon={<PackageCheck size={16} />}
              onClick={() => setCloseModalOpen(true)}
            >
              ✅ Confirm Blood Received & Close
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
                {individualDonations.map((donor, i) => (
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
                      {(donor as any).donorPhone ? (
                        <a
                          href={`tel:${(donor as any).donorPhone}`}
                          className="text-success font-semibold text-sm hover:underline"
                        >
                          {(donor as any).donorPhone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted italic">Phone not available</span>
                      )}
                      <span className="text-xs text-muted ml-auto">{donor.donorDistrict}</span>
                    </div>
                    <p className="text-[10px] text-muted">
                      Committed on {new Date(donor.donatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
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

      {/* ── Rebroadcast Modal ───────────────────────────────── */}
      <Modal
        isOpen={rebroadcastModalOpen}
        onClose={() => setRebroadcastModalOpen(false)}
        title={`Rebroadcast Request — ${request.referenceNumber}`}
      >
        <div className="space-y-4">
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-warning text-sm flex items-center gap-2">
              <Radio size={15} /> Emergency Rebroadcast
            </p>
            <p>
              Use this when a committed donor is <strong>unreachable or unable to donate</strong>.
              This will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted ml-1">
              <li>Reset all individual donor commitments for this request</li>
              <li>Restore the required units back to <strong className="text-white">{request.unitsRequired} unit(s)</strong></li>
              <li>Rebroadcast to all available donors and blood banks in <strong className="text-white">{request.donorCity}</strong></li>
            </ul>
            <p className="text-warning font-semibold mt-2">
              ⚠️ Only do this after confirming the donor is truly unreachable via the Comments section.
            </p>
          </div>

          {/* Show who will be removed */}
          {individualDonations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted font-semibold uppercase tracking-wider">Donor commitments to be reset:</p>
              {individualDonations.map((d, i) => (
                <div key={i} className="flex justify-between text-xs bg-surface-700/50 px-3 py-2 rounded-lg border border-danger/20">
                  <span className="text-slate-200">👤 {d.donorName} ({d.donorDistrict})</span>
                  <span className="text-danger font-bold">Will be removed</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setRebroadcastModalOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={<Radio size={16} />} loading={rebroadcasting} onClick={handleRebroadcast}>
              Confirm Rebroadcast
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
