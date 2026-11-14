import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, ShieldCheck, Clock, User, Mail, Phone } from 'lucide-react';
import { PillButton } from '../common/PillButton';
import { BRAND_CONFIG } from '../../config/brand.config';
import { submitInquiry } from '../../lib/inquiriesApi';
import { sendEnquiryToWebhook, isEnquiryWebhookConfigured } from '../../services/enquiryWebhook';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultService?: string;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  onClose,
  defaultService = BRAND_CONFIG.locale.defaultServiceInterest,
}) => {
  const [service, setService] = useState(defaultService);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    timeframe: 'Immediate (Next 30 days)',
    notes: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [website, setWebsite] = useState('');

  const servicesList = BRAND_CONFIG.locale.serviceInterests;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (website.trim()) {
      return;
    }
    setError('');
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError('Please fill in your name, email, and phone number.');
      return;
    }

    setLoading(true);
    const res = await submitInquiry({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      office: 'Private Advisory',
      subject: service,
      timeframe: formData.timeframe,
      message: formData.notes,
      source: 'Consultation Modal',
    });
    setLoading(false);

    if (res.success || (res.unreachable && isEnquiryWebhookConfigured())) {
      void sendEnquiryToWebhook({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: 'Private Advisory',
        interest: service,
        budget: '',
        message: formData.notes.trim()
          ? `${formData.notes.trim()} (Timeframe: ${formData.timeframe})`
          : `Timeframe: ${formData.timeframe}`,
        source: 'Consultation',
        website,
      });
      setSubmitted(true);
    } else {
      setError(res.error || 'Could not submit consultation request.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-brand border border-white/20 rounded-[28px] sm:rounded-[36px] overflow-hidden text-brand-contrast shadow-2xl p-6 sm:p-10"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 rounded-full glass-card-subtle flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400 rounded-full flex items-center justify-center mx-auto text-emerald-300">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="font-display font-extrabold text-2xl uppercase tracking-tight text-white">
                Consultation Reserved
              </h3>
              <p className="text-sm text-white/80 max-w-md mx-auto leading-relaxed font-body">
                {BRAND_CONFIG.locale.greeting},{' '}
                <span className="font-semibold text-white">{formData.name}</span>. Our Senior Advisor for{' '}
                <span className="font-semibold text-emerald-300">{service}</span> will contact you to coordinate your consultation.
              </p>
              <div className="pt-6">
                <PillButton variant="white" size="md" onClick={onClose}>
                  Done
                </PillButton>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 text-xs text-white/70 font-display uppercase tracking-widest mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Confidential Property Advisory</span>
                </div>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-white">
                  BOOK A CONSULTATION
                </h3>
                <p className="text-xs text-white/70 mt-1 font-body">
                  Connect with {BRAND_CONFIG.identity.brandShortName}&apos;s senior partners for discreet acquisition, transfer verification, and investment counsel.
                </p>
              </div>

              {error && (
                <div className="mb-4 text-xs text-rose-300 bg-rose-500/20 border border-rose-400/30 px-3.5 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] w-px h-px overflow-hidden opacity-0 pointer-events-none"
                />

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1.5">
                    Select Practice Area
                  </label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                  >
                    {servicesList.map((s) => (
                      <option key={s} value={s} className="bg-brand text-brand-contrast">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={`e.g. ${BRAND_CONFIG.locale.placeholderNames.consultationName}`}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      />
                      <User className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder={`e.g. ${BRAND_CONFIG.locale.placeholderNames.consultationEmail}`}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      />
                      <Mail className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        placeholder={`e.g. ${BRAND_CONFIG.locale.placeholderNames.consultationPhone}`}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      />
                      <Phone className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1.5">
                      Acquisition Window
                    </label>
                    <div className="relative">
                      <select
                        value={formData.timeframe}
                        onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      >
                        <option value="Immediate (Next 30 days)" className="bg-brand">
                          Immediate (Next 30 days)
                        </option>
                        <option value="1-3 Months" className="bg-brand">
                          1-3 Months
                        </option>
                        <option value="3-6 Months" className="bg-brand">
                          3-6 Months
                        </option>
                        <option value="Exploratory / Long Term" className="bg-brand">
                          Exploratory / Long Term
                        </option>
                      </select>
                      <Clock className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1.5">
                    Specific Property Preferences or Questions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder={BRAND_CONFIG.locale.placeholderNames.consultationNotes}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-white/50"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-white/60">
                    Complete privacy and discretion assured.
                  </span>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-full bg-white text-brand font-display font-bold text-xs uppercase tracking-wider hover:bg-surface transition-all cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {loading ? 'Confirming...' : 'Book Consultation'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
