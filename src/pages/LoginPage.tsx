import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SafeImage } from '../components/common/SafeImage';
import { HERO_ASSETS } from '../data/realEstateData';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { BRAND_CONFIG } from '../config/brand.config';

// Mask email e.g. "ahmed.raza@example.com" -> "ahm***@example.com"
function maskEmail(emailStr: string): string {
  if (!emailStr || !emailStr.includes('@')) return emailStr;
  const [local, domain] = emailStr.split('@');
  if (local.length <= 3) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Unverified state handling
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedProvider, setUnverifiedProvider] = useState<'firebase' | 'server'>('firebase');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifyPreviewUrl, setVerifyPreviewUrl] = useState<string | undefined>(undefined);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Forgot password modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset' | 'done'>('request');
  const [forgotProvider, setForgotProvider] = useState<'firebase' | 'server'>('firebase');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotPreviewUrl, setForgotPreviewUrl] = useState<string | undefined>(undefined);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const {
    loginWithEmail,
    loginWithGoogle,
    verifyEmailWithCode,
    checkEmailVerified,
    resendVerificationEmail,
    sendPasswordReset,
    confirmPasswordResetWithCode,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const shortBrand = BRAND_CONFIG.identity.brandShortName;
  const from = (location.state as any)?.from?.pathname || '/profile';

  React.useEffect(() => {
    document.title = `Client Login | ${BRAND_CONFIG.identity.brandName}`;
  }, []);

  // Cooldown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Google Sign In
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    const result = await loginWithGoogle();
    setGoogleLoading(false);

    if (result.success) {
      const hasExplicitFrom = Boolean((location.state as any)?.from?.pathname);
      if (result.isManagement) {
        showToast(`Signed in to ${shortBrand} Management.`, 'success');
        navigate(hasExplicitFrom ? from : '/manage', { replace: true });
      } else {
        showToast(`${BRAND_CONFIG.locale.greeting}! Welcome back to ${shortBrand}.`, 'success');
        navigate(from, { replace: true });
      }
    } else {
      const msg = result.error || 'Google sign-in could not be completed.';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  // Email/Password submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both your email and password.');
      return;
    }

    setLoading(true);
    const result = await loginWithEmail(email, password, rememberMe);
    setLoading(false);

    if (result.success) {
      const hasExplicitFrom = Boolean((location.state as any)?.from?.pathname);
      if (result.isManagement) {
        showToast(`Signed in to ${shortBrand} Management.`, 'success');
        navigate(hasExplicitFrom ? from : '/manage', { replace: true });
      } else {
        showToast(`${BRAND_CONFIG.locale.greeting}! Welcome back to ${shortBrand}.`, 'success');
        navigate(from, { replace: true });
      }
    } else if (result.unverified) {
      setIsUnverified(true);
      setUnverifiedProvider(result.provider === 'firebase' ? 'firebase' : 'server');
      setVerificationCode('');
      setVerifyError('');
      setResendCooldown(0);
      showToast('Please verify your email before signing in.', 'info');
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  // Verify with 6-digit code
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');

    if (verificationCode.trim().length < 6) {
      setVerifyError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setVerifyingCode(true);
    const res = await verifyEmailWithCode(email, verificationCode);
    setVerifyingCode(false);

    if (res.success) {
      showToast(`Email verified successfully! Welcome to ${shortBrand}.`, 'success');
      setIsUnverified(false);
      navigate(from, { replace: true });
    } else {
      setVerifyError(res.error || 'Invalid verification code.');
      showToast(res.error || 'Invalid verification code.', 'error');
    }
  };

  // Re-check verification via link click
  const handleVerifyCheck = async () => {
    setCheckingVerification(true);
    const verified = await checkEmailVerified(email);
    setCheckingVerification(false);

    if (verified) {
      showToast(`Email verified successfully! Welcome to ${shortBrand}.`, 'success');
      setIsUnverified(false);
      navigate(from, { replace: true });
    } else {
      showToast('Email not yet verified. Enter the 6-digit code or click the link in your inbox.', 'info');
    }
  };

  // Resend verification
  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    const res = await resendVerificationEmail(email);
    if (res.success) {
      if (res.previewUrl) {
        setVerifyPreviewUrl(res.previewUrl);
      }
      setResendCooldown(60);
      showToast('A new verification email has been sent.', 'success');
    } else {
      showToast(res.error || 'Could not resend verification email.', 'error');
    }
  };

  // Open Forgot Password Modal
  const openForgotModal = () => {
    setForgotEmail(email);
    setForgotError('');
    setForgotStep('request');
    setForgotPreviewUrl(undefined);
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowForgotPassword(true);
  };

  // Step 1: Send Password Reset Code
  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    const result = await sendPasswordReset(forgotEmail);
    setForgotLoading(false);

    if (result.success) {
      setForgotProvider(result.provider === 'firebase' ? 'firebase' : 'server');
      setForgotPreviewUrl(result.previewUrl);
      setForgotStep('reset');
      showToast(
        result.message ||
          'If an account exists for that email address, password reset instructions have been sent.',
        'success'
      );
    } else {
      setForgotError(result.error || 'Could not send password reset email.');
      showToast(result.error || 'Could not send password reset email.', 'error');
    }
  };

  // Step 2: Confirm Password Reset with 6-digit Code
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (resetCode.trim().length < 6) {
      setForgotError('Enter the 6-digit reset code from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setResettingPassword(true);
    const result = await confirmPasswordResetWithCode(forgotEmail, resetCode, newPassword);
    setResettingPassword(false);

    if (result.success) {
      setForgotStep('done');
      setEmail(forgotEmail);
      setPassword('');
      showToast('Password updated! You can now sign in.', 'success');
    } else {
      setForgotError(result.error || 'Could not reset password.');
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl bg-white rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl border border-slate-100 grid grid-cols-1 lg:grid-cols-12 min-h-[640px]"
      >
        {/* Left Half: Villa Visual with Glass Quote Card */}
        <div className="lg:col-span-6 relative hidden lg:flex overflow-hidden p-8 sm:p-10 flex-col justify-between">
          <div className="absolute inset-0 z-0">
            <SafeImage
              src={HERO_ASSETS.authVilla}
              alt={`${shortBrand} Luxury Villa Architecture`}
              className="w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand/30 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center justify-between text-white">
            <Link to="/" className="font-display font-bold text-2xl tracking-tighter text-white">
              {BRAND_CONFIG.identity.logoText}
            </Link>
            <span className="text-[10px] font-display uppercase tracking-widest text-white/70 glass-card-subtle px-3 py-1 rounded-full">
              {BRAND_CONFIG.copy.auth.loginShowcaseBadge}
            </span>
          </div>

          <div className="relative z-10 glass-panel rounded-3xl p-6 text-white border border-white/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-display uppercase tracking-widest text-[10px] text-white/80">
                Verified Client Privacy
              </span>
            </div>
            <p className="font-display font-bold text-xl sm:text-2xl tracking-tight text-white leading-snug">
              {BRAND_CONFIG.copy.auth.loginQuote}
            </p>
            <p className="font-body text-xs text-white/70 mt-2">
              {BRAND_CONFIG.copy.auth.loginQuoteAuthor}
            </p>
          </div>
        </div>

        {/* Right Half: Form or Unverified State Card */}
        <div className="lg:col-span-6 p-8 sm:p-12 md:p-14 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {isUnverified ? (
              /* Unverified Email Screen */
              <div className="space-y-5 py-2 animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7" />
                </div>

                <div className="text-center space-y-2">
                  <span className="text-[10px] font-display uppercase tracking-widest text-amber-700 font-bold block">
                    Verification Required
                  </span>
                  <h3 className="font-display font-extrabold text-2xl uppercase tracking-tight text-brand">
                    Verify Your Email
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-body leading-relaxed max-w-sm mx-auto">
                    Your account{' '}
                    <span className="font-bold text-brand">{maskEmail(email)}</span> is awaiting verification.{' '}
                    {unverifiedProvider === 'firebase'
                      ? 'Click the verification link sent to your inbox, or resend a fresh link below.'
                      : 'Enter the 6-digit code from your email or resend a fresh link below.'}
                  </p>
                </div>

                {verifyPreviewUrl && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-2">
                    <p className="text-[11px] text-brand font-body leading-snug">
                      Email delivered via free Ethereal Mail API:
                    </p>
                    <a
                      href={verifyPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-accent-contrast hover:bg-brand hover:text-brand-contrast font-display text-[11px] uppercase tracking-wider font-semibold transition-colors"
                    >
                      <span>Open Verification Email</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {unverifiedProvider === 'server' && (
                  <form onSubmit={handleVerifyCodeSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1.5 text-center">
                        Enter 6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-accent focus:outline-none text-center font-mono text-xl font-bold tracking-[0.4em] text-brand"
                      />
                      {verifyError && (
                        <p className="text-[11px] text-rose-500 font-body mt-1.5 text-center">
                          {verifyError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={verifyingCode}
                      className="w-full py-3.5 px-6 rounded-full bg-brand text-brand-contrast hover:bg-accent hover:text-accent-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      {verifyingCode ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>{verifyingCode ? 'Verifying...' : 'Verify & Sign In'}</span>
                    </button>
                  </form>
                )}

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleVerifyCheck}
                    disabled={checkingVerification}
                    className={`w-full py-3 px-6 rounded-full font-display text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      unverifiedProvider === 'firebase'
                        ? 'bg-brand text-brand-contrast hover:bg-accent hover:text-accent-contrast font-bold shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-brand font-semibold'
                    }`}
                  >
                    {checkingVerification && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>I've verified my email</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendCooldown > 0}
                    className="w-full py-2.5 px-6 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-display font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {resendCooldown > 0
                      ? `Resend email in ${resendCooldown}s`
                      : 'Resend verification email'}
                  </button>
                </div>

                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsUnverified(false)}
                    className="text-xs font-display uppercase tracking-wider text-accent hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              /* Regular Sign In Screen */
              <>
                <div className="mb-6">
                  <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block mb-1">
                    {BRAND_CONFIG.copy.auth.loginEyebrow}
                  </span>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-brand uppercase tracking-tight">
                    {BRAND_CONFIG.copy.auth.loginHeading}
                  </h2>
                  <p className="font-body text-xs sm:text-sm text-slate-500 mt-1">
                    {BRAND_CONFIG.copy.auth.loginSubtitle}
                  </p>
                </div>

                {error && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                    {error}
                  </div>
                )}

                {/* 1. Continue with Google Button */}
                {BRAND_CONFIG.features.enableGoogleLogin && (
                  <div className="space-y-4">
                    <GoogleSignInButton
                      onClick={handleGoogleLogin}
                      loading={googleLoading}
                      text="Continue with Google"
                    />

                    {/* Divider */}
                    <div className="relative flex items-center justify-center">
                      <div className="w-full border-t border-slate-200" />
                      <span className="absolute bg-white px-3 text-[11px] font-display uppercase tracking-wider text-slate-400">
                        or continue with email
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Email / Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4 mt-5">
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder={BRAND_CONFIG.locale.placeholderNames.inquiryEmail}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-accent focus:bg-white transition-all"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={openForgotModal}
                        className="text-[11px] font-semibold font-body text-accent hover:text-brand hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-accent focus:bg-white transition-all"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-brand border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 font-body">Remember this workstation</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-full bg-brand text-brand-contrast hover:bg-accent hover:text-accent-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-between group cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                    >
                      <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                      <span className="w-6 h-6 rounded-full bg-white text-brand flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  </div>

                  <div className="pt-4 text-center">
                    <span className="text-xs text-slate-500 font-body">
                      Don't have an account?{' '}
                      <Link
                        to="/signup"
                        className="font-display uppercase tracking-wider text-xs font-bold text-brand hover:text-accent"
                      >
                        {BRAND_CONFIG.copy.auth.loginFooterCta}
                      </Link>
                    </span>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-blue-50 text-accent flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="font-display font-extrabold text-xl text-brand uppercase tracking-tight">
              Reset Password
            </h3>

            {forgotError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                {forgotError}
              </div>
            )}

            {forgotStep === 'request' && (
              <>
                <p className="text-xs text-slate-500 font-body mt-1">
                  Enter your registered email address to receive a 6-digit password reset code.
                </p>
                <form onSubmit={handleSendReset} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder={`e.g. ${BRAND_CONFIG.locale.placeholderNames.loginEmail}`}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 text-xs font-display uppercase tracking-wider font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-3 rounded-full bg-brand text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold hover:bg-accent hover:text-accent-contrast cursor-pointer disabled:opacity-60"
                    >
                      {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {forgotStep === 'reset' && forgotProvider === 'firebase' && (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed">
                  If an account exists for <strong>{forgotEmail}</strong>, a Firebase password reset link has been sent to your inbox (check spam if needed). Open the link to choose a new password, then return here to sign in.
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-3 rounded-full bg-brand text-brand-contrast hover:bg-accent hover:text-accent-contrast font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            )}

            {forgotStep === 'reset' && forgotProvider === 'server' && (
              <>
                <p className="text-xs text-slate-500 font-body mt-1">
                  If an account exists for <strong>{forgotEmail}</strong>, a 6-digit reset code has been sent. Enter the code and your new password below.
                </p>

                {forgotPreviewUrl && (
                  <div className="mt-4 p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-1.5">
                    <p className="text-[11px] text-brand font-body">
                      Reset code email delivered via Ethereal Mail API:
                    </p>
                    <a
                      href={forgotPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent text-accent-contrast hover:bg-brand hover:text-brand-contrast font-display text-[10px] uppercase tracking-wider font-semibold transition-colors"
                    >
                      <span>Open Reset Email</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <form onSubmit={handleConfirmReset} className="mt-4 space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      6-Digit Reset Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-center font-mono text-lg font-bold tracking-[0.35em] bg-slate-50 focus:bg-white focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      New Password (min. 8 characters)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('request')}
                      className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 text-xs font-display uppercase tracking-wider font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={resettingPassword}
                      className="flex-1 py-3 rounded-full bg-brand text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold hover:bg-accent hover:text-accent-contrast cursor-pointer disabled:opacity-60"
                    >
                      {resettingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {forgotStep === 'done' && (
              <div className="mt-5 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed">
                  Your password for <strong>{forgotEmail}</strong> has been updated. You may now sign in with your new password.
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-3 rounded-full bg-brand text-brand-contrast hover:bg-accent hover:text-accent-contrast font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
