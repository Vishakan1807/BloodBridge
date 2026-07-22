import type { Role } from '@/core/constants/roles';

export interface UserProfile {
  uid:                  string;
  email:                string;
  displayName:          string;
  phone:                string;
  city:                 string;
  role:                 Role;
  bloodGroup:           string | null;
  campId:               string | null;
  isActive:             boolean;
  isVerified:           boolean;
  verifiedBy:           string | null;
  verifiedAt:           number | null;
  // Individual donor availability (role = 'user' only)
  isAvailableToDonate?: boolean;       // Toggle: donor opts into broadcast network
  lastDonationDate?:    number | null; // Timestamp of last actual blood donation (enforces 56-day rule)
  createdAt:            number;
  updatedAt:            number;
}

export interface RegisterData {
  displayName: string;
  phone:       string;
  city:        string;
  bloodGroup:  string;
}

export interface AuthFormState {
  email:    string;
  password: string;
}

export interface RegisterFormState extends AuthFormState {
  displayName:     string;
  confirmPassword: string;
  phone:           string;
  city:            string;
  bloodGroup:      string;
}
