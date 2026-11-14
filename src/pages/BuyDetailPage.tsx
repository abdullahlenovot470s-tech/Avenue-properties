import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { SafeImage } from '../components/common/SafeImage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { submitInquiry } from '../lib/inquiriesApi';
import { sendEnquiryToWebhook, isEnquiryWebhookConfigured } from '../services/enquiryWebhook';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Calculator,
  Send,
  Building2,
  Share2,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';

export const BuyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPropertySaved, toggleSaveProperty } = useAuth();
  const { buyProperties } = useCatalog();
  const { showToast } = useToast();

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Private viewing request state
  const [tourDate, setTourDate] = useState('');
  const [tourName, setTourName] = useState('');
  const [tourEmail, setTourEmail] = useState('');
  const [tourPhone, setTourPhone] = useState('');
  const [tourNotes, setTourNotes] = useState('');
  const [tourBooked, setTourBooked] = useState(false);
  const [tourSubmitting, setTourSubmitting] = useState(false);
  const [website, setWebsite] = useState('');

  // Home Financing / Installment Calculator state in PKR
  const [downPaymentPercent, setDownPaymentPercent] = useState(30);
  const [financingRate, setFinancingRate] = useState(14.5);
  const [loanTermYears, setLoanTermYears] = useState(15);

  const property = useMemo(() => {
    return buyProperties.find((p) => p.id === id) || null;
  }, [id, buyProperties]);

  useEffect(() => {
    setActivePhotoIdx(0);
    if (property) {
      document.title = `${property.title} | Properties for Sale | Avenue`;
    } else {
      document.title = 'Property For Sale | Avenue Luxury Properties';
    }
  }, [property]);

  if (!property) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
        <Building2 className="w-16 h-16 text-[#2F4B73]" />
        <h2 className="font-display font-extrabold text-2xl uppercase tracking-tight text-[#1B2A44]">
          Property Listing Not Found
        </h2>
        <p className="text-xs text-slate-500 font-body">
          The requested for-sale property may have been acquired or transferred.
        </p>
        <Link
          to="/buy"
          className="mt-4 px-6 py-2.5 rounded-full bg-[#1B2A44] text-white text-xs font-display uppercase tracking-wider font-semibold"
        >
          Return to Properties for Sale
        </Link>
      </div>
    );
  }

  const saved = isPropertySaved(property.id);

  const handleToggleHeart = () => {
    const isNowSaved = toggleSaveProperty(property.id);
    if (isNowSaved) {
      showToast(`Saved "${property.title}" to your shortlist.`, 'success');
    } else {
      showToast(`Removed "${property.title}" from shortlist.`, 'info');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Property link copied to clipboard.', 'info');
    }
  };

  const handleTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (website.trim()) {
      return;
    }
    if (!tourName.trim() || !tourEmail.trim() || !tourDate) {
      showToast('Please provide your name, email, and preferred date.', 'error');
      return;
    }
    setTourSubmitting(true);
    const res = await submitInquiry({
      name: tourName.trim(),
      email: tourEmail.trim(),
      phone: tourPhone.trim(),
      office: property.city,
      subject: `Purchase Viewing: ${property.title}`,
      message: tourNotes.trim() || `Requested private showing for ${property.title} on ${tourDate}.`,
      source: 'Buy Property Viewing Form',
      propertyTitle: property.title,
      preferredDate: tourDate,
    });
    setTourSubmitting(false);

    if (!res.success && !(res.unreachable && isEnquiryWebhookConfigured())) {
      showToast(res.error || 'Could not submit viewing request. Please try again.', 'error');
      return;
    }

    const siteVisitMessage = `Property: ${property.title} | Preferred Date: ${tourDate}${
      tourNotes.trim() ? ` | Notes: ${tourNotes.trim()}` : ''
    }`;
    void sendEnquiryToWebhook({
      name: tourName.trim(),
      email: tourEmail.trim(),
      phone: tourPhone.trim(),
      city: property.city,
      interest: `Buy - ${property.type}`,
      budget: property.price,
      message: siteVisitMessage,
      source: 'Site Visit',
      website,
    });

    setTourBooked(true);
    showToast('Viewing scheduled. An Avenue senior advisor will contact you within 2 hours.', 'success');
  };

  // Financing calculation in PKR
  const downPaymentAmount = (property.numericPrice * downPaymentPercent) / 100;
  const loanPrincipal = property.numericPrice - downPaymentAmount;
  const monthlyRate = financingRate / 100 / 12;
  const totalMonths = loanTermYears * 12;
  const monthlyPayment =
    monthlyRate > 0
      ? (loanPrincipal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
      : loanPrincipal / totalMonths;

  const formatPKR = (amount: number) => {
    if (amount >= 10000000) {
      return `PKR ${(amount / 10000000).toFixed(2)} Crore`;
    }
    return `PKR ${(amount / 100000).toFixed(1)} Lakh`;
  };

  const rawImages = property.gallery && property.gallery.length > 0 ? property.gallery : [property.image];
  const images = rawImages.filter(Boolean);
  const currentImage = images[activePhotoIdx] || images[0] || property.image;
  const isSold = property.status === 'Sold';

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumb" className="px-2">
        <ol className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-slate-500">
          <li>
            <Link to="/" className="hover:text-[#1B2A44] transition-colors">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li>
            <Link to="/buy" className="hover:text-[#1B2A44] transition-colors">
              Buy
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li className="text-[#1B2A44] font-bold truncate max-w-[200px] sm:max-w-md" aria-current="page">
            {property.title}
          </li>
        </ol>
      </nav>

      {/* Top Actions Row */}
      <div className="flex items-center justify-between px-2">
        <Link
          to="/buy"
          className="hover:text-[#1B2A44] flex items-center gap-1.5 text-xs font-display uppercase tracking-widest text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Properties for Sale</span>
        </Link>

        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/923001234567?text=${encodeURIComponent(
              `Assalam o Alaikum, I am inquiring about the property for sale: ${property.title} (${property.price}).`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 text-xs font-display uppercase tracking-wider font-semibold transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp Advisor</span>
          </a>

          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Share Details"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleHeart}
            className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center shadow-sm cursor-pointer ${
              saved
                ? 'bg-rose-50 border-rose-200 text-rose-500 fill-rose-500 scale-105'
                : 'bg-white border-slate-200 text-slate-700 hover:text-rose-500'
            }`}
            title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
          >
            <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Gallery Section */}
      <section className="bg-white rounded-[28px] sm:rounded-[36px] overflow-hidden p-4 sm:p-6 shadow-xl border border-slate-100">
        <div className="relative aspect-[16/9] lg:aspect-[21/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-slate-200">
          <SafeImage
            src={currentImage}
            alt={property.title}
            priority={true}
            className="w-full h-full object-cover"
          />

          <div className="absolute top-4 left-4 glass-panel-dark px-3.5 py-1.5 rounded-full text-xs font-display uppercase tracking-widest text-white">
            Photo {Math.min(activePhotoIdx + 1, images.length)} of {images.length}
          </div>

          <div className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-2">
            {property.status && property.status !== 'Available' && (
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-display uppercase tracking-widest font-bold shadow-md ${
                  property.status === 'Sold'
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {property.status}
              </span>
            )}
            <div className="glass-panel-dark px-3.5 py-1.5 rounded-full text-xs font-display uppercase tracking-widest text-emerald-300">
              {property.city} • {property.type}
            </div>
          </div>
        </div>

        {images.length > 1 && (
          <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActivePhotoIdx(i)}
                className={`relative w-24 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  activePhotoIdx === i
                    ? 'border-[#1B2A44] scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <SafeImage src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Property Details Grid & Inquiry Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 shadow-xl border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#2F4B73]">
                    <MapPin className="w-4 h-4" />
                    <span>{property.location}</span>
                  </div>
                  {property.status && property.status !== 'Available' && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold ${
                        property.status === 'Sold'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {property.status}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#1B2A44] uppercase tracking-tight">
                  {property.title}
                </h1>
                <span className="text-xs font-display uppercase tracking-wider text-emerald-700 font-semibold mt-1 block">
                  NOC Status: {property.nocStatus}
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-display tracking-widest text-slate-400 block">
                  Price
                </span>
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#1B2A44]">
                  {property.price}
                </span>
              </div>
            </div>

            {/* Quick Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-xs text-slate-700 font-body">
              {property.type !== 'Plot' && (
                <>
                  <div className="p-4 rounded-2xl bg-[#E6ECF5]/40 border border-[#E6ECF5]">
                    <Bed className="w-4 h-4 text-[#2F4B73] mb-1" />
                    <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Bedrooms</span>
                    <span className="font-bold text-sm text-[#1B2A44]">{property.beds} Beds</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#E6ECF5]/40 border border-[#E6ECF5]">
                    <Bath className="w-4 h-4 text-[#2F4B73] mb-1" />
                    <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Bathrooms</span>
                    <span className="font-bold text-sm text-[#1B2A44]">{property.baths} Baths</span>
                  </div>
                </>
              )}

              <div className="p-4 rounded-2xl bg-[#E6ECF5]/40 border border-[#E6ECF5]">
                <Maximize2 className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Plot / Area</span>
                <span className="font-bold text-sm text-[#1B2A44]">{property.area}</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#E6ECF5]/40 border border-[#E6ECF5]">
                <Calendar className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Possession</span>
                <span className="font-bold text-sm text-[#1B2A44]">{property.possession}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-display uppercase tracking-widest text-[#2F4B73] font-bold">
                Property Overview
              </h3>
              <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-light">
                {property.description}
              </p>
            </div>

            {/* Key Features */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-display uppercase tracking-widest text-[#2F4B73] font-bold mb-3">
                Verified Amenities & Utilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {property.features.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Capital & Home Financing Calculator in PKR */}
          <div className="bg-[#1B2A44] rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 text-white shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Calculator className="w-5 h-5 text-amber-300" />
                <h3 className="font-display font-bold text-lg sm:text-xl uppercase tracking-tight text-white">
                  HOME FINANCING & INSTALLMENT CALCULATOR
                </h3>
              </div>
              <span className="text-[10px] font-display uppercase tracking-widest text-white/60">
                Pakistani Bank / Developer Model
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-[10px] uppercase font-display tracking-wider text-white/70 mb-1">
                  Down Payment ({downPaymentPercent}% Pay Order)
                </label>
                <div className="font-display font-bold text-lg text-emerald-300">
                  {formatPKR(downPaymentAmount)}
                </div>
                <input
                  type="range"
                  min="20"
                  max="60"
                  step="5"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                  className="w-full mt-2 accent-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-display tracking-wider text-white/70 mb-1">
                  Financing Rate ({financingRate}%)
                </label>
                <div className="font-display font-bold text-lg text-white">
                  {financingRate}% p.a.
                </div>
                <input
                  type="range"
                  min="10"
                  max="22"
                  step="0.5"
                  value={financingRate}
                  onChange={(e) => setFinancingRate(Number(e.target.value))}
                  className="w-full mt-2 accent-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-display tracking-wider text-white/70 mb-1">
                  Estimated Monthly Installment
                </label>
                <div className="font-display font-bold text-xl sm:text-2xl text-amber-200">
                  {formatPKR(monthlyPayment)}
                  <span className="text-xs text-white/60 font-body font-normal"> / mo</span>
                </div>
                <span className="text-[10px] text-white/50 block mt-1">
                  Excludes stamp duty, CVT & society transfer fee
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Private Viewing Booking Card */}
        <div className="lg:col-span-4 sticky top-28">
          <div className="bg-white rounded-[28px] sm:rounded-[36px] p-6 sm:p-8 shadow-xl border border-slate-100 space-y-5">
            <div>
              <span className="text-[10px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block mb-1">
                Direct Principal Inquiry
              </span>
              <h3 className="font-display font-extrabold text-xl uppercase tracking-tight text-[#1B2A44]">
                SCHEDULE PRIVATE SITE VISIT
              </h3>
              <p className="text-xs text-slate-500 font-body mt-1">
                Site visits are escorted directly by an Avenue partner with society security clearances.
              </p>
            </div>

            {tourBooked ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-display font-bold text-sm text-emerald-900 uppercase">
                  Viewing Confirmed
                </h4>
                <p className="text-xs text-emerald-800 font-body">
                  Assalam o Alaikum, {tourName}. An Avenue partner will coordinate your private visit to the property for {tourDate}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTourSubmit} className="space-y-3.5">
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
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={tourDate}
                    onChange={(e) => setTourDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#2F4B73] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bilal Khan"
                    value={tourName}
                    onChange={(e) => setTourName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#2F4B73] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Direct Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. bilal.khan@example.com"
                    value={tourEmail}
                    onChange={(e) => setTourEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#2F4B73] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Telephone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 0300 1234567"
                    value={tourPhone}
                    onChange={(e) => setTourPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#2F4B73] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Special Inquiries (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Inquire about title deeds, transfer fee, possession..."
                    value={tourNotes}
                    onChange={(e) => setTourNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#2F4B73] focus:bg-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={tourSubmitting}
                    className="w-full py-3.5 px-6 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] disabled:opacity-60 text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      {tourSubmitting
                        ? 'Submitting Request...'
                        : isSold
                        ? 'Ask about similar properties'
                        : 'Request Private Showing'}
                    </span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-600 font-body">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Full registry, fard, NDC, and society transfer verification conducted prior to viewing.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
