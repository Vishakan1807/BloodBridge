export interface BloodGroup {
  id:          string;
  label:       string;   // e.g. 'A+', 'O-'
  description: string;
  isActive:    boolean;
  createdBy:   string;
  createdAt:   number;
}

export interface Camp {
  id:             string;
  name:           string;
  address:        string;
  city:           string;
  phone:          string;
  coordinatorUid: string | null;
  coordinatorName?: string;
  isActive:       boolean;
  createdBy:      string;
  createdAt:      number;
}

export interface Hospital {
  id:        string;
  name:      string;
  address:   string;
  city:      string;
  phone:     string;
  isActive:  boolean;
  createdBy: string;
  createdAt: number;
}

export interface InventoryItem {
  units:         number;
  lastUpdatedBy: string;
  lastUpdatedAt: number;
}

export type CampInventory = Record<string, InventoryItem>; // key: blood group label e.g. 'O+'
