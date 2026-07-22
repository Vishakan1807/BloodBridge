import { ref, set, get, update } from 'firebase/database';
import { db } from '@/core/config/firebase';
import type { UserProfile, RegisterData } from '@/types/auth.types';

// ── Create Profile (called after signUp) ─────────────────────
export async function createProfile(
  uid: string,
  email: string,
  data: RegisterData,
): Promise<void> {
  const profile: UserProfile = {
    uid,
    email,
    displayName:  data.displayName,
    phone:        data.phone,
    city:         data.city,
    role:         'user',           // Always 'user' on self-registration
    bloodGroup:   data.bloodGroup,
    campId:       null,
    isActive:     true,
    isVerified:   false,
    verifiedBy:   null,
    verifiedAt:   null,
    createdAt:    Date.now(),
    updatedAt:    Date.now(),
  };
  await set(ref(db, `users/${uid}`), profile);
}

// ── Get Profile ───────────────────────────────────────────────
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await get(ref(db, `users/${uid}`));
  if (!snapshot.exists()) return null;
  return snapshot.val() as UserProfile;
}

// ── Update Profile ────────────────────────────────────────────
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>,
): Promise<void> {
  await update(ref(db, `users/${uid}`), {
    ...data,
    updatedAt: Date.now(),
  });
}

// ── List All Users (Admin only) ───────────────────────────────
export async function listUsers(): Promise<UserProfile[]> {
  const snapshot = await get(ref(db, 'users'));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()) as UserProfile[];
}

// ── Set Role (Admin only) ─────────────────────────────────────
export async function setRole(
  uid: string,
  role: UserProfile['role'],
): Promise<void> {
  await update(ref(db, `users/${uid}`), { role, updatedAt: Date.now() });
}

// ── Set Active Status (Admin only) ────────────────────────────
export async function setActive(uid: string, isActive: boolean): Promise<void> {
  await update(ref(db, `users/${uid}`), { isActive, updatedAt: Date.now() });
}

// ── Check if email exists in database ─────────────────────────
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!email || !email.includes('@')) return false;
  const snapshot = await get(ref(db, 'users'));
  if (!snapshot.exists()) return false;
  const users = Object.values(snapshot.val()) as UserProfile[];
  const normalized = email.trim().toLowerCase();
  return users.some((u) => u.email && u.email.trim().toLowerCase() === normalized);
}

// ── Donor Availability Toggle ─────────────────────────────────
// Donor opts in/out of the broadcast network
export async function setDonorAvailability(
  uid: string,
  isAvailable: boolean,
): Promise<void> {
  await update(ref(db, `users/${uid}`), {
    isAvailableToDonate: isAvailable,
    updatedAt: Date.now(),
  });
}

// ── Record Last Donation Date (enforces 56-day lock) ─────────
// Called after a donor successfully completes an individual donation
export async function recordDonorLastDonation(uid: string): Promise<void> {
  await update(ref(db, `users/${uid}`), {
    lastDonationDate:    Date.now(),
    isAvailableToDonate: false,   // Auto-toggle off after donating
    updatedAt:           Date.now(),
  });
}

// ── Get donors available in a given district ─────────────────
// Used by admin/broadcast panel to count available donors
export async function getAvailableDonorsInDistrict(district: string): Promise<UserProfile[]> {
  const snapshot = await get(ref(db, 'users'));
  if (!snapshot.exists()) return [];
  const users = Object.values(snapshot.val()) as UserProfile[];
  return users.filter(
    (u) =>
      u.role === 'user' &&
      u.isActive &&
      u.isAvailableToDonate === true &&
      u.city?.toLowerCase() === district.toLowerCase(),
  );
}
