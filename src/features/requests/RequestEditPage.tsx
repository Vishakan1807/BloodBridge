import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRequestDetail } from './hooks/useRequestDetail';
import { useAuth } from '@/core/context/AuthContext';
import { RequestForm } from './components/RequestForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export function RequestEditPage() {
  const { id } = useParams<{ id: string }>();
  const { request, loading } = useRequestDetail(id);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-8">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-300 font-medium">Request not found.</p>
        <Button variant="secondary" onClick={() => navigate('/requests')} className="mt-4">
          Back to Requests
        </Button>
      </div>
    );
  }

  const isOwner = userProfile?.uid === request.createdBy;
  const isAdmin = userProfile?.role === 'admin';

  // BR-03 Enforcement: Edits permitted ONLY in 'registered' state
  if (request.status !== 'registered' && !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12">
        <Card padding="lg" className="text-center space-y-4 border-warning/40">
          <AlertTriangle size={36} className="text-warning mx-auto" />
          <h2 className="font-display font-bold text-xl text-white">Request Locked (BR-03)</h2>
          <p className="text-xs text-muted">
            This request is in <span className="font-semibold text-slate-200 uppercase">{request.status}</span> state.
            Requests can only be edited while in <strong className="text-slate-200">REGISTERED</strong> state.
          </p>
          <Button variant="primary" onClick={() => navigate(`/requests/${request.id}`)}>
            Return to Request Details
          </Button>
        </Card>
      </div>
    );
  }

  if (!isOwner && !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12">
        <Card padding="lg" className="text-center space-y-4 border-danger/40">
          <h2 className="font-display font-bold text-xl text-white">Unauthorized</h2>
          <p className="text-xs text-muted">You do not have permission to edit this request.</p>
          <Button variant="secondary" onClick={() => navigate('/requests')}>
            Back to Requests
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">
          Edit Request — {request.referenceNumber}
        </h1>
        <p className="text-muted text-sm mt-1">
          Update recipient and clinical details for request {request.referenceNumber}
        </p>
      </div>

      <RequestForm initialData={request} isEditMode />
    </div>
  );
}
