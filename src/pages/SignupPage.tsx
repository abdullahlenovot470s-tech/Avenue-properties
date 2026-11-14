import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SafeImage } from '../components/common/SafeImage';
import { HERO_ASSETS } from '../data/realEstateData';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { BRAND_CONFIG } from '../config/brand.config';

// Mask email e.g. "fatima.noor@example.com" -> "fat***@example.com"
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 3) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
}

export const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email verification step states
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | undefined>(undefined);
  const [verifyProvider, setVerifyProvider] = useState<'firebase' | 'server'>('firebase');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [checkingVerification, setCheckingVerification] = useState(false);

  const [googleError, setGoogleError] = useState('');

  const {
    signupWithEmail,
    verifyEmailWithCode,
    loginWithGoogle,
    checkEmailVerified,
    resendVerificationEmail,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Create Account | ${BRAND_CONFIG.identity.brandName}`;
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must acknowledge the terms and privacy covenants.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Google sign in handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setGoogleError('');
    const result = await loginWithGoogle();
    setGoogleLoading(false);

    if (result.success) {
      if (result.isManagement) {
        showToast(`Signed in to ${BRAND_CONFIG.identity.brandShortName} Management.`, 'success');
        navigate('/manage', { replace: true });
      } else {
        showToast(`Welcome to ${BRAND_CONFIG.identity.brandShortName}!`, 'success');
        navigate('/profile', { replace: true });
      }
    } else {
      const msg = result.error || 'Google sign-in could not be completed.';
      setGoogleError(msg);
      showToast(msg, 'error');
    }
  };

  // Email form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const result = await signupWithEmail({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
    setLoading(false);

    if (result.success) {
      const isFirebaseFlow = result.provider === 'firebase';
      setVerifyProvider(isFirebaseFlow ? 'firebase' : 'server');
      setEmailPreviewUrl(result.previewUrl);
      setVerificationCode('');
      setVerifyError('');
      setStep('verify');
      setResendCooldown(60);
      showToast(
        isFirebaseFlow
          ? 'Verification link sent! Check your inbox and click the link to activate your account.'
          : 'Verification email sent! Check your inbox for the 6-digit code.',
        'success'
      );
    } else {
      setErrors((prev) => ({
        ...prev,
        email: result.error || 'Failed to create account.',
      }));
      showToast(result.error || 'Failed to create account.', 'error');
    }
  };

  // Verify using 6-digit code
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');

    if (verificationCode.trim().length < 6) {
      setVerifyError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setVerifyingCode(true);
    const result = await verifyEmailWithCode(formData.email, verificationCode);
    setVerifyingCode(false);

    if (result.success) {
      showToast(`Email verified! Welcome to ${BRAND_CONFIG.identity.brandShortName}.`, 'success');
      navigate('/profile', { replace: true });
    } else {
      setVerifyError(result.error || 'Invalid verification code.');
      showToast(result.error || 'Invalid verification code.', 'error');
    }
  };

  // Check if verified via email link
  const handleVerifyCheck = async () => {
    setCheckingVerification(true);
    const isVerified = await checkEmailVerified(formData.email);
    setCheckingVerification(false);

    if (isVerified) {
      showToast(`Email verified. Welcome to ${BRAND_CONFIG.identity.brandShortName}!`, 'success');
      navigate('/profile', { replace: true });
    } else {
      showToast('Email not yet verified. Enter the 6-digit code or click the link in your email.', 'info');
    }
  };

  // Resend email
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const res = await resendVerificationEmail(formData.email);
    if (res.success) {
      if (res.previewUrl) {
        setEmailPreviewUrl(res.previewUrl);
      }
      setResendCooldown(60);
      showToast('A new verification email has been dispatched.', 'success');
    } else {
      showToast(res.error || 'Could not resend email. Try again shortly.', 'error');
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl bg-white rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl border border-slate-100 grid grid-cols-1 lg:grid-cols-12 min-h-[680px]"
      >
        {/* Left Half: Clean White Form / Verification Card */}
        <div className="lg:col-span-6 p-8 sm:p-12 md:p-14 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {step === 'form' ? (
              <>
                <div className="mb-6">
                  <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block mb-1">
                    {BRAND_CONFIG.copy.auth.signupEyebrow}
                  </span>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-brand uppercase tracking-tight">
                    {BRAND_CONFIG.copy.auth.signupHeading}
                  </h2>
                  <p className="font-body text-xs sm:text-sm text-slate-500 mt-1">
                    {BRAND_CONFIG.copy.auth.signupSubtitle}
                  </p>
                </div>

                {googleError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                    {googleError}
                  </div>
                )}

                {/* 1. Google Button as First Option */}
                {BRAND_CONFIG.features.enableGoogleLogin && (
                  <div className="space-y-4">
                    <GoogleSignInButton
                      onClick={handleGoogleSignIn}
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

                <form onSubmit={handleSubmit} className="space-y-3.5 mt-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={BRAND_CONFIG.locale.placeholderNames.signupName}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none transition-all ${
                          errors.name
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-slate-200 focus:border-accent'
                        }`}
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    {errors.name && (
                      <p className="text-[11px] text-rose-500 font-body mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder={BRAND_CONFIG.locale.placeholderNames.signupEmail}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none transition-all ${
                          errors.email
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-slate-200 focus:border-accent'
                        }`}
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    {errors.email && (
                      <p className="text-[11px] text-rose-500 font-body mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      Password (min. 8 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a secure password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none transition-all ${
                          errors.password
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-slate-200 focus:border-accent'
                        }`}
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-[11px] text-rose-500 font-body mt-1">{errors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-none transition-all ${
                          errors.confirmPassword
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-slate-200 focus:border-accent'
                        }`}
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[11px] text-rose-500 font-body mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Terms Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.agreeTerms}
                        onChange={(e) =>
                          setFormData({ ...formData, agreeTerms: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-300 text-brand focus:ring-accent cursor-pointer"
                      />
                      <span>{BRAND_CONFIG.copy.auth.signupTermsLabel}</span>
                    </label>
                    {errors.agreeTerms && (
                      <p className="text-[11px] text-rose-500 font-body mt-1">
                        {errors.agreeTerms}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-full bg-brand hover:bg-accent text-brand-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.99]"
                    >
                      {loading ? (
                        <span>Sending Verification Email...</span>
                      ) : (
                        <>
                          <span>{BRAND_CONFIG.copy.auth.signupSubmitLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Footer link to Login */}
                <div className="mt-6 text-center text-xs text-slate-500 font-body">
                  <span>Already an {BRAND_CONFIG.identity.brandShortName} client? </span>
                  <Link
                    to="/login"
                    className="font-display uppercase tracking-wider font-bold text-brand hover:text-accent underline underline-offset-4"
                  >
                    Login here
                  </Link>
                </div>
              </>
            ) : (
              /* Step 2: Email Verification Card */
              <div className="space-y-5 py-2 animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7" />
                </div>

                <div className="text-center space-y-2">
                  <span className="text-[10px] font-display uppercase tracking-widest text-emerald-700 font-bold block">
                    Verification Email Dispatched
                  </span>
                  <h3 className="font-display font-extrabold text-2xl uppercase tracking-tight text-brand">
                    Verify Your Email
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-body leading-relaxed max-w-sm mx-auto">
                    {verifyProvider === 'firebase' ? (
                      <>
                        We sent a verification link to{' '}
                        <span className="font-bold text-brand">{maskEmail(formData.email)}</span>. Open your inbox (check spam if needed), click the link, then confirm below.
                      </>
                    ) : (
                      <>
                        We sent a 6-digit code and verification link to{' '}
                        <span className="font-bold text-brand">{maskEmail(formData.email)}</span>.
                      </>
                    )}
                  </p>
                </div>

                {emailPreviewUrl && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-2">
                    <p className="text-[11px] text-brand font-body leading-snug">
                      Email delivered via free Ethereal Mail API. Open the message to copy your 6-digit code or click the verify button:
                    </p>
                    <a
                      href={emailPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent hover:bg-brand text-accent-contrast font-display text-[11px] uppercase tracking-wider font-semibold transition-colors"
                    >
                      <span>Open Verification Email</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {verifyProvider === 'server' && (
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
                      className="w-full py-3.5 px-6 rounded-full bg-brand hover:bg-accent text-brand-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                    >
                      {verifyingCode ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>{verifyingCode ? 'Verifying...' : 'Verify & Activate Account'}</span>
                    </button>
                  </form>
                )}

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleVerifyCheck}
                    disabled={checkingVerification}
                    className={`w-full py-3.5 px-6 rounded-full font-display font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      verifyProvider === 'firebase'
                        ? 'bg-brand hover:bg-accent text-brand-contrast shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-brand font-semibold'
                    }`}
                  >
                    {checkingVerification ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>
                      {checkingVerification
                        ? 'Checking Verification...'
                        : "I've verified my email"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="w-full py-2.5 px-6 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-display font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {resendCooldown > 0
                      ? `Resend email in ${resendCooldown}s`
                      : 'Resend verification email'}
                  </button>
                </div>

                <div className="pt-2 text-center space-y-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="text-xs font-display uppercase tracking-wider text-accent hover:underline cursor-pointer"
                  >
                    Change email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Half: Villa Showcase with Quote Card */}
        <div className="lg:col-span-6 relative hidden lg:flex overflow-hidden p-8 sm:p-10 flex-col justify-between">
          <div className="absolute inset-0 z-0">
            <SafeImage
              src={HERO_ASSETS.approachWalkway}
              alt={`${BRAND_CONFIG.identity.brandShortName} Luxury Villa Architecture`}
              className="w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand/30 to-transparent" />
          </div>

          <div className="relative z-10 flex items-center justify-between text-white">
            <Link to="/" className="font-display font-bold text-2xl tracking-tighter text-white">
              {BRAND_CONFIG.identity.logoText}
            </Link>
            <span className="text-[10px] font-display uppercase tracking-widest text-white/70 glass-card-subtle px-3 py-1 rounded-full">
              {BRAND_CONFIG.copy.auth.signupShowcaseBadge}
            </span>
          </div>

          <div className="relative z-10 glass-panel rounded-3xl p-6 text-white border border-white/20 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-display uppercase tracking-widest text-[10px] text-white/80">
                Direct Principal Security
              </span>
            </div>
            <p className="font-display font-bold text-xl sm:text-2xl tracking-tight text-white leading-snug">
              {BRAND_CONFIG.copy.auth.signupQuote}
            </p>
            <p className="font-body text-xs text-white/70 mt-2">
              {BRAND_CONFIG.copy.auth.signupQuoteSubtext}
            </p>
          </div>
        </div>
      </motion.div>

    </div>
  );
};
