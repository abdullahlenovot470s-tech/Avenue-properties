import React, { useState } from 'react';
import { REGIONAL_OFFICES } from '../data/realEstateData';
import { useToast } from '../context/ToastContext';
import {
  SITE_CONFIG,
  getWhatsAppUrl,
  isValidContactPhone,
  isValidContactEmail,
} from '../config/siteConfig';
import { BRAND_CONFIG } from '../config/brand.config';
import { submitInquiry } from '../lib/inquiriesApi';
import { sendEnquiryToWebhook, isEnquiryWebhookConfigured } from '../services/enquiryWebhook';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Send, CheckCircle2, Building, Navigation, AlertCircle } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { showToast } = useToast();
  const shortBrand = BRAND_CONFIG.identity.brandShortName;
  const defaultOffice = REGIONAL_OFFICES[0]?.city || BRAND_CONFIG.locale.defaultCity;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    office: defaultOffice,
    subject: 'Buying',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  React.useEffect(() => {
    document.title = `Offices & Contact | ${BRAND_CONFIG.identity.brandName}`;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot.trim()) {
      return;
    }

    setFormError('');

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedName) {
      const msg = 'Please enter your full name.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    if (!trimmedEmail || !isValidContactEmail(trimmedEmail)) {
      const msg = 'Please enter a valid email address.';
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    if (!trimmedPhone || !isValidContactPhone(trimmedPhone)) {
      const msg = SITE_CONFIG.forms.phoneErrorMessage;
      setFormError(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await submitInquiry({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        office: formData.office,
        subject: formData.subject,
        message: trimmedMessage,
        source: 'Contact Page',
      });

      if (res.success || (res.unreachable && isEnquiryWebhookConfigured())) {
        void sendEnquiryToWebhook({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          city: formData.office,
          interest: formData.subject,
          budget: '',
          message: trimmedMessage,
          source: 'Contact',
          website: '',
        });
        setSubmitted(true);
        showToast('Your message has been received. Our partner will connect shortly.', 'success');
      } else {
        const msg = res.error || 'Could not submit inquiry. Please try again.';
        setFormError(msg);
        showToast(msg, 'error');
      }
    } catch {
      const msg = 'Could not submit inquiry right now. Please try again.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header Card with Ghost Watermark */}
      <section className="relative w-full bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden p-6 sm:p-10 md:p-14 shadow-xl border border-slate-100">
        <div className="absolute top-4 right-0 pointer-events-none select-none overflow-hidden max-w-full z-0">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-watermark/30 select-none"
            style={{ fontSize: 'clamp(4rem, 12vw, 7.5rem)' }}
          >
            CONTACT
          </span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="text-[11px] font-display uppercase tracking-widest text-accent font-bold block">
            Direct Principal Access
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-brand uppercase tracking-tight leading-none">
            CONNECT WITH {shortBrand.toUpperCase()} IN {BRAND_CONFIG.locale.country.toUpperCase()}.
          </h1>
          <p className="font-body text-sm sm:text-base text-brand/80 leading-relaxed font-light">
            Our managing partners operate from offices across {BRAND_CONFIG.locale.mainCities.slice(0, 3).join(', ')}, with dedicated support for both local buyers and international clients.
          </p>
        </div>
      </section>

      {/* Regional Offices Showcase Grid */}
      <section className="space-y-6">
        <div className="px-2">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-brand uppercase tracking-tight">
            REGIONAL OFFICES & ADVISORY DESKS
          </h2>
          <p className="text-xs text-slate-500 font-body mt-1">
            Private consultation available Monday to Saturday, 9:00 AM to 6:00 PM {BRAND_CONFIG.locale.timezoneLabel}.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {REGIONAL_OFFICES.map((office) => (
            <div
              key={office.city}
              className="relative bg-gradient-to-br from-brand to-accent rounded-3xl p-5 sm:p-6 text-brand-contrast overflow-hidden shadow-lg border border-white/10 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300"
            >
              {/* Faded watermark word of the city name */}
              <div className="absolute -bottom-3 -right-2 pointer-events-none select-none overflow-hidden max-w-full z-0 opacity-15">
                <span
                  className="font-display font-black leading-none uppercase tracking-tighter text-brand-contrast select-none block"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
                >
                  {office.city}
                </span>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-display uppercase tracking-widest text-emerald-400 font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
                    {office.city.endsWith('Desk') ? office.city : `${office.city} Desk`}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-brand-contrast/80">
                    <Building className="w-4 h-4 text-brand-contrast" />
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg sm:text-xl uppercase tracking-tight text-brand-contrast">
                    {office.city}
                  </h3>
                  <div className="text-[11px] text-brand-contrast/70 font-display uppercase tracking-wider mt-0.5">
                    Advisor: <span className="text-brand-contrast font-semibold">{office.directors}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-brand-contrast/85 font-body pt-1">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{office.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={`tel:${office.phone.replace(/[^0-9+]/g, '')}`}
                      className="hover:text-brand-contrast hover:underline transition-colors cursor-pointer"
                    >
                      {office.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={`mailto:${office.email}`}
                      className="hover:text-brand-contrast hover:underline transition-colors cursor-pointer"
                    >
                      {office.email}
                    </a>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-4 mt-4 border-t border-white/15 flex items-center justify-between">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-display uppercase tracking-wider text-emerald-300 hover:text-brand-contrast font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get directions</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Appointment & Inquiry Form Section */}
      <section className="bg-brand rounded-[28px] sm:rounded-[36px] p-8 sm:p-14 md:p-16 text-brand-contrast shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-5">
            <span className="text-[10px] font-display uppercase tracking-widest text-brand-contrast/60 block">
              Confidential Representation
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl uppercase tracking-tight">
              COMMENCE A PRIVATE DIALOGUE
            </h2>
            <p className="font-body text-xs sm:text-sm text-brand-contrast/80 leading-relaxed font-light">
              All communications are strictly confidential. Whether acquiring a residence or planning a portfolio sale, our senior partners are at your service.
            </p>

            <div className="p-4 rounded-2xl glass-card-subtle space-y-2 text-xs text-brand-contrast/90">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Response window: Within 2 business hours ({BRAND_CONFIG.locale.timezoneLabel})</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Direct partner representation guaranteed</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={getWhatsAppUrl(BRAND_CONFIG.contact.whatsappGreetings.generalFooter)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs uppercase tracking-wider font-semibold transition-all shadow-md cursor-pointer"
              >
                <span>Chat via WhatsApp: {SITE_CONFIG.phone.whatsapp}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/20 shadow-2xl">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400 rounded-full flex items-center justify-center mx-auto text-emerald-300">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="font-display font-extrabold text-2xl uppercase tracking-tight text-white">
                    Inquiry Confirmed
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 max-w-md mx-auto leading-relaxed font-body">
                    {BRAND_CONFIG.locale.greeting}, <span className="font-semibold text-white">{formData.name}</span>. The {shortBrand} managing director for {formData.office} will be in touch directly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormError('');
                      setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        office: defaultOffice,
                        subject: 'Buying',
                        message: '',
                      });
                    }}
                    className="text-xs font-display uppercase tracking-wider text-white/80 hover:text-white underline underline-offset-4 pt-2 cursor-pointer"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <input
                    type="text"
                    name="contact_hp_ref"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    aria-hidden="true"
                    className="absolute -left-[9999px] w-px h-px overflow-hidden opacity-0 pointer-events-none"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={BRAND_CONFIG.locale.placeholderNames.inquiryName}
                        value={formData.name}
                        onChange={(e) => {
                          setFormError('');
                          setFormData({ ...formData, name: e.target.value });
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder={BRAND_CONFIG.locale.placeholderNames.inquiryEmail}
                        value={formData.email}
                        onChange={(e) => {
                          setFormError('');
                          setFormData({ ...formData, email: e.target.value });
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                        Telephone
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder={SITE_CONFIG.forms.phonePlaceholder}
                        value={formData.phone}
                        onChange={(e) => {
                          setFormError('');
                          setFormData({ ...formData, phone: e.target.value });
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                        Regional Office
                      </label>
                      <select
                        value={formData.office}
                        onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      >
                        {REGIONAL_OFFICES.map((office) => (
                          <option key={office.city} value={office.city} className="bg-brand text-brand-contrast">
                            {office.city}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                        Interest
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                      >
                        <option value="Buying" className="bg-brand text-brand-contrast">Buying</option>
                        <option value="Renting" className="bg-brand text-brand-contrast">Renting</option>
                        <option value="Selling" className="bg-brand text-brand-contrast">Selling</option>
                        <option value="Investment" className="bg-brand text-brand-contrast">Investment</option>
                        <option value="Advisory Inquiry" className="bg-brand text-brand-contrast">Overseas / Advisory inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                      Brief Message or Property Reference
                    </label>
                    <textarea
                      rows={3}
                      placeholder={BRAND_CONFIG.locale.placeholderNames.consultationNotes}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>

                  {formError && (
                    <p
                      role="alert"
                      className="flex items-center gap-2 text-xs text-rose-200 bg-rose-500/20 border border-rose-400/40 px-3.5 py-2.5 rounded-xl"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                      <span>{formError}</span>
                    </p>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-full bg-white text-brand font-display font-bold text-xs uppercase tracking-widest hover:bg-surface transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <span>Connecting...</span>
                      ) : (
                        <>
                          <span>Submit Confidential Inquiry</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
