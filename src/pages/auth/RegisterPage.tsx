import React, { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Phone, Droplets } from 'lucide-react';
import { get, ref } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/core/constants/routes';
import { checkEmailExists } from '@/services/user.service';

import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';
import { CITY_OPTIONS } from '@/core/constants/indianCities';

const cityOptions = CITY_OPTIONS;

function parseFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':   'This email ID already exists in our system. Please sign in to your existing account.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password is too weak. Please use at least 8 characters.',
    'auth/network-request-failed': 'Network connection error. Please check your internet connection.',
    'auth/too-many-requests':      'Too many registration attempts. Please try again later.',
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
  const { signUp } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const navigate = useNavigate();

  const [form,     setForm]     = useState<FormState>({
    displayName: '', email: '', password: '', confirmPassword: '',
    phone: '', city: '', bloodGroup: '',
  });
  const [errors,   setErrors]   = useState<FormErrors>({});
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
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

    if (!form.email)                              errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email.';

    if (!form.password)                           errs.password = 'Password is required.';
    else if (form.password.length < 8)            errs.password = 'Password must be at least 8 characters.';

    if (!form.confirmPassword)                    errs.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';

    if (!form.phone)                              errs.phone = 'Phone number is required.';
    else if (!/^(\+91)?[6-9]\d{9}$/.test(form.phone.replace(/\s/g, '')))
      errs.phone = 'Enter a valid Indian mobile number.';

    if (!form.city.trim())                        errs.city = 'City is required.';
    if (!form.bloodGroup)                         errs.bloodGroup = 'Please select your blood group.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(form.email, form.password, {
        displayName: form.displayName.trim(),
        phone:       form.phone.replace(/\s/g, ''),
        city:        form.city.trim(),
        bloodGroup:  form.bloodGroup,
      });
      showSuccess('Account created successfully! Welcome to BloodBridge.');
      navigate(ROUTES.DASHBOARD, { replace: true });
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
            <h2 className="font-display font-bold text-2xl text-white mb-1">Create your account</h2>
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

            <Input
              id="reg-phone"
              type="tel"
              label="Phone Number"
              placeholder="+91 9876543210"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              onBlur={validate}
              error={errors.phone}
              icon={<Phone size={16} />}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                id="reg-city"
                label="City"
                options={[
                  { value: '', label: 'Select your city...' },
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
