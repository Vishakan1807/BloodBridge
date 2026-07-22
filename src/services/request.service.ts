import { ref, set, push, update, get, onValue, runTransaction, type Unsubscribe } from 'firebase/database';
import { db } from '@/core/config/firebase';
import type { DonationRequest, CreateRequestDTO, RequestFilters } from '@/types/request.types';
import type { UserProfile } from '@/types/auth.types';

// ── Atomic Reference Number Generator ─────────────────────────
async function generateReferenceNumber(): Promise<string> {
  const counterRef = ref(db, 'meta/requestCounter');
  const year = new Date().getFullYear();

  const result = await runTransaction(counterRef, (currentValue) => {
    return (currentValue || 0) + 1;
  });

  const sequence = result.snapshot.val();
  const padded = String(sequence).padStart(5, '0');
  return `BB-${year}-${padded}`;
}

// ── Create Request ────────────────────────────────────────────
export async function createRequest(
  dto: CreateRequestDTO,
  user: UserProfile,
): Promise<string> {
  const referenceNumber = await generateReferenceNumber();
  const requestsRef = ref(db, 'requests');
  const newRef = push(requestsRef);
  const id = newRef.key!;

  const now = Date.now();
  // Broadcast district is determined primarily by the Destination Hospital's district, falling back to requester's district
  const broadcastDistrict = dto.hospitalCity?.trim() || user.city?.trim() || '';

  const requestData: DonationRequest = {
    id,
    referenceNumber,
    createdBy:          user.uid,
    donorName:          user.displayName || 'Anonymous Donor',
    donorBloodGroup:    user.bloodGroup || dto.requiredBloodGroup,
    donorCity:          broadcastDistrict,   // Hospital/district used for broadcast
    requiredBloodGroup: dto.requiredBloodGroup,
    unitsRequired:      dto.unitsRequired,
    unitsFulfilled:     0,                  // Tracks partial donations progress
    urgency:            dto.urgency,
    hospitalId:         dto.hospitalId,
    hospitalName:       dto.hospitalName,
    patientName:        dto.patientName.trim(),
    requiredByDate:     dto.requiredByDate,
    notes:              dto.notes?.trim() || '',
    status:             'registered',
    campId:             null,
    campName:           null,
    matchedDonorUid:    null,
    matchedDonorName:   null,
    partialDonations:   [],
    donatedAt:          null,
    closureNotes:       null,
    createdAt:          now,
    updatedAt:          now,
  };

  await set(newRef, requestData);

  // Write initial workflow state entry
  const wfEntryRef = push(ref(db, `workflow/${id}`));
  await set(wfEntryRef, {
    fromState: null,
    toState:   'registered',
    actorUid:  user.uid,
    actorName: user.displayName,
    actorRole: user.role,
    note:      'Donation request created.',
    timestamp: now,
  });

  return id;
}

// ── Get Single Request ────────────────────────────────────────
export async function getRequest(id: string): Promise<DonationRequest | null> {
  const snapshot = await get(ref(db, `requests/${id}`));
  if (!snapshot.exists()) return null;
  return snapshot.val() as DonationRequest;
}

// ── Subscribe Single Request ──────────────────────────────────
export function subscribeRequest(
  id: string,
  callback: (request: DonationRequest | null) => void,
): Unsubscribe {
  const requestRef = ref(db, `requests/${id}`);
  return onValue(requestRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(snapshot.val() as DonationRequest);
  });
}

// ── Subscribe All Requests ────────────────────────────────────
export function subscribeRequests(
  callback: (requests: DonationRequest[]) => void,
): Unsubscribe {
  const requestsRef = ref(db, 'requests');
  return onValue(requestsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = Object.values(snapshot.val()) as DonationRequest[];
    // Sort descending by createdAt
    callback(data.sort((a, b) => b.createdAt - a.createdAt));
  });
}

// ── Update Request (Registered-State Only Guarded) ────────────
export async function updateRequest(
  id: string,
  data: Partial<DonationRequest>,
): Promise<void> {
  const current = await getRequest(id);
  if (!current) throw new Error('Request not found.');

  // BR-03 Guardrail: Only REGISTERED state is editable by non-admin
  if (current.status !== 'registered') {
    throw new Error('Requests can only be edited while in REGISTERED state.');
  }

  await update(ref(db, `requests/${id}`), {
    ...data,
    updatedAt: Date.now(),
  });
}
