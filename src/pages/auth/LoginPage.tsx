import React, { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Droplets, Phone } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ROUTES } from '@/core/constants/routes';

function parseFirebaseError(code: string): string {
  const map: Record<string, string> = {
    'auth/user-not-found':            'No account found with this email address. Please register first to access BloodBridge.',
    'auth/invalid-credential':        'No account found with these credentials. Please check your email or register first.',
    'auth/wrong-password':            'Incorrect password. Please check your password or click "Forgot password".',
    'auth/user-disabled':             'Your account has been disabled. Please contact support@bloodbridge.org.',
    'auth/too-many-requests':         'Too many failed sign-in attempts. Please try again in a few minutes.',
    'auth/network-request-failed':    'Network connection error. Please check your internet connection.',
    'auth/unauthorized-domain':       'Domain not authorized in Firebase Console.',
    'auth/popup-closed-by-user':      'Sign-In popup was closed before completing.',
    'auth/popup-blocked':             'Sign-In popup was blocked by your browser settings.',
    'auth/invalid-phone-number':      'Invalid phone number format. Please include country code (e.g., +91).',
    'auth/invalid-verification-code': 'The OTP entered is incorrect or has expired.',
    'auth/missing-verification-code': 'Please enter the 6-digit OTP.',
    'auth/quota-exceeded':            'SMS quota exceeded. Please try again later or use email sign-in.',
    'auth/billing-not-enabled':       'Phone authentication requires Firebase Billing to be enabled. Please check console.',
    'auth/operation-not-allowed':     'SMS sending is blocked for this region. Please enable the region in Firebase Console -> Authentication -> Settings -> SMS Region Policy.',
    'auth/invalid-app-credential':    'reCAPTCHA verification failed. If testing locally, use a test number or deploy to a live URL.',
  };
  
  console.error('[Firebase Error Code]:', code);
  
  return map[code] ?? 'Authentication failed. Please verify your details and try again.';
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

  const [loginMethod,   setLoginMethod]   = useState<'email' | 'phone'>('email');
  
  // Email State
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [emailErr,      setEmailErr]      = useState('');
  const [passwordErr,   setPasswordErr]   = useState('');

  // Phone State
  const [phoneNumber,   setPhoneNumber]   = useState('');
  const [phoneErr,      setPhoneErr]      = useState('');
  const [otp,           setOtp]           = useState('');
  const [otpErr,        setOtpErr]        = useState('');
  const [otpSent,       setOtpSent]       = useState(false);
  const [confResult,    setConfResult]    = useState<any>(null);

  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
  function validateEmail(): boolean {
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

  function validatePhone(): boolean {
    let valid = true;
    if (!phoneNumber) {
      setPhoneErr('Phone number is required.'); valid = false;
    } else if (!/^\+\d{10,15}$/.test(phoneNumber)) {
      setPhoneErr('Enter a valid number with country code (e.g. +919876543210).'); valid = false;
    } else {
      setPhoneErr('');
    }
    return valid;
  }

  // ── Submit Handlers ──────────────────────────────────────────
  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateEmail()) return;
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

  async function handleSendOtp() {
    if (!validatePhone()) return;
    
    setLoading(true);
    try {
      const { setupRecaptcha, sendPhoneOtp } = await import('@/services/auth.service');
      
      // Clear old verifier to avoid detached DOM element errors in React
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear(); } catch {}
      }
      
      const verifier = setupRecaptcha('recaptcha-container');
      (window as any).recaptchaVerifier = verifier;

      const result = await sendPhoneOtp(phoneNumber, verifier);
      setConfResult(result);
      setOtpSent(true);
      showSuccess('OTP sent successfully via SMS.');
    } catch (err: any) {
      console.error('[Full Phone Auth Error]:', err);
      showError(parseFirebaseError(err?.code || '') || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length < 6) {
      setOtpErr('Enter a valid 6-digit OTP.');
      return;
    }
    setOtpErr('');
    setLoading(true);
    try {
      const { verifyPhoneOtp } = await import('@/services/auth.service');
      const { isNewUser } = await verifyPhoneOtp(confResult, otp);
      if (isNewUser) {
        showSuccess('Phone verified! Please complete your profile.');
        // We now route to the dashboard, and the CompleteProfileModal will float on top!
        navigate(from, { replace: true });
      } else {
        showSuccess('Successfully signed in! 🩸');
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      showError(parseFirebaseError(err?.code || '') || 'Invalid OTP.');
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

          <div className="relative flex p-1.5 bg-surface-950/40 backdrop-blur-xl rounded-2xl mb-8 ring-1 ring-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
            {/* Animated Background Pill */}
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl shadow-lg shadow-brand-500/30 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
                loginMethod === 'email' ? 'left-1.5' : 'left-[calc(50%+4.5px)]'
              }`}
            />
            
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`relative flex-1 py-2.5 text-sm font-bold tracking-wide rounded-xl cursor-pointer transition-colors duration-300 z-10 ${
                loginMethod === 'email' ? 'text-white text-shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`relative flex-1 py-2.5 text-sm font-bold tracking-wide rounded-xl cursor-pointer transition-colors duration-300 z-10 ${
                loginMethod === 'phone' ? 'text-white text-shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Phone Number
            </button>
          </div>

          <div id="recaptcha-container"></div>

          {loginMethod === 'email' ? (
            <form onSubmit={handleEmailSubmit} noValidate className="flex flex-col gap-5">
              <Input
                id="login-email"
                type="email"
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => validateEmail()}
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
                onBlur={() => validateEmail()}
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
          ) : (
            <div className="flex flex-col gap-5">
              {!otpSent ? (
                <>
                  <Input
                    id="login-phone"
                    type="tel"
                    label="Phone Number"
                    placeholder="+919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onBlur={() => validatePhone()}
                    error={phoneErr}
                    icon={<Phone size={16} />}
                    autoComplete="tel"
                    required
                  />
                  <Button
                    onClick={handleSendOtp}
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                  >
                    Send OTP
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    id="login-otp"
                    type="text"
                    label="Enter 6-digit OTP"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    error={otpErr}
                    icon={<Lock size={16} />}
                    required
                  />
                  <Button
                    onClick={handleVerifyOtp}
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                  >
                    Verify & Sign In
                  </Button>
                  <div className="text-center mt-2">
                    <button 
                      type="button" 
                      onClick={() => setOtpSent(false)} 
                      className="text-sm text-muted hover:text-white transition-colors"
                    >
                      Change Phone Number
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

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
