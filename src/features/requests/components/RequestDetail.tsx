import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Hospital, ShieldCheck, Target, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { transitionWorkflowState } from '@/services/workflow.service';
import { NotFoundPage } from '@/components/feedback/PageError';

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { request, loading } = useRequestDetail(id);
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Workflow Transition Modal States
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [transitioning, setTransitioning] = useState(false);

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

  const isOwner = userProfile?.uid === request.createdBy;
  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager';
  const canEdit = (isOwner || isAdmin) && request.status === 'registered';

  const stateCfg = STATE_CONFIG[request.status];

  // Workflow Action Handlers
  async function handleRecordDonation() {
    if (!userProfile || !request) return;
    setTransitioning(true);
    try {
      await transitionWorkflowState(request.id, 'donated', userProfile);
      showSuccess(`Donation event recorded for request ${request.referenceNumber}! Stock decremented.`);
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

        <div className="flex items-center gap-3">
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
                    Go to Matching Console
                  </Button>
                </Link>
              )}

              {request.status === 'matched' && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={transitioning}
                  onClick={handleRecordDonation}
                  icon={<CheckCircle2 size={16} />}
                >
                  Record Donation (Deduct Stock)
                </Button>
              )}

              {request.status === 'donated' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCloseModalOpen(true)}
                >
                  Close Request Case
                </Button>
              )}
            </>
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
            <p className="text-xs text-muted mt-1">
              Raised by <strong className="text-slate-300">{request.donorName}</strong> on {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted">Blood Group Needed</p>
              <p className="font-display font-bold text-2xl text-white">
                {request.requiredBloodGroup}{' '}
                <span className="text-sm font-normal text-muted">({request.unitsRequired} units)</span>
              </p>
            </div>
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
        {/* Recipient / Patient Details */}
        <Card padding="md" className="space-y-3">
          <h3 className="font-display font-semibold text-base text-white border-b border-surface-700 pb-2">
            Patient & Clinical Details
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

        {/* Destination Hospital Details */}
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

            {request.closureNotes && (
              <div className="pt-2 border-t border-surface-700">
                <span className="text-muted text-xs">Case Closure Notes:</span>
                <p className="text-xs text-slate-300 italic">{request.closureNotes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Embedded Comments & Attachments Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md">
          <CommentThread requestId={request.id} />
        </Card>

        <Card padding="md">
          <AttachmentPanel requestId={request.id} />
        </Card>
      </div>

      {/* Close Request Case Modal */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title={`Close Request Case — ${request.referenceNumber}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Closing this case marks the transaction lifecycle complete. Mandatory closure notes are required.
          </p>

          <Input
            label="Mandatory Closure Notes"
            placeholder="e.g. Donation completed successfully at Red Cross Camp."
            value={closureNotes}
            onChange={(e) => setClosureNotes(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setCloseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmClose} loading={transitioning}>
              Confirm Case Closure
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
