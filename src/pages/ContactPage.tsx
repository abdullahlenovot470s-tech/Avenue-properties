import React, { useState } from 'react';
import { REGIONAL_OFFICES } from '../data/realEstateData';
import { PillButton } from '../components/common/PillButton';
import { useToast } from '../context/ToastContext';
import { SITE_CONFIG, handleDemoContactClick, getWhatsAppUrl } from '../config/siteConfig';
import { submitInquiry } from '../lib/inquiriesApi';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Send, CheckCircle2, Building, Navigation } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    office: 'Lahore',
    subject: 'Buying',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    document.title = 'Offices & Contact | Avenue Luxury Properties';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      showToast('Please complete all contact fields.', 'error');
      return;
    }

    if (!SITE_CONFIG.forms.phoneRegex.test(formData.phone.replace(/\s+/g, ''))) {
      showToast(SITE_CONFIG.forms.phoneErrorMessage, 'error');
      return;
    }

    setLoading(true);
    const res = await submitInquiry({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      office: formData.office,
      subject: formData.subject,
      message: formData.message,
      source: 'Contact Page',
    });
    setLoading(false);

    if (res.success) {
      setSubmitted(true);
      showToast('Your message has been received. Our partner will connect shortly.', 'success');
    } else {
      showToast(res.error || 'Could not submit inquiry. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header Card with Ghost Watermark */}
      <section className="relative w-full bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden p-6 sm:p-10 md:p-14 shadow-xl border border-slate-100">
        <div className="absolute top-4 right-0 pointer-events-none select-none overflow-hidden max-w-full z-0">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-[#E2E8F0]/30 select-none"
            style={{ fontSize: 'clamp(4rem, 12vw, 7.5rem)' }}
          >
            CONTACT
          </span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
            Direct Principal Access
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-[#1B2A44] uppercase tracking-tight leading-none">
            CONNECT WITH AVENUE IN PAKISTAN.
          </h1>
          <p className="font-body text-sm sm:text-base text-[#1B2A44]/80 leading-relaxed font-light">
            Our managing partners operate from offices in Lahore, Islamabad, and Karachi, with a dedicated desk assisting Pakistanis living in the UK, USA, UAE, Saudi Arabia and Canada.
          </p>
        </div>
      </section>

      {/* Regional Offices Showcase Grid - Slate-blue gradient cards without photos */}
      <section className="space-y-6">
        <div className="px-2">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1B2A44] uppercase tracking-tight">
            REGIONAL OFFICES & ADVISORY DESKS
          </h2>
          <p className="text-xs text-slate-500 font-body mt-1">
            Private consultation available Monday to Saturday, 9:00 AM to 6:00 PM PKT.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {REGIONAL_OFFICES.map((office) => (
            <div
              key={office.city}
              className="relative bg-gradient-to-br from-[#1B2A44] to-[#2F4B73] rounded-3xl p-5 sm:p-6 text-white overflow-hidden shadow-lg border border-white/10 flex flex-col justify-between group hover:shadow-2xl transition-all duration-300"
            >
              {/* Faded watermark word of the city name */}
              <div className="absolute -bottom-3 -right-2 pointer-events-none select-none overflow-hidden max-w-full z-0 opacity-15">
                <span
                  className="font-display font-black leading-none uppercase tracking-tighter text-white select-none block"
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
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80">
                    <Building className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg sm:text-xl uppercase tracking-tight text-white">
                    {office.city}
                  </h3>
                  <div className="text-[11px] text-white/70 font-display uppercase tracking-wider mt-0.5">
                    Advisor: <span className="text-white font-semibold">{office.directors}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-white/85 font-body pt-1">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{office.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={`tel:${office.phone.replace(/[^0-9+]/g, '')}`}
                      onClick={(e) => handleDemoContactClick(e, showToast)}
                      className="hover:text-white hover:underline transition-colors cursor-pointer"
                    >
                      {office.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={`mailto:${office.email}`}
                      onClick={(e) => handleDemoContactClick(e, showToast)}
                      className="hover:text-white hover:underline transition-colors cursor-pointer"
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
                  className="text-xs font-display uppercase tracking-wider text-emerald-300 hover:text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
      <section className="bg-[#1B2A44] rounded-[28px] sm:rounded-[36px] p-8 sm:p-14 md:p-16 text-white shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-5">
            <span className="text-[10px] font-display uppercase tracking-widest text-white/60 block">
              Confidential Representation
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl uppercase tracking-tight">
              COMMENCE A PRIVATE DIALOGUE
            </h2>
            <p className="font-body text-xs sm:text-sm text-white/80 leading-relaxed font-light">
              All communications are strictly confidential. Whether acquiring a residence in DHA, CDA sectors, Bahria Town, or planning a portfolio sale, our senior partners are at your service.
            </p>

            <div className="p-4 rounded-2xl glass-card-subtle space-y-2 text-xs text-white/90">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Response window: Within 2 business hours (PKT)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Direct partner representation guaranteed</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={getWhatsAppUrl('Assalam o Alaikum, I am inquiring about Avenue Luxury Properties.')}
                onClick={(e) => handleDemoContactClick(e, showToast)}
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
                    Assalam o Alaikum, <span className="font-semibold text-white">{formData.name}</span>. The Avenue managing director for {formData.office} will be in touch directly.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        office: 'Lahore',
                        subject: 'Acquisition Advisory',
                        message: '',
                      });
                    }}
                    className="text-xs font-display uppercase tracking-wider text-white/80 hover:text-white underline underline-offset-4 pt-2 cursor-pointer"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ahmed Raza"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                        placeholder="e.g. ahmed.raza@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                        <option value="Lahore" className="bg-[#1B2A44]">Lahore (DHA Phase 6)</option>
                        <option value="Islamabad" className="bg-[#1B2A44]">Islamabad (Sector F-7)</option>
                        <option value="Karachi" className="bg-[#1B2A44]">Karachi (DHA Phase 6)</option>
                        <option value="Overseas Desk" className="bg-[#1B2A44]">Overseas Pakistanis Desk</option>
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
                        <option value="Buying" className="bg-[#1B2A44]">Buying</option>
                        <option value="Renting" className="bg-[#1B2A44]">Renting</option>
                        <option value="Selling" className="bg-[#1B2A44]">Selling</option>
                        <option value="Investment" className="bg-[#1B2A44]">Investment</option>
                        <option value="Overseas Pakistani inquiry" className="bg-[#1B2A44]">Overseas Pakistani inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-wider text-white/80 mb-1">
                      Brief Message or Property Reference
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Outline your acquisition criteria (e.g. 1 Kanal in DHA Phase 6 Lahore or Sector F-7 Islamabad with clear possession and LDA/CDA approval)..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs sm:text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-full bg-white text-[#1B2A44] font-display font-bold text-xs uppercase tracking-widest hover:bg-[#E6ECF5] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
