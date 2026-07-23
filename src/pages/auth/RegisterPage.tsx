import React, { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Phone, Droplets } from 'lucide-react';
import { get, ref } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/core/constants/routes';
import { checkEmailExists, createProfile } from '@/services/user.service';

import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';
import { CITY_OPTIONS } from '@/core/constants/indianCities';

const cityOptions = CITY_OPTIONS;

function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  let normalized = cleaned;
  if (normalized.startsWith('+91')) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith('91') && normalized.length > 10) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }
  return /^\d{8,11}$/.test(normalized);
}

function parseFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':   'This email ID already exists in our system. Please sign in to your existing account.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password is too weak. Please use at least 8 characters.',
    'auth/network-request-failed': 'Network connection error. Please check your internet connection.',
    'auth/too-many-requests':      'Too many registration attempts. Please try again later.',
    'auth/unauthorized-domain':    'Google Sign-In Domain Error: Please add your domain (e.g. localhost or vercel app URL) in Firebase Console -> Authentication -> Settings -> Authorized domains.',
    'auth/popup-closed-by-user':   'Google Sign-In popup was closed before completing.',
    'auth/popup-blocked':          'Google Sign-In popup was blocked by your browser settings.',
  };
  return map[code] ?? 'Registration failed. Please verify your information and try again.';
}

interface FormState {
  displayName:     string;
  email:           string;
  password:        string;
  confirmPassword: string;
  phone:           string;
  city:            string;
  bloodGroup:      string;
}

interface FormErrors extends Partial<FormState> {}

