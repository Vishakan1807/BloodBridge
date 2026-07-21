import type { WorkflowState } from '@/core/constants/workflowStates';

export type UrgencyLevel = 'critical' | 'urgent' | 'normal';

export interface CampAllocation {
  campId:   string;
  campName: string;
  units:    number;
}

// Tracks each blood bank's partial contribution to fulfilling a request
export interface PartialDonation {
  campId:    string;
  campName:  string;
  units:     number;
  donatedAt: number;
  donatedBy: string; // coordinator uid
}

export interface DonationRequest {
  id:                 string;
  referenceNumber:    string;   // BB-YYYY-NNNNN
  createdBy:          string;   // Donor UID
  donorName:          string;   // Snapshot
  donorBloodGroup:    string;   // Snapshot
  donorCity:          string;   // City used to broadcast to nearby camps
  requiredBloodGroup: string;   // Blood group needed
  unitsRequired:       number;  // Units needed
  unitsFulfilled?:     number;  // Running total of units donated so far
  urgency:            UrgencyLevel;
  hospitalId:         string;
  hospitalName:       string;   // Snapshot
  patientName:        string;
  requiredByDate:     number;   // Unix timestamp (ms)
  notes:              string;
  status:             WorkflowState;
  campId:             string | null;
  campName:           string | null;
  matchedDonorUid:    string | null;
  matchedDonorName:   string | null;
  allocations?:       CampAllocation[] | null;
  partialDonations?:  PartialDonation[] | null;  // Each camp's contribution
  donatedAt:          number | null;
  closureNotes:       string | null;
  createdAt:          number;
  updatedAt:          number;
}

export interface CreateRequestDTO {
  requiredBloodGroup: string;
  unitsRequired:       number;
  urgency:            UrgencyLevel;
  hospitalId:         string;
  hospitalName:       string;
  patientName:        string;
  requiredByDate:     number;
  notes?:             string;
}

export interface RequestFilters {
  status?:     string;
  bloodGroup?: string;
  campId?:     string;
  urgency?:    string;
  search?:     string;
}
