import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, Hospital, User, Phone, FileText, MessageSquare, Paperclip } from 'lucide-react';
import { useRequestDetail } from '../hooks/useRequestDetail';
import { useAuth } from '@/core/context/AuthContext';
import { WorkflowTimeline } from './WorkflowTimeline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { STATE_CONFIG } from '@/core/constants/workflowStates';
import { NotFoundPage } from '@/components/feedback/PageError';

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { request, loading } = useRequestDetail(id);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

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
  const canEdit = (isOwner || isAdmin) && request.status === 'registered';

  const stateCfg = STATE_CONFIG[request.status];

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

        {canEdit && (
          <Link to={`/requests/${request.id}/edit`}>
            <Button variant="secondary" size="sm" icon={<Edit size={16} />}>
              Edit Request
            </Button>
          </Link>
        )}
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
          </div>
        </Card>
      </div>

      {/* Placeholders for Comments & Attachments (Modules 6 & 7 on Day 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={18} className="text-brand-400" />
            <h3 className="font-display font-semibold text-base text-white">Comments</h3>
          </div>
          <p className="text-xs text-muted">Comments thread active in Day 4 (Workflow & Discussion Module).</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip size={18} className="text-brand-400" />
            <h3 className="font-display font-semibold text-base text-white">Attachments</h3>
          </div>
          <p className="text-xs text-muted">Prescription & Medical document attachments active in Day 4.</p>
        </Card>
      </div>
    </div>
  );
}
