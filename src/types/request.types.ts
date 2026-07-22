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

// Tracks each individual voluntary donor's contribution (max 1 unit per donor)
export interface IndividualDonation {
  donorUid:      string;
  donorName:     string;
  donorPhone:    string;   // Contact number shown to requester
  donorDistrict: string;
  units:         1;        // Always exactly 1 unit (WHO norm)
  donatedAt:     number;
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
  allocations?:          CampAllocation[] | null;
  partialDonations?:     PartialDonation[] | null;     // Each blood bank's contribution
  individualDonations?:  IndividualDonation[] | null;  // Each individual donor's contribution
  donatedAt:             number | null;
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
