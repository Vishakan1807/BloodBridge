import { useEffect, useState, useMemo } from 'react';
import { subscribeRequests } from '@/services/request.service';
import { useAuth } from '@/core/context/AuthContext';
import type { DonationRequest, RequestFilters } from '@/types/request.types';

export function useRequests() {
  const { userProfile } = useAuth();
  const [allRequests, setAllRequests] = useState<DonationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RequestFilters>({
    status:     'all',
    bloodGroup: 'all',
    urgency:    'all',
    search:     '',
  });

  useEffect(() => {
    return subscribeRequests((list) => {
      setAllRequests(list);
      setLoading(false);
    });
  }, []);

  // Filter requests based on role + active filters
  const filteredRequests = useMemo(() => {
    if (!userProfile) return [];

    let list = allRequests;

    // Role Scope Guard: Donors only see their own requests
    if (userProfile.role === 'user') {
      list = list.filter((r) => r.createdBy === userProfile.uid || r.matchedDonorUid === userProfile.uid);
    }

    // Status Filter
    if (filters.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status);
    }

    // Blood Group Filter
    if (filters.bloodGroup && filters.bloodGroup !== 'all') {
      list = list.filter((r) => r.requiredBloodGroup === filters.bloodGroup);
    }

    // Urgency Filter
    if (filters.urgency && filters.urgency !== 'all') {
      list = list.filter((r) => r.urgency === filters.urgency);
    }

    // Search Query (ref, donor, patient, hospital)
    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.referenceNumber.toLowerCase().includes(q) ||
          r.donorName.toLowerCase().includes(q) ||
          r.patientName.toLowerCase().includes(q) ||
          r.hospitalName.toLowerCase().includes(q),
      );
    }

    return list;
  }, [allRequests, userProfile, filters]);

  return {
    requests: filteredRequests,
    totalCount: allRequests.length,
    loading,
    filters,
    setFilters,
  };
}
