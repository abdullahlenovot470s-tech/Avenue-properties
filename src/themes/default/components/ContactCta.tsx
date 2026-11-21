import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Send, PhoneCall } from 'lucide-react';
import { SITE_CONFIG, handleDemoContactClick, isValidContactPhone } from '../../../config/siteConfig';
import { BRAND_CONFIG } from '../../../config/brand.config';
import { useToast } from '../../../context/ToastContext';
import { submitInquiry } from '../../../lib/inquiriesApi';
import { trackEvent } from '../../../lib/analytics';
import {
  buildSpamCheckPayload,
  createSpamChallenge,
  validateSpamCheckAndContent,
} from '../../../lib/spamProtection';
import { SpamChallengeField } from '../../../components/common/SpamChallengeField';
import { sendEnquiryToWebhook, isEnquiryWebhookConfigured } from '../../../services/enquiryWebhook';
import { useLanguage } from '../../../context/LanguageContext';
import { URGLISH_COPY } from '../../../data/urglishTranslations';
import { useRevealFallback } from '../../../lib/useAnimationFallback';

export const ContactCta: React.FC = () => {
  const { showToast } = useToast();
  const { t, isUrglish } = useLanguage();
  const { forceVisible, markCompleted } = useRevealFallback(1200);
  const [ctaBgSrc, setCtaBgSrc] = useState<string>(BRAND_CONFIG.images.cta);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [website, setWebsite] = useState('');
  const [spamChallenge, setSpamChallenge] = useState(() => createSpamChallenge());
  const [challengeAnswer, setChallengeAnswer] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (website.trim()) {
      return;
    }
    setError('');

    if (!formData.name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }

    if (!isValidContactPhone(formData.phone)) {
      setError(SITE_CONFIG.forms.phoneErrorMessage);
      return;
    }

    const spamCheck = buildSpamCheckPayload(spamChallenge, challengeAnswer, website);
    const localSpam = validateSpamCheckAndContent({
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      office: 'General Advisory',
      subject: 'Homepage Quick Question',
      message: 'Submitted via homepage quick contact form.',
      spamCheck,
      requireChallenge: true,
    });
    if (!localSpam.valid) {
      setError(localSpam.error || 'Please complete the human verification check.');
      return;
    }

    const isWebhookOnly = BRAND_CONFIG.features.enquiryDelivery === 'webhook';
    setLoading(true);
    try {
      const res = await submitInquiry({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        office: 'General Advisory',
        subject: 'Homepage Quick Question',
        message: 'Submitted via homepage quick contact form.',
        source: 'Home Quick Contact',
        spamCheck,
      });

      if (res.success || (!isWebhookOnly && res.unreachable && isEnquiryWebhookConfigured())) {
        const webhookPayload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          city: 'General Advisory',
          interest: 'Homepage Quick Question',
          budget: '',
          message: 'Submitted via homepage quick contact form.',
          source: "Let's Talk" as const,
          website: '',
        };
        if (isWebhookOnly) {
          const webhookRes = await sendEnquiryToWebhook(webhookPayload);
          if (webhookRes.skipped) {
            setError(
              'Online enquiry delivery is not configured right now. Please contact us via WhatsApp or telephone.'
            );
            return;
          }
          setSubmitted(true);
          setSpamChallenge(createSpamChallenge());
          setChallengeAnswer('');
          showToast(
            webhookRes.queued
              ? 'You appear offline — inquiry queued and will send automatically once connected.'
              : 'Inquiry submitted! Our partner will connect shortly.',
            webhookRes.queued ? 'info' : 'success'
          );
          return;
        }
        void sendEnquiryToWebhook(webhookPayload);
        setSubmitted(true);
        setSpamChallenge(createSpamChallenge());
        setChallengeAnswer('');
        showToast('Inquiry submitted! Our partner will connect shortly.', 'success');
      } else {
        setError(res.error || 'Could not submit inquiry. Please try again.');
      }
    } catch {
      setError('Could not submit inquiry right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="contact"
      className="below-fold-section relative w-full py-3 md:py-6 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto"
    >
      <div className="relative w-full rounded-2xl md:rounded-[32px] overflow-hidden p-4 md:p-8 text-white shadow-2xl flex flex-col justify-center bg-brand">
        <div className="absolute inset-0 z-0">
          <img
            src={ctaBgSrc}
            alt="Luxury mountain residence at dusk"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => {
              if (ctaBgSrc !== BRAND_CONFIG.images.hero) {
                setCtaBgSrc(BRAND_CONFIG.images.hero);
              }
            }}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-brand-dark/85" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/95 via-brand/70 to-brand-deep/85" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={forceVisible ? { opacity: 1, y: 0 } : undefined}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onAnimationComplete={markCompleted}
            style={forceVisible ? { opacity: 1, transform: 'none' } : undefined}
            className="lg:col-span-6 w-full max-w-lg min-w-0"
          >
            <div className="max-md:bg-transparent max-md:border-x-0 max-md:border-t-0 max-md:border-b max-md:border-white/20 max-md:rounded-none max-md:shadow-none max-md:p-0 max-md:pb-4 bg-white/10 rounded-3xl p-4 md:p-6 text-white shadow-2xl border border-white/20">
              <span className="text-[10px] font-display uppercase tracking-widest text-white/70 block mb-1">
                {BRAND_CONFIG.copy.contactCta.eyebrow}
              </span>
              <h3 className="font-display font-bold md:font-extrabold text-[clamp(1.05rem,3.6vw,1.25rem)] md:text-2xl uppercase tracking-tight text-white mb-3 md:mb-4">
                {BRAND_CONFIG.copy.contactCta.heading}
              </h3>

              {submitted ? (
                <div className="py-6 text-center space-y-3 animate-in fade-in duration-300">
                  <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400 rounded-full flex items-center justify-center mx-auto text-emerald-300">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-display font-bold text-lg text-white uppercase">
                    Inquiry Received
                  </h4>
                  <p className="text-xs text-white/80 leading-relaxed font-body">
                    {BRAND_CONFIG.copy.contactCta.greeting},{' '}
                    <span className="font-semibold text-white">{formData.name}</span>.{' '}
                    {isUrglish ? (
                      <>
                        {BRAND_CONFIG.identity.brandShortName} ka managing partner {URGLISH_COPY.contactCta.confirmationSuffix}
                      </>
                    ) : (
                      <>
                        A {BRAND_CONFIG.identity.brandShortName} managing partner will contact you directly within 2 business hours.
                      </>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setError('');
                      setSpamChallenge(createSpamChallenge());
                      setChallengeAnswer('');
                      setFormData({ name: '', email: '', phone: '' });
                    }}
                    className="text-xs font-display uppercase tracking-wider text-white/80 hover:text-white underline underline-offset-4 pt-1 cursor-pointer"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-3">
                  <input
                    type="text"
                    name="contact_hp_ref"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    aria-hidden="true"
                    className="absolute -left-[9999px] w-px h-px overflow-hidden opacity-0 pointer-events-none"
                  />
                  {error && (
                    <div className="text-xs text-rose-300 bg-rose-500/20 border border-rose-400/30 px-3 py-2 rounded-xl">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="min-w-0">
                      <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder={BRAND_CONFIG.locale.placeholderNames.inquiryName}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full min-w-0 min-h-[42px] px-3 sm:px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder={BRAND_CONFIG.locale.placeholderNames.inquiryEmail}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full min-w-0 min-h-[42px] px-3 sm:px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder={SITE_CONFIG.forms.phonePlaceholder}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full min-h-[42px] px-3 sm:px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
                    />
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex flex-row sm:flex-col items-stretch gap-2 sm:gap-3 min-w-0">
                      <div className="min-w-0 flex-[1.25] sm:flex-none [&>div]:flex-nowrap max-sm:[&>div]:px-2 max-sm:[&>div]:py-1.5 max-sm:[&>div]:gap-1 max-sm:[&_label]:gap-1 max-sm:[&_label]:text-[10px] max-sm:[&_label>span]:text-[10px] max-sm:[&_label>span:last-child]:text-xs max-sm:[&_svg]:w-3.5 max-sm:[&_svg]:h-3.5 max-sm:[&_input]:w-10 max-sm:[&_input]:px-1 max-sm:[&_input]:py-1 max-sm:[&_input]:text-xs max-sm:[&_button]:w-6 max-sm:[&_button]:h-6 sm:[&>div]:px-3 sm:[&>div]:py-2 sm:[&>div]:gap-2">
                        <SpamChallengeField
                          challenge={spamChallenge}
                          answer={challengeAnswer}
                          onAnswerChange={(val) => {
                            setError('');
                            setChallengeAnswer(val);
                          }}
                          onRefresh={() => {
                            setError('');
                            setSpamChallenge(createSpamChallenge());
                            setChallengeAnswer('');
                          }}
                          variant="dark"
                        />
                      </div>

                      <div className="flex-1 sm:flex-none sm:pt-1 min-w-0 flex items-stretch">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full min-h-[42px] py-2 sm:py-3 px-2.5 sm:px-6 rounded-full bg-white text-brand font-display font-bold text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-widest hover:bg-surface transition-all shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 leading-tight text-center cursor-pointer disabled:opacity-70 active:scale-98"
                        >
                          {loading ? (
                            <span>Connecting...</span>
                          ) : (
                            <>
                              <span>Submit Inquiry</span>
                              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-white/60 text-center font-body">
                      By submitting, you agree to our{' '}
                      <Link to="/privacy" className="underline underline-offset-2 hover:text-white">
                        Privacy Policy
                      </Link>{' '}
                      &amp;{' '}
                      <Link to="/terms" className="underline underline-offset-2 hover:text-white">
                        Terms
                      </Link>
                      .
                    </p>
                  </div>
                </form>
              )}
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={forceVisible ? { opacity: 1, y: 0 } : undefined}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onAnimationComplete={markCompleted}
            style={forceVisible ? { opacity: 1, transform: 'none' } : undefined}
            className="lg:col-span-6 flex flex-col justify-center items-start lg:items-end text-left lg:text-right min-w-0"
          >
            <span className="text-[10px] sm:text-sm font-display uppercase tracking-widest text-white/60 mb-0.5 sm:mb-1.5 block">
              Confidential Consultation
            </span>

            <div className="w-full flex flex-wrap items-center justify-between gap-2 sm:contents">
              <h2
                className="font-display font-bold md:font-black leading-[0.95] sm:leading-[0.92] tracking-tighter text-white uppercase select-none text-[clamp(1.375rem,4.5vw,1.625rem)] md:text-[clamp(2.25rem,4.5vw,4rem)]"
              >
                LET&apos;S{' '}
                <br className="hidden sm:inline" />
                TALK
              </h2>

              <a
                href={`tel:${SITE_CONFIG.phone.lahore.replace(/[^0-9+]/g, '')}`}
                onClick={(e) => {
                  trackEvent('call_click', { location: 'home_contact_cta' });
                  handleDemoContactClick(e, showToast);
                }}
                className="shrink-0 sm:order-last sm:mt-3.5 md:mt-4 flex items-center gap-1.5 sm:gap-3 glass-card-subtle hover:bg-white/20 transition-all px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-full text-[11px] sm:text-xs text-white/90 cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Call us: {SITE_CONFIG.phone.lahore}</span>
              </a>
            </div>

            <p className="mt-1.5 sm:mt-2.5 md:mt-3 font-body text-xs sm:text-sm text-white/70 max-w-md leading-snug sm:leading-relaxed">
              {t(BRAND_CONFIG.copy.contactCta.intro, URGLISH_COPY.contactCta.intro)}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
