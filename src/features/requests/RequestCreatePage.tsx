import React from 'react';
import { RequestForm } from '@/features/requests/components/RequestForm';

export function RequestCreatePage() {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">
          Raise Donation Request 🩸
        </h1>
        <p className="text-muted text-sm mt-1">
          Submit recipient details to match available blood donors
        </p>
      </div>

      <RequestForm />
    </div>
  );
}
