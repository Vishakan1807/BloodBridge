import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/core/config/firebase';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  resetPassword as authResetPassword,
} from '@/services/auth.service';
import {
  createProfile,
  getProfile,
} from '@/services/user.service';
import type { UserProfile, RegisterData } from '@/types/auth.types';

// ── Context Shape ─────────────────────────────────────────────
interface AuthContextValue {
  currentUser:  FirebaseUser | null;
  userProfile:  UserProfile | null;
  loading:      boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, data: RegisterData): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  // Resolve profile from DB whenever Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          } else {
            // Profile missing — create minimal stub so app never crashes
            const stub: UserProfile = {
              uid:         user.uid,
              email:       user.email ?? '',
              displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
              phone:       '',
              city:        '',
              role:        'user',
              bloodGroup:  null,
              campId:      null,
              isActive:    true,
              isVerified:  false,
              verifiedBy:  null,
              verifiedAt:  null,
              createdAt:   Date.now(),
              updatedAt:   Date.now(),
            };
            setUserProfile(stub);
          }
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Safety timeout to guarantee app renders even if Firebase is unreachable
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // ── Auth Methods ───────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    await authSignIn(email, password);
    // onAuthStateChanged will fire and load the profile
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, data: RegisterData) => {
      const credential = await authSignUp(email, password, data.displayName);
      await createProfile(credential.user.uid, email, data);
      // onAuthStateChanged will fire and load the new profile
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authSignOut();
    setUserProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await authResetPassword(email);
  }, []);

  // Re-fetches the profile from Firebase — call after availability toggle or donation
  const refreshProfile = useCallback(async () => {
    if (!currentUser) return;
    try {
      const profile = await getProfile(currentUser.uid);
      if (profile) setUserProfile(profile);
    } catch {
      // Silently fail — profile will refresh on next auth state change
    }
  }, [currentUser]);

  const value: AuthContextValue = {
    currentUser,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
