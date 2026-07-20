import React, { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Droplets } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ROUTES } from '@/core/constants/routes';

// ── Firebase error → human-readable message ───────────────────
function parseFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-credential':     'Invalid email or password.',
    'auth/user-disabled':          'Your account has been disabled. Contact support.',
    'auth/too-many-requests':      'Too many failed attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] ?? 'An unexpected error occurred. Please try again.';
}

// ── Stats for the hero panel ──────────────────────────────────
const HERO_STATS = [
  { value: '2,400+', label: 'Verified Donors' },
  { value: '380+',   label: 'Active Camps' },
  { value: '12,000+',label: 'Lives Saved' },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const { showError } = useToast();
  const navigate  = useNavigate();
  const location  = useLocation();

  const from = (location.state as { from?: Location })?.from?.pathname ?? ROUTES.DASHBOARD;

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [emailErr,    setEmailErr]    = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  // ── Validation ───────────────────────────────────────────────
  function validate(): boolean {
    let valid = true;
    if (!email) {
      setEmailErr('Email is required.'); valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Enter a valid email address.'); valid = false;
    } else {
      setEmailErr('');
    }

    if (!password) {
      setPasswordErr('Password is required.'); valid = false;
    } else if (password.length < 6) {
      setPasswordErr('Password must be at least 6 characters.'); valid = false;
    } else {
      setPasswordErr('');
    }
    return valid;
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      showError(parseFirebaseError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex relative">
      {/* Top Right Theme Switcher */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>
      {/* ── Left: Brand Hero ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden
                      bg-gradient-to-br from-surface-900 via-brand-800/20 to-surface-950
                      flex-col items-center justify-center p-12">

        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-brand-700/10 blur-3xl" />

        <div className="relative z-10 max-w-sm text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/30
                            flex items-center justify-center">
              <Droplets size={28} className="text-brand-500" />
            </div>
            <div className="text-left">
              <h1 className="font-display font-bold text-3xl text-white leading-none">
                Blood<span className="text-brand-500">Bridge</span>
              </h1>
              <p className="text-xs text-muted mt-0.5">Bridging Donors and Patients</p>
            </div>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed mb-12">
            A trusted platform connecting blood donors to those in need — through verified camps, real-time matching, and compassionate coordination.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {HERO_STATS.map((s) => (
              <div key={s.label}
                className="bg-surface-800/60 backdrop-blur-sm border border-surface-600/30 rounded-xl p-4">
                <p className="font-display font-bold text-2xl text-brand-400">{s.value}</p>
                <p className="text-xs text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Login Form ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Droplets size={24} className="text-brand-500" />
            <span className="font-display font-bold text-xl text-white">
              Blood<span className="text-brand-500">Bridge</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-3xl text-white mb-2">Welcome back</h2>
            <p className="text-muted text-sm">Sign in to your BloodBridge account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              id="login-email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validate()}
              error={emailErr}
              icon={<Mail size={16} />}
              autoComplete="email"
              required
            />

            <Input
              id="login-password"
              type={showPwd ? 'text' : 'password'}
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => validate()}
              error={passwordErr}
              icon={<Lock size={16} />}
              iconRight={showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              onIconRightClick={() => setShowPwd(!showPwd)}
              autoComplete="current-password"
              required
            />

            <div className="flex justify-end">
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              id="login-submit"
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Don't have an account?{' '}
            <Link
              to={ROUTES.REGISTER}
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
