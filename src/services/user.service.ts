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
