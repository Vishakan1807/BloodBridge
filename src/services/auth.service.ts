import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '@/core/config/firebase';

// ── Sign In ───────────────────────────────────────────────────
export async function signIn(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

// ── Sign Up ───────────────────────────────────────────────────
export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  return credential;
}

// ── Sign Out ──────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

// ── Password Reset ────────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}
