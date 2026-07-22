import React, { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Droplets } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ROUTES } from '@/core/constants/routes';

function parseFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':         'No account found with this email address. Please register first to access BloodBridge.',
    'auth/invalid-credential':     'No account found with these credentials. Please check your email or register first.',
    'auth/wrong-password':         'Incorrect password. Please check your password or click "Forgot password".',
    'auth/user-disabled':          'Your account has been disabled. Please contact support@bloodbridge.org.',
    'auth/too-many-requests':      'Too many failed sign-in attempts. Please try again in a few minutes.',
    'auth/network-request-failed': 'Network connection error. Please check your internet connection.',
    'auth/unauthorized-domain':    'Google Sign-In Domain Error: Please add your domain (e.g. localhost or vercel app URL) in Firebase Console -> Authentication -> Settings -> Authorized domains.',
    'auth/popup-closed-by-user':   'Google Sign-In popup was closed before completing.',
    'auth/popup-blocked':          'Google Sign-In popup was blocked by your browser settings.',
  };
  return map[code] ?? 'Unable to sign in with Google. Please try again or use email sign in.';
}

// ── Highlights for the hero panel ──────────────────────────────
const HERO_STATS = [
  { value: 'Real-Time',  label: 'Tamil Nadu District Network' },
  { value: 'First-Come', label: 'FCFS Smart Allocation' },
  { value: 'Instant',    label: 'Email & SMS Alerts' },
];

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate  = useNavigate();
  const location  = useLocation();

  const from = (location.state as { from?: Location })?.from?.pathname ?? ROUTES.DASHBOARD;

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailErr,      setEmailErr]      = useState('');
  const [passwordErr,   setPasswordErr]   = useState('');

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      showSuccess('Successfully signed in with Google! 🩸');
      navigate(from, { replace: true });
    } catch (err: any) {
      showError(parseFirebaseError(err?.code || ''));
    } finally {
      setGoogleLoading(false);
    }
  }

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
