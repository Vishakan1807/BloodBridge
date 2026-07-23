import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
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

// ── Phone Authentication ──────────────────────────────────────

/**
 * Initializes the RecaptchaVerifier.
 * Must be called in a useEffect inside the component rendering the container.
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
}

/**
 * Sends an OTP to the given phone number.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

/**
 * Verifies the OTP entered by the user.
 */
export async function verifyPhoneOtp(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<{ credential: UserCredential; isNewUser: boolean }> {
  const credential = await confirmationResult.confirm(otp);
  const existingProfile = await getProfile(credential.user.uid);

  let isNewUser = false;
  if (!existingProfile) {
    isNewUser = true;
    await createProfile(credential.user.uid, credential.user.email || '', {
      displayName: credential.user.displayName || credential.user.phoneNumber || 'User',
      phone:       credential.user.phoneNumber || '',
      city:        '',
      bloodGroup:  '', // Left empty so CompleteProfileModal prompts them
    });
  }

  return { credential, isNewUser };
}
