import React, { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Droplets, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/core/constants/routes';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email,     setEmail]     = useState('');
  const [emailErr,  setEmailErr]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    if (!email) {
      setEmailErr('Email is required.'); return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Enter a valid email address.'); return false;
    }
    setEmailErr('');
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await resetPassword(email);
    } catch {
      // Intentionally suppress error — always show generic success
      // (prevents email enumeration attacks per AC-FP01)
    } finally {
      setLoading(false);
      setSubmitted(true);  // Always transition to success state
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <Droplets size={24} className="text-brand-500" />
          <span className="font-display font-bold text-xl text-white">
            Blood<span className="text-brand-500">Bridge</span>
          </span>
        </div>

        <div className="bg-surface-800 border border-surface-600/40 rounded-2xl p-8">
          {submitted ? (
            // ── Success State ────────────────────────────────
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20
                              flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-success" />
              </div>
              <h2 className="font-display font-bold text-2xl text-white mb-2">Check your inbox</h2>
              <p className="text-muted text-sm mb-6">
                If <span className="text-slate-300">{email}</span> is registered, you'll receive a password reset link shortly.
              </p>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors text-sm font-medium"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            // ── Form State ───────────────────────────────────
            <>
              <div className="mb-6">
                <h2 className="font-display font-bold text-2xl text-white mb-1">Reset password</h2>
                <p className="text-muted text-sm">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <Input
                  id="forgot-email"
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={validate}
                  error={emailErr}
                  icon={<Mail size={16} />}
                  autoComplete="email"
                  required
                />

                <Button
                  id="forgot-submit"
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Send Reset Link
                </Button>
              </form>

              <div className="text-center mt-5">
                <Link
                  to={ROUTES.LOGIN}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
