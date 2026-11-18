import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { SafeImage } from '../components/common/SafeImage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { submitInquiry } from '../lib/inquiriesApi';
import {
  buildSpamCheckPayload,
  createSpamChallenge,
  validateSpamCheckAndContent,
} from '../lib/spamProtection';
import { SpamChallengeField } from '../components/common/SpamChallengeField';
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
} from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand.config';
import { handleDemoContactClick } from '../config/siteConfig';
import { buildPropertyListingJsonLd, usePageMeta } from '../lib/seo';
import { trackEvent } from '../lib/analytics';
import { LazyLocationMapEmbed } from '../components/common/LazyLocationMapEmbed';
import { InstallmentCalculator } from '../components/property/InstallmentCalculator';
import { useLanguage } from '../context/LanguageContext';
import { URGLISH_COPY } from '../data/urglishTranslations';

export const BuyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPropertySaved, toggleSaveProperty } = useAuth();
  const { buyProperties } = useCatalog();
  const { showToast } = useToast();
  const { t, isUrglish, getBuyDescription } = useLanguage();

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
  const [spamChallenge, setSpamChallenge] = useState(() => createSpamChallenge());
  const [challengeAnswer, setChallengeAnswer] = useState('');

  const property = useMemo(() => {
    return buyProperties.find((p) => p.id === id) || null;
  }, [id, buyProperties]);

  useEffect(() => {
    setActivePhotoIdx(0);
    setSpamChallenge(createSpamChallenge());
    setChallengeAnswer('');
    setTourBooked(false);
    if (property) {
      trackEvent('listing_view', {
        category: 'buy',
        id: property.id,
        title: property.title,
        city: property.city,
      });
    }
  }, [property]);

  usePageMeta({
    title: property
      ? `${property.title} · ${property.price} | ${BRAND_CONFIG.identity.brandShortName}`
      : `Property For Sale | ${BRAND_CONFIG.identity.brandName}`,
    description: property
      ? `${property.title} in ${property.location} (${property.area}) for ${property.price}. ${property.description}`
      : `Explore verified properties for sale in ${BRAND_CONFIG.locale.country} with ${BRAND_CONFIG.identity.brandName}.`,
    path: property ? `/#/buy/${property.id}` : '/#/buy',
    image: property?.image,
    type: property ? 'product' : 'website',
    noindex: !property,
    structuredData: property
      ? buildPropertyListingJsonLd({
          name: property.title,
          description: property.description,
          path: `/#/buy/${property.id}`,
          images: [property.image, ...(property.gallery || [])],
          priceNumeric: property.numericPrice,
          availability: property.status === 'Sold' ? 'SoldOut' : 'InStock',
          city: property.city,
          address: property.location,
          beds: property.beds || undefined,
          baths: property.baths || undefined,
          floorSizeText: property.area,
        })
      : undefined,
  });

  if (!property) {
    return (
      <div className="min-h-[100svh] pt-28 md:pt-32 pb-12 md:pb-20 px-5 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-4">
        <Building2 className="w-16 h-16 text-accent" />
        <h2 className="font-display font-bold md:font-extrabold text-[clamp(1.25rem,4.5vw,1.625rem)] md:text-2xl uppercase tracking-tight text-brand">
          Property Listing Not Found
        </h2>
        <p className="text-xs text-slate-500 font-body">
          The requested for-sale property may have been acquired or transferred.
        </p>
        <Link
          to="/buy"
          className="mt-4 px-6 py-2.5 rounded-full bg-brand text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold"
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

    const spamCheck = buildSpamCheckPayload(spamChallenge, challengeAnswer, website);
    const localSpam = validateSpamCheckAndContent({
      name: tourName.trim(),
      email: tourEmail.trim(),
      phone: tourPhone.trim(),
      office: property.city,
      subject: `Purchase Viewing: ${property.title}`,
      message: tourNotes.trim(),
      propertyTitle: property.title,
      spamCheck,
      requireChallenge: true,
    });
    if (!localSpam.valid) {
      showToast(localSpam.error || 'Please complete the verification check.', 'error');
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
      spamCheck,
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
      website: '',
    });

    setTourBooked(true);
    setSpamChallenge(createSpamChallenge());
    setChallengeAnswer('');
    showToast(`Viewing scheduled. An ${BRAND_CONFIG.identity.brandShortName} senior advisor will contact you within 2 hours.`, 'success');
  };

  const rawImages = property.gallery && property.gallery.length > 0 ? property.gallery : [property.image];
  const images = rawImages.filter(Boolean);
  const currentImage = images[activePhotoIdx] || images[0] || property.image;
  const isSold = property.status === 'Sold';

  return (
    <div className="min-h-[100svh] pt-20 md:pt-24 pb-6 md:pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-4 md:space-y-6">
      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumb" className="px-2">
        <ol className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-slate-500">
          <li>
            <Link to="/" className="hover:text-brand transition-colors">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li>
            <Link to="/buy" className="hover:text-brand transition-colors">
              Buy
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li className="text-brand font-bold truncate max-w-[200px] sm:max-w-md" aria-current="page">
            {property.title}
          </li>
        </ol>
      </nav>

      {/* Top Actions Row */}
      <div className="flex items-center justify-between px-2">
        <Link
          to="/buy"
          className="hover:text-brand flex items-center gap-1.5 text-xs font-display uppercase tracking-widest text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Properties for Sale</span>
        </Link>

        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/${BRAND_CONFIG.contact.phone.whatsappDigits}?text=${encodeURIComponent(
              `${BRAND_CONFIG.locale.greeting}, I am inquiring about the property for sale: ${property.title} (${property.price}).`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              trackEvent('whatsapp_click', { location: 'buy_detail', id: property.id });
              handleDemoContactClick(e, showToast);
            }}
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

          {BRAND_CONFIG.features.enableSavedProperties && (
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
          )}
        </div>
      </div>

      {/* Gallery Section */}
      <section className="bg-white rounded-2xl md:rounded-[36px] overflow-hidden p-5 md:p-6 shadow-xl border border-slate-100">
        <div className="relative aspect-[16/9] lg:aspect-[21/9] w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-lg border border-slate-200">
          <SafeImage
            src={currentImage}
            alt={property.title}
            sizes="100vw"
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
                    ? 'border-brand scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <SafeImage src={img} alt="" sizes="112px" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Property Details Grid & Inquiry Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 min-w-0 space-y-5 md:space-y-8">
          <div className="bg-white rounded-2xl md:rounded-[36px] p-5 md:p-10 shadow-xl border border-slate-100 space-y-5 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-5 md:pb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent">
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
                <h1 className="font-display font-bold md:font-extrabold text-[clamp(1.5rem,5.5vw,2rem)] md:text-3xl lg:text-4xl text-brand uppercase tracking-tight">
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
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-brand">
                  {property.price}
                </span>
              </div>
            </div>

            {/* Quick Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-xs text-slate-700 font-body">
              {property.type !== 'Plot' && (
                <>
                  <div className="p-4 rounded-2xl bg-surface/40 border border-surface">
                    <Bed className="w-4 h-4 text-accent mb-1" />
                    <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Bedrooms</span>
                    <span className="font-bold text-sm text-brand">{property.beds} Beds</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface/40 border border-surface">
                    <Bath className="w-4 h-4 text-accent mb-1" />
                    <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Bathrooms</span>
                    <span className="font-bold text-sm text-brand">{property.baths} Baths</span>
                  </div>
                </>
              )}

              <div className="p-4 rounded-2xl bg-surface/40 border border-surface">
                <Maximize2 className="w-4 h-4 text-accent mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Plot / Area</span>
                <span className="font-bold text-sm text-brand">{property.area}</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface/40 border border-surface">
                <Calendar className="w-4 h-4 text-accent mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Possession</span>
                <span className="font-bold text-sm text-brand">{property.possession}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-display uppercase tracking-widest text-accent font-bold">
                Property Overview
              </h3>
              <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-light">
                {getBuyDescription(property.id, property.description)}
              </p>
            </div>

            {/* Key Features */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-display uppercase tracking-widest text-accent font-bold mb-3">
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

          {/* Location Map */}
          {BRAND_CONFIG.features.enableMaps && (
            <div className="bg-white rounded-2xl md:rounded-[36px] p-5 md:p-8 shadow-xl border border-slate-100 space-y-4">
              <h3 className="text-xs font-display uppercase tracking-widest text-accent font-bold">
                Neighborhood &amp; Location Map
              </h3>
              <LazyLocationMapEmbed
                query={`${property.location}, ${property.city}`}
                title={`${property.title} Location Map`}
              />
            </div>
          )}

          {/* Capital & Home Financing Calculator */}
          <InstallmentCalculator defaultPrice={property.numericPrice} />
        </div>

        {/* Right Column: Private Viewing Booking Card */}
        <div className="lg:col-span-4 min-w-0 sticky top-28">
          <div className="bg-white rounded-2xl md:rounded-[36px] p-5 md:p-8 shadow-xl border border-slate-100 space-y-5">
            <div>
              <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block mb-1">
                Direct Principal Inquiry
              </span>
              <h3 className="font-display font-bold md:font-extrabold text-[clamp(1rem,3.6vw,1.25rem)] md:text-xl uppercase tracking-tight text-brand">
                SCHEDULE PRIVATE SITE VISIT
              </h3>
              <p className="text-xs text-slate-500 font-body mt-1">
                {t(
                  `Site visits are escorted directly by an ${BRAND_CONFIG.identity.brandShortName} partner with society security clearances.`,
                  URGLISH_COPY.detailPages.buyViewingSubtext
                )}
              </p>
            </div>

            {tourBooked ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-display font-bold text-sm text-emerald-900 uppercase">
                  Viewing Confirmed
                </h4>
                <p className="text-xs text-emerald-800 font-body">
                  {BRAND_CONFIG.locale.greeting}, {tourName}.{' '}
                  {isUrglish ? (
                    <>
                      {BRAND_CONFIG.identity.brandShortName} partner {tourDate} ke liye {URGLISH_COPY.detailPages.buyConfirmationSuffix}
                    </>
                  ) : (
                    <>
                      An {BRAND_CONFIG.identity.brandShortName} partner will coordinate your private visit to the property for {tourDate}.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={handleTourSubmit} className="space-y-3.5">
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
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={tourDate}
                    onChange={(e) => setTourDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-accent focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${BRAND_CONFIG.locale.placeholderNames.detailName}`}
                    value={tourName}
                    onChange={(e) => setTourName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-accent focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Direct Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={`e.g. ${BRAND_CONFIG.locale.placeholderNames.detailEmail}`}
                    value={tourEmail}
                    onChange={(e) => setTourEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-accent focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Telephone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder={`e.g. ${BRAND_CONFIG.locale.placeholderNames.consultationPhone}`}
                    value={tourPhone}
                    onChange={(e) => setTourPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-accent focus:bg-white"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-accent focus:bg-white"
                  />
                </div>

                <SpamChallengeField
                  challenge={spamChallenge}
                  answer={challengeAnswer}
                  onAnswerChange={setChallengeAnswer}
                  onRefresh={() => {
                    setSpamChallenge(createSpamChallenge());
                    setChallengeAnswer('');
                  }}
                  variant="light"
                />

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={tourSubmitting}
                    className="w-full py-3.5 px-6 rounded-full bg-brand hover:bg-accent disabled:opacity-60 text-brand-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
                  <p className="text-[11px] text-slate-500 text-center font-body">
                    By submitting, you agree to our{' '}
                    <Link to="/privacy" className="underline underline-offset-2 hover:text-brand">
                      Privacy Policy
                    </Link>{' '}
                    &amp;{' '}
                    <Link to="/terms" className="underline underline-offset-2 hover:text-brand">
                      Terms
                    </Link>
                    .
                  </p>
                </div>
              </form>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-600 font-body">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {t(
                  'Full registry, fard, NDC, and society transfer verification conducted prior to viewing.',
                  URGLISH_COPY.detailPages.buyVerificationNote
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
