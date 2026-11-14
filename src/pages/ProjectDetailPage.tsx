import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { SafeImage } from '../components/common/SafeImage';
import { PillButton } from '../components/common/PillButton';
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
  MessageCircle,
  ChevronRight,
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPropertySaved, toggleSaveProperty } = useAuth();
  const { propertyListings, portfolioProjects } = useCatalog();
  const { showToast } = useToast();

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Private viewing request state
  const [tourDate, setTourDate] = useState('');
  const [tourName, setTourName] = useState('');
  const [tourEmail, setTourEmail] = useState('');
  const [tourNotes, setTourNotes] = useState('');
  const [tourBooked, setTourBooked] = useState(false);
  const [tourSubmitting, setTourSubmitting] = useState(false);
  const [website, setWebsite] = useState('');

  // Home Financing / Installment Calculator state
  const [downPaymentPercent, setDownPaymentPercent] = useState(30);
  const [financingRate, setFinancingRate] = useState(14.5); // realistic KIBOR-based Pakistani bank home financing rate
  const [loanTermYears, setLoanTermYears] = useState(15);

  // Find project
  const project = useMemo(() => {
    const listing = propertyListings.find((p) => p.id === id);
    if (listing) {
      return {
        id: listing.id,
        name: listing.name,
        location: listing.location,
        price: listing.price,
        numericPrice: listing.numericPrice,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        category: listing.category,
        description: listing.description,
        extendedStory: listing.extendedStory,
        architect: listing.architect,
        yearBuilt: listing.yearBuilt,
        lotSize: listing.lotSize || '2 Kanal Plot',
        amenities: listing.amenities,
        images: [listing.exteriorImage, ...(listing.interiorImages || [])].filter(Boolean),
        status: listing.status,
      };
    }

    const portfolio = portfolioProjects.find((p) => p.id === id);
    if (portfolio) {
      let num = 385000000;
      if (portfolio.valuation.includes('Crore')) {
        const val = parseFloat(portfolio.valuation.replace(/[^0-9.]/g, ''));
        num = val * 10000000;
      }
      return {
        id: portfolio.id,
        name: portfolio.title,
        location: portfolio.location,
        price: portfolio.valuation,
        numericPrice: num,
        beds: portfolio.beds,
        baths: portfolio.baths,
        sqft: portfolio.size,
        category: portfolio.category,
        description: portfolio.summary,
        extendedStory: `Commissioned to the highest architectural standards, ${portfolio.title} stands as a benchmark of modern living in Pakistan. Situated in ${portfolio.location}, the property integrates rooftop solar microgrids, acoustic double-glazed windows, and custom deodar and travertine finishes.`,
        architect: portfolio.architect,
        yearBuilt: portfolio.projectDelivered,
        lotSize: portfolio.size,
        amenities: [
          'PCATP Licensed Architecture',
          'Heated Swimming Pool',
          'Full Hybrid Solar & Generator Backup',
          'Double-Height Drawing Room',
          'Car Porch for 4+ Vehicles',
          'Separate Servant & Guard Quarters',
        ],
        images: (portfolio.gallery && portfolio.gallery.length > 0 ? portfolio.gallery : [portfolio.image]).filter(Boolean),
        status: portfolio.status,
      };
    }

    return null;
  }, [id, propertyListings, portfolioProjects]);

  useEffect(() => {
    setActivePhotoIdx(0);
    if (project) {
      document.title = `${project.name} | Signature Projects | Avenue`;
    } else {
      document.title = 'Signature Project | Avenue Luxury Properties';
    }
  }, [project]);

  if (!project) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 text-center max-w-xl mx-auto flex flex-col items-center justify-center">
        <Building2 className="w-16 h-16 text-[#2F4B73] mb-4" />
        <h2 className="font-display font-extrabold text-2xl uppercase tracking-tight text-[#1B2A44]">
          Residence Not Found
        </h2>
        <p className="text-xs text-slate-500 font-body mt-2 mb-6">
          The requested property record may have been transferred or is protected under private non-disclosure.
        </p>
        <PillButton variant="dark" size="md" onClick={() => navigate('/projects')}>
          Return to Projects
        </PillButton>
      </div>
    );
  }

  const saved = isPropertySaved(project.id);

  const handleToggleHeart = () => {
    const isNowSaved = toggleSaveProperty(project.id);
    if (isNowSaved) {
      showToast(`Saved "${project.name}" to your shortlist.`, 'success');
    } else {
      showToast(`Removed "${project.name}" from shortlist.`, 'info');
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
      subject: `Private Site Visit: ${project.name}`,
      message: tourNotes.trim() || `Requested private site visit for ${project.name} on ${tourDate}.`,
      source: 'Project Detail Viewing Form',
      propertyTitle: project.name,
      preferredDate: tourDate,
    });
    setTourSubmitting(false);

    if (!res.success && !(res.unreachable && isEnquiryWebhookConfigured())) {
      showToast(res.error || 'Could not submit viewing request. Please try again.', 'error');
      return;
    }

    const siteVisitMessage = `Property: ${project.name} | Preferred Date: ${tourDate}${
      tourNotes.trim() ? ` | Notes: ${tourNotes.trim()}` : ''
    }`;
    void sendEnquiryToWebhook({
      name: tourName.trim(),
      email: tourEmail.trim(),
      phone: '',
      city: project.location,
      interest: 'Signature Project Site Visit',
      budget: project.price,
      message: siteVisitMessage,
      source: 'Site Visit',
      website,
    });

    setTourBooked(true);
    showToast('Viewing scheduled. Our director will confirm within 2 hours.', 'success');
  };

  // Financing calculation in PKR
  const downPaymentAmount = (project.numericPrice * downPaymentPercent) / 100;
  const loanPrincipal = project.numericPrice - downPaymentAmount;
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

  const isSold = project.status === 'Sold';

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Top Breadcrumbs & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <nav aria-label="Breadcrumb">
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
              <Link to="/projects" className="hover:text-[#1B2A44] transition-colors">
                Projects
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </li>
            <li className="text-[#1B2A44] font-bold truncate max-w-[200px] sm:max-w-xs" aria-current="page">
              {project.name}
            </li>
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/923001234567?text=${encodeURIComponent(
              `Assalam o Alaikum, I am inquiring about the signature project: ${project.name} (${project.price}).`
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

      {/* Main Gallery Hero Card */}
      <section className="bg-white rounded-[28px] sm:rounded-[36px] overflow-hidden p-4 sm:p-6 shadow-xl border border-slate-100">
        <div className="relative aspect-[16/9] lg:aspect-[21/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-slate-200">
          <SafeImage
            src={project.images[activePhotoIdx] || project.images[0]}
            alt={project.name}
            className="w-full h-full object-cover"
          />

          <div className="absolute top-4 left-4 glass-panel-dark px-3.5 py-1.5 rounded-full text-xs font-display uppercase tracking-widest text-white">
            Photo {Math.min(activePhotoIdx + 1, project.images.length)} of {project.images.length}
          </div>

          <div className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-2">
            {project.status && project.status !== 'Available' && (
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-display uppercase tracking-widest font-bold shadow-md ${
                  project.status === 'Sold'
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {project.status}
              </span>
            )}
            <div className="glass-panel-dark px-3.5 py-1.5 rounded-full text-xs font-display uppercase tracking-widest text-emerald-300">
              {project.category} Collection
            </div>
          </div>
        </div>

        {/* Thumbnail Selector */}
        {project.images.length > 1 && (
          <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2">
            {project.images.map((img, i) => (
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
        {/* Left Column: Property Details */}
        <div className="lg:col-span-8 space-y-8">
          {/* Headline & Specs Card */}
          <div className="bg-white rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 shadow-xl border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#2F4B73]">
                    <MapPin className="w-4 h-4" />
                    <span>{project.location}</span>
                  </div>
                  {project.status && project.status !== 'Available' && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold ${
                        project.status === 'Sold'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {project.status}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[#1B2A44] uppercase tracking-tight">
                  {project.name}
                </h1>
                <span className="text-xs font-display uppercase tracking-wider text-slate-500 mt-1 block">
                  Architect: {project.architect}
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-display tracking-widest text-slate-400 block">
                  Demanded Price
                </span>
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#1B2A44]">
                  {project.price}
                </span>
              </div>
            </div>

            {/* Quick Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-xs text-slate-700 font-body">
              <div className="p-4 rounded-2xl bg-[#E6ECF5]/40 border border-[#E6ECF5]">
                <Bed className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Bedrooms</span>
                <span className="font-bold text-sm text-[#1B2A44]">{project.beds} Master Beds</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#E6ECF5]/40 border border-[#E6ECF5]">
                <Bath className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Bathrooms</span>
                <span className="font-bold text-sm text-[#1B2A44]">{project.baths} Bathrooms</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#E6ECF5]/40 border border-[#E6ECF5]">
                <Maximize2 className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Covered Area</span>
                <span className="font-bold text-sm text-[#1B2A44]">{project.sqft}</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#E6ECF5]/40 border border-[#E6ECF5]">
                <Calendar className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Possession</span>
                <span className="font-bold text-sm text-[#1B2A44]">{project.yearBuilt}</span>
              </div>
            </div>

            {/* Architectural Statement Narrative */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-display uppercase tracking-widest text-[#2F4B73] font-bold">
                Property Monograph & Architectural Details
              </h3>
              <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-light">
                {project.extendedStory || project.description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-display uppercase tracking-widest text-[#2F4B73] font-bold mb-3">
                Residence Features & Utility Highlights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {project.amenities.map((item, idx) => (
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
                Confidential Viewing
              </span>
              <h3 className="font-display font-extrabold text-xl uppercase tracking-tight text-[#1B2A44]">
                SCHEDULE PRIVATE SITE VISIT
              </h3>
              <p className="text-xs text-slate-500 font-body mt-1">
                Visits are arranged directly by Avenue directors with confirmed society appointments.
              </p>
            </div>

            {tourBooked ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-display font-bold text-sm text-emerald-900 uppercase">
                  Viewing Confirmed
                </h4>
                <p className="text-xs text-emerald-800 font-body">
                  Assalam o Alaikum, {tourName}. An Avenue director will coordinate your private visit to the residence for {tourDate}.
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
                    placeholder="e.g. Fatima Noor"
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
                    placeholder="e.g. fatima.noor@example.com"
                    value={tourEmail}
                    onChange={(e) => setTourEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#2F4B73] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-wider text-slate-700 font-semibold mb-1">
                    Special Inquiries (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Inquire about solar capacity, servant quarters, possession status..."
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
              <span>Full architectural blueprints, registry and fard records, and society NOC approvals provided upon verified consultation.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