export default function RegisterPage() {
  const { signUp, signInWithGoogle, currentUser } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const phoneAuth = location.state?.phoneAuth || false;
  const initPhone = location.state?.phoneNumber || '';

  const [form,          setForm]          = useState<FormState>({
    displayName: '', email: '', password: '', confirmPassword: '',
    phone: initPhone, city: '', bloodGroup: '',
  });
  const [errors,        setErrors]        = useState<FormErrors>({});
  const [showPwd,       setShowPwd]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      showSuccess('Successfully signed in with Google! 🩸');
      navigate(ROUTES.DASHBOARD);
    } catch (err: any) {
      showError(parseFirebaseError(err?.code || ''));
    } finally {
      setGoogleLoading(false);
    }
  }
  const DEFAULT_BLOOD_GROUPS: SelectOption[] = CLINICAL_BLOOD_GROUPS.map((g) => ({
    value: g.value,
    label: `${g.label}${g.category !== 'standard' ? ' 🌟' : ''}`,
  }));

  const [bgOptions, setBgOptions] = useState<SelectOption[]>(DEFAULT_BLOOD_GROUPS);

  // Load blood groups from Firebase master data if available, fallback to defaults
  useEffect(() => {
    get(ref(db, 'master/bloodGroups')).then((snap) => {
      if (snap.exists()) {
        const groups = Object.values(snap.val()) as { label: string; isActive: boolean }[];
        const active = groups
          .filter((g) => g.isActive)
          .map((g) => ({ value: g.label, label: g.label }));
        if (active.length > 0) {
          setBgOptions(active);
        }
      }
    }).catch(() => {
      // Keep defaults on fetch failure
    });
  }, []);

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleEmailBlur() {
    if (!form.email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors((prev) => ({ ...prev, email: 'Enter a valid email.' }));
      return;
    }

    try {
      const exists = await checkEmailExists(form.email);
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          email: 'This email ID already exists in our system. Please sign in instead.',
        }));
        showWarning('This email ID is already registered. Please click "Sign in" below to log into your account.');
      } else {
        setErrors((prev) => ({ ...prev, email: undefined }));
      }
    } catch {
      // Ignore network errors during background blur check
    }
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.displayName.trim())             errs.displayName = 'Full name is required.';
    else if (form.displayName.trim().length < 2) errs.displayName = 'Name must be at least 2 characters.';

    if (!phoneAuth) {
      if (!form.email)                              errs.email = 'Email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email.';

      if (!form.password)                           errs.password = 'Password is required.';
      else if (form.password.length < 8)            errs.password = 'Password must be at least 8 characters.';

      if (!form.confirmPassword)                    errs.confirmPassword = 'Please confirm your password.';
      else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    }

    if (!form.phone)                              errs.phone = 'Phone number is required.';
    else if (!isValidIndianPhone(form.phone))
      errs.phone = 'Enter a valid Indian mobile or landline number (e.g. 9876543210 or 044-28290000).';

    if (!form.city.trim())                        errs.city = 'District is required.';
    if (!form.bloodGroup)                         errs.bloodGroup = 'Please select your blood group.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (phoneAuth && currentUser) {
        await createProfile(currentUser.uid, undefined, {
          displayName: form.displayName.trim(),
          phone:       form.phone.replace(/\s/g, ''),
          city:        form.city.trim(),
          bloodGroup:  form.bloodGroup,
        });
        showSuccess('Profile completed successfully! Welcome to BloodBridge.');
        navigate(ROUTES.DASHBOARD, { replace: true });
      } else {
        await signUp(form.email, form.password, {
          displayName: form.displayName.trim(),
          phone:       form.phone.replace(/\s/g, ''),
          city:        form.city.trim(),
          bloodGroup:  form.bloodGroup,
        });
        showSuccess('Account created successfully! Welcome to BloodBridge.');
        navigate(ROUTES.DASHBOARD, { replace: true });
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      showError(parseFirebaseError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <Droplets size={24} className="text-brand-500" />
          <span className="font-display font-bold text-xl text-white">
            Blood<span className="text-brand-500">Bridge</span>
          </span>
        </div>

        <div className="bg-surface-800 border border-surface-600/40 rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="font-display font-bold text-2xl text-white mb-1">
              {phoneAuth ? 'Complete your profile' : 'Create your account'}
            </h2>
            <p className="text-muted text-sm">Join BloodBridge as a donor</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              id="reg-name"
              type="text"
              label="Full Name"
              placeholder="Alice Sharma"
              value={form.displayName}
              onChange={(e) => setField('displayName', e.target.value)}
              onBlur={validate}
              error={errors.displayName}
              icon={<User size={16} />}
              required
            />

            {!phoneAuth && (
              <>
                <Input
                  id="reg-email"
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, email: e.target.value }));
                  }}
                  onBlur={handleEmailBlur}
                  error={errors.email}
                  icon={<Mail size={16} />}
                  autoComplete="email"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="reg-password"
                    type={showPwd ? 'text' : 'password'}
                    label="Password"
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    onBlur={validate}
                    error={errors.password}
                    icon={<Lock size={16} />}
                    iconRight={showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    onIconRightClick={() => setShowPwd(!showPwd)}
                    autoComplete="new-password"
                    required
                  />
                  <Input
                    id="reg-confirm-password"
                    type={showPwd ? 'text' : 'password'}
                    label="Confirm Password"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={(e) => setField('confirmPassword', e.target.value)}
                    onBlur={validate}
                    error={errors.confirmPassword}
                    icon={<Lock size={16} />}
                    required
                  />
                </div>
              </>
            )}

            <Input
              id="reg-phone"
              type="tel"
              label="Phone Number (Mobile / Landline)"
              placeholder="Mobile or Landline (e.g. 9876543210 or 044-28290000)"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              onBlur={validate}
              error={errors.phone}
              icon={<Phone size={16} />}
              disabled={phoneAuth}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                id="reg-city"
                label="District (Tamil Nadu)"
                options={[
                  { value: '', label: 'Select your Tamil Nadu district...' },
                  ...cityOptions,
                ]}
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                error={errors.city}
                required
              />
              <Select
                id="reg-blood-group"
                label="Blood Group"
                options={bgOptions}
                placeholder="Select group"
                value={form.bloodGroup}
                onChange={(e) => setField('bloodGroup', e.target.value)}
                error={errors.bloodGroup}
                required
              />
            </div>

            <Button
              id="reg-submit"
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              className="mt-2"
            >
              Create Account
            </Button>
          </form>

          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-surface-700/80 w-full" />
            <span className="bg-surface-950 px-3 text-xs text-muted font-medium uppercase tracking-wider absolute">Or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-sm bg-surface-800 border border-surface-600/70 text-white hover:bg-surface-700 hover:border-surface-500 transition-all cursor-pointer shadow-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          <p className="text-center text-sm text-muted mt-5">
            Already have an account?{' '}
            <Link
              to={ROUTES.LOGIN}
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
