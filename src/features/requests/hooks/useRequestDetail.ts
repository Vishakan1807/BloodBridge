import { useEffect, useState } from 'react';
import { subscribeRequest } from '@/services/request.service';
import type { DonationRequest } from '@/types/request.types';

export function useRequestDetail(requestId?: string) {
  const [request, setRequest] = useState<DonationRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    return subscribeRequest(requestId, (data) => {
      setRequest(data);
      setLoading(false);
    });
  }, [requestId]);

  return { request, loading };
}
