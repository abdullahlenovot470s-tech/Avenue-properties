import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatRent } from '../data/rentalsData';
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
  Send,
  Building2,
  Share2,
  ChevronRight,
  MessageCircle,
  FileText,
  Key,
} from 'lucide-react';

export const RentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPropertySaved, toggleSaveProperty } = useAuth();
  const { rentalListings } = useCatalog();
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

  const listing = useMemo(() => {
    return rentalListings.find((r) => r.id === id) || null;
  }, [id, rentalListings]);

  useEffect(() => {
    setActivePhotoIdx(0);
    if (listing) {
      document.title = `${listing.title} | Homes for Rent | Avenue`;
    } else {
      document.title = 'Rental Residence | Avenue Luxury Properties';
    }
  }, [listing]);

  if (!listing) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
        <Building2 className="w-16 h-16 text-[#2F4B73]" />
        <h2 className="font-display font-extrabold text-2xl uppercase tracking-tight text-[#1B2A44]">
          Rental Listing Not Found
        </h2>
        <p className="text-xs text-slate-500 font-body">
          The requested rental residence may have been leased or is no longer listed.
        </p>
        <Link
          to="/rent"
          className="mt-4 px-6 py-2.5 rounded-full bg-[#1B2A44] text-white text-xs font-display uppercase tracking-wider font-semibold"
        >
          Return to Homes for Rent
        </Link>
      </div>
    );
  }

  const saved = isPropertySaved(listing.id);
  const rawImages = listing.gallery && listing.gallery.length > 0 ? listing.gallery : [listing.image];
  const images = rawImages.filter(Boolean);
  const currentImage = images[activePhotoIdx] || images[0] || listing.image;
  const isRented = listing.status === 'Rented';

  const handleToggleHeart = () => {
    const isNowSaved = toggleSaveProperty(listing.id);
    if (isNowSaved) {
      showToast(`Saved "${listing.title}" to your shortlist.`, 'success');
    } else {
      showToast(`Removed "${listing.title}" from shortlist.`, 'info');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Rental link copied to clipboard.', 'info');
    }
  };

  const handleTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (website.trim()) {
      return;
    }
    if (!tourName.trim() || !tourEmail.trim() || !tourDate) {
      showToast('Please provide your name, email, and preferred viewing date.', 'error');
      return;
    }
    setTourSubmitting(true);
    const res = await submitInquiry({
      name: tourName.trim(),
      email: tourEmail.trim(),
      phone: tourPhone.trim(),
      office: listing.city,
      subject: `Rental Viewing: ${listing.title}`,
      message: tourNotes.trim() || `Requested viewing for ${listing.title} on ${tourDate}.`,
      source: 'Rent Detail Viewing Form',
      propertyTitle: listing.title,
      preferredDate: tourDate,
    });
    setTourSubmitting(false);

    if (!res.success && !(res.unreachable && isEnquiryWebhookConfigured())) {
      showToast(res.error || 'Could not submit viewing request. Please try again.', 'error');
      return;
    }

    const siteVisitMessage = `Property: ${listing.title} | Preferred Date: ${tourDate}${
      tourNotes.trim() ? ` | Notes: ${tourNotes.trim()}` : ''
    }`;
    void sendEnquiryToWebhook({
      name: tourName.trim(),
      email: tourEmail.trim(),
      phone: tourPhone.trim(),
      city: listing.city,
      interest: `Rent - ${listing.type}`,
      budget: formatRent(listing.monthlyRent),
      message: siteVisitMessage,
      source: 'Site Visit',
      website,
    });

    setTourBooked(true);
    showToast(`Viewing request registered for ${listing.title}. Concierge will contact you.`, 'success');
  };

  const whatsappMessage = encodeURIComponent(
    `Assalam o Alaikum, I am inquiring about the rental residence "${listing.title}" (${formatRent(listing.monthlyRent)}) in ${listing.areaSociety}. Please share verification records and schedule a viewing.`
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-8">
      {/* Breadcrumb Navigation: Home / Rent / Title */}
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
            <Link to="/rent" className="hover:text-[#1B2A44] transition-colors">
              Rent
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li className="text-[#1B2A44] font-bold truncate max-w-[200px] sm:max-w-none" aria-current="page">
            {listing.title}
          </li>
        </ol>
      </nav>

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/rent"
          className="inline-flex items-center gap-2 text-xs font-display uppercase tracking-wider text-slate-600 hover:text-[#1B2A44] font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Rentals</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-sm"
            title="Share rental link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleHeart}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer shadow-sm text-xs font-display uppercase tracking-wider font-semibold ${
              saved
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{saved ? 'Saved in Shortlist' : 'Save Residence'}</span>
          </button>
        </div>
      </div>

      {/* Gallery Showcase */}
      <section className="bg-white rounded-[28px] sm:rounded-[36px] overflow-hidden p-3 sm:p-5 shadow-xl border border-slate-100 space-y-4">
        {/* Main Stage Image */}
        <div className="relative aspect-[16/9] md:aspect-[21/10] rounded-[22px] sm:rounded-[28px] overflow-hidden shadow-inner">
          <SafeImage
            src={currentImage}
            alt={`${listing.title} - Photo ${Math.min(activePhotoIdx + 1, images.length)}`}
            className="w-full h-full object-cover"
          />

          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="glass-panel-dark px-3.5 py-1.5 rounded-full text-xs font-display uppercase tracking-widest text-white">
              {listing.city}
            </span>
            <span className="glass-panel-dark px-3 py-1.5 rounded-full text-xs font-display uppercase tracking-widest text-emerald-300 font-bold">
              FOR RENT
            </span>
            <span className="glass-panel-dark px-3 py-1.5 rounded-full text-xs font-display uppercase tracking-widest text-white/90">
              {listing.furnished}
            </span>
            {listing.status && listing.status !== 'Available' && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-display uppercase tracking-widest font-bold bg-rose-600 text-white shadow-md">
                {listing.status}
              </span>
            )}
          </div>

          <div className="absolute bottom-4 right-4 glass-panel px-3 py-1 rounded-full text-xs font-display text-white">
            Photo {Math.min(activePhotoIdx + 1, images.length)} of {images.length}
          </div>
        </div>

        {/* Thumbnails Strip */}
        {images.length > 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {images.map((photoUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`relative aspect-[16/10] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                  activePhotoIdx === idx
                    ? 'border-[#1B2A44] shadow-md scale-[1.02]'
                    : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                <SafeImage
                  src={photoUrl}
                  alt={`${listing.title} view ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Main Details & Booking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Listing Overview & Specifications */}
        <div className="lg:col-span-8 space-y-8">
          {/* Header Card */}
          <div className="bg-white rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 shadow-xl border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs text-[#2F4B73] font-semibold">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{listing.areaSociety}</span>
                  </div>
                  {listing.status && listing.status !== 'Available' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      {listing.status}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#1B2A44] uppercase tracking-tight">
                  {listing.title}
                </h1>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] font-display uppercase tracking-widest text-slate-400 font-bold block">
                  Monthly Rent
                </span>
                <span className="font-display font-black text-2xl sm:text-3xl text-[#1B2A44]">
                  {formatRent(listing.monthlyRent)}
                </span>
                <span className="text-xs text-slate-500 font-body block mt-0.5">
                  Security: {listing.securityDeposit}
                </span>
              </div>
            </div>

            {/* Core Specs Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-body">
              <div className="space-y-1">
                <span className="text-[10px] font-display uppercase tracking-wider text-slate-400 block">
                  Bedrooms
                </span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-[#2F4B73]" /> {listing.beds} Beds
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-display uppercase tracking-wider text-slate-400 block">
                  Bathrooms
                </span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Bath className="w-4 h-4 text-[#2F4B73]" /> {listing.baths} Baths
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-display uppercase tracking-wider text-slate-400 block">
                  Floor / Area
                </span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4 text-[#2F4B73]" /> {listing.sizeOrFloor}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-display uppercase tracking-wider text-slate-400 block">
                  Furnishing
                </span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#2F4B73]" /> {listing.furnished}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-lg text-[#1B2A44] uppercase tracking-wide">
                Residence Overview
              </h2>
              <p className="font-body text-sm text-slate-600 leading-relaxed">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Tenancy Terms & Amenities Card */}
          <div className="bg-white rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 shadow-xl border border-slate-100 space-y-6">
            <h2 className="font-display font-bold text-lg text-[#1B2A44] uppercase tracking-wide">
              Tenancy Terms & Utilities
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-display uppercase tracking-wider text-[10px] text-slate-400 block">
                  Available From
                </span>
                <span className="font-bold text-[#1B2A44] text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#2F4B73]" /> {listing.availableFrom}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-display uppercase tracking-wider text-[10px] text-slate-400 block">
                  Security Deposit
                </span>
                <span className="font-bold text-[#1B2A44] text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> {listing.securityDeposit}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-display uppercase tracking-wider text-[10px] text-slate-400 block">
                  Minimum Lease
                </span>
                <span className="font-bold text-[#1B2A44] text-sm flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#2F4B73]" /> {listing.minContractPeriod}
                </span>
              </div>
            </div>

            {/* Amenities Grid */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-sm text-[#1B2A44] uppercase tracking-wider">
                Included Amenities & Utilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {listing.amenities.map((amenity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-body"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tenancy Inquiry & WhatsApp Contact */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[28px] sm:rounded-[36px] p-6 sm:p-8 shadow-xl border border-slate-100 sticky top-28 space-y-6">
            <div>
              <span className="text-[10px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block mb-1">
                Tenancy Concierge
              </span>
              <h3 className="font-display font-extrabold text-xl text-[#1B2A44] uppercase tracking-tight">
                Schedule Private Viewing
              </h3>
              <p className="font-body text-xs text-slate-500 mt-1">
                Coordinate an in-person or live biometric video tour of this residence.
              </p>
            </div>

            {tourBooked ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-display font-bold text-sm text-emerald-900 uppercase">
                  Viewing Request Confirmed
                </h4>
                <p className="text-xs text-emerald-800 font-body">
                  An Avenue leasing advisor will call you to confirm gate access and key handover.
                </p>
                <button
                  type="button"
                  onClick={() => setTourBooked(false)}
                  className="text-xs font-display text-emerald-700 underline font-semibold cursor-pointer"
                >
                  Submit Another Request
                </button>
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
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asim Raza"
                    value={tourName}
                    onChange={(e) => setTourName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. asim@example.com"
                    value={tourEmail}
                    onChange={(e) => setTourEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Direct Phone (Pakistani Mobile)
                  </label>
                  <input
                    type="tel"
                    placeholder="03XX XXXXXXX"
                    value={tourPhone}
                    onChange={(e) => setTourPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={tourDate}
                    onChange={(e) => setTourDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Special Requests / Tenancy Term
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Corporate lease, diplomat visa, move-in next week..."
                    value={tourNotes}
                    onChange={(e) => setTourNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={tourSubmitting}
                  className="w-full py-3.5 px-6 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] disabled:opacity-60 text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {tourSubmitting
                      ? 'Submitting Request...'
                      : isRented
                      ? 'Ask about similar properties'
                      : 'Request Viewing Appointment'}
                  </span>
                </button>
              </form>
            )}

            {/* Direct WhatsApp Contact */}
            <div className="pt-4 border-t border-slate-100">
              <a
                href={`https://wa.me/923001234567?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-display font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Instant WhatsApp Concierge</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
