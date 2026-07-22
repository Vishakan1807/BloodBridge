import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '@/core/config/firebase';
import { getProfile, createProfile } from '@/services/user.service';

const googleProvider = new GoogleAuthProvider();

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

// ── Google Sign In ────────────────────────────────────────────
export async function signInWithGoogle(): Promise<{ credential: UserCredential; isNewUser: boolean }> {
  const credential = await signInWithPopup(auth, googleProvider);
  const existingProfile = await getProfile(credential.user.uid);

  let isNewUser = false;
  if (!existingProfile) {
    isNewUser = true;
    await createProfile(credential.user.uid, credential.user.email || '', {
      displayName: credential.user.displayName || 'Donor',
      phone:       credential.user.phoneNumber || '',
      city:        '',
      bloodGroup:  '', // Left empty so onboarding modal prompts them for their exact blood group
    });
  }

  return { credential, isNewUser };
}
