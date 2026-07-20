import type { WorkflowState } from '@/core/constants/workflowStates';

export type UrgencyLevel = 'critical' | 'urgent' | 'normal';

export interface DonationRequest {
  id:                 string;
  referenceNumber:    string;   // BB-YYYY-NNNNN
  createdBy:          string;   // Donor UID
  donorName:          string;   // Snapshot
  donorBloodGroup:    string;   // Snapshot
  requiredBloodGroup: string;   // Blood group needed
  unitsRequired:       number;   // Units needed
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
