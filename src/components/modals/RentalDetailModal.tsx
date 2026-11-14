import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RentalListing } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { useToast } from '../../context/ToastContext';
import { submitInquiry } from '../../lib/inquiriesApi';
import { sendEnquiryToWebhook, isEnquiryWebhookConfigured } from '../../services/enquiryWebhook';
import { BRAND_CONFIG } from '../../config/brand.config';
import {
  X,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Send,
} from 'lucide-react';
import { formatRent } from '../../data/rentalsData';

interface RentalDetailModalProps {
  isOpen: boolean;
  rental: RentalListing | null;
  onClose: () => void;
  onBookViewing?: (rentalTitle: string) => void;
}

export const RentalDetailModal: React.FC<RentalDetailModalProps> = ({
  isOpen,
  rental,
  onClose,
  onBookViewing,
}) => {
  const { showToast } = useToast();
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [website, setWebsite] = useState('');

  if (!isOpen || !rental) return null;

  const images = rental.gallery && rental.gallery.length > 0 ? rental.gallery : [rental.image];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (website.trim()) {
      return;
    }
    if (!tenantName.trim() || !tenantPhone.trim() || !visitDate) {
      showToast('Please provide your name, phone number, and preferred date.', 'error');
      return;
    }
    setBookingSubmitting(true);
    const res = await submitInquiry({
      name: tenantName.trim(),
      phone: tenantPhone.trim(),
      office: rental.city,
      subject: `Rental Inspection: ${rental.title}`,
      message: `Requested tenant site inspection for ${rental.title} on ${visitDate}.`,
      source: 'Rental Quick View Modal',
      propertyTitle: rental.title,
      preferredDate: visitDate,
    });
    setBookingSubmitting(false);

    if (!res.success && !(res.unreachable && isEnquiryWebhookConfigured())) {
      showToast(res.error || 'Could not submit viewing request. Please try again.', 'error');
      return;
    }

    void sendEnquiryToWebhook({
      name: tenantName.trim(),
      email: '',
      phone: tenantPhone.trim(),
      city: rental.city,
      interest: `Rent - ${rental.type}`,
      budget: formatRent(rental.monthlyRent),
      message: `Property: ${rental.title} | Preferred Date: ${visitDate}`,
      source: 'Site Visit',
      website,
    });

    setBookingSubmitted(true);
    showToast(
      `Viewing request registered for ${rental.title}. A ${BRAND_CONFIG.identity.brandShortName} leasing advisor will contact you.`,
      'success'
    );
    if (onBookViewing) {
      onBookViewing(rental.title);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-brand/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-white rounded-[28px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-slate-100 z-10 max-h-[92vh] flex flex-col"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-accent">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Verified {BRAND_CONFIG.identity.brandShortName} Lease</span>
              <span>•</span>
              <span className="text-slate-500">{rental.city}</span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
            <div className="space-y-3">
              <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <SafeImage
                  src={images[activeImgIndex] || rental.image}
                  alt={rental.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 glass-panel-dark px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-widest text-white">
                  {rental.furnished} • {rental.type}
                </div>
                <div className="absolute bottom-3 right-3 glass-panel-dark px-3 py-1 rounded-full text-xs font-display font-bold text-emerald-300">
                  {formatRent(rental.monthlyRent)}
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImgIndex(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeImgIndex === idx
                          ? 'border-brand scale-105 shadow-sm'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <SafeImage src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-accent font-semibold mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>{rental.areaSociety}</span>
                </div>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-brand uppercase tracking-tight">
                  {rental.title}
                </h2>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] uppercase font-display tracking-widest text-slate-400 block">
                  Monthly Rent
                </span>
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-brand">
                  {formatRent(rental.monthlyRent)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Bed className="w-4 h-4 text-accent mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Bedrooms</span>
                <span className="font-bold text-sm text-brand">{rental.beds} Beds</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Bath className="w-4 h-4 text-accent mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Baths</span>
                <span className="font-bold text-sm text-brand">{rental.baths} Baths</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Maximize2 className="w-4 h-4 text-accent mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Size / Floor</span>
                <span className="font-bold text-sm text-brand">{rental.sizeOrFloor}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Calendar className="w-4 h-4 text-accent mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Possession</span>
                <span className="font-bold text-sm text-brand">{rental.availableFrom}</span>
              </div>
            </div>

            <div className="bg-brand text-brand-contrast p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <FileText className="w-4 h-4 text-amber-300" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-brand-contrast">
                  Lease & Contract Terms
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-body">
                <div>
                  <span className="text-[10px] uppercase font-display tracking-wider text-brand-contrast/60 block">
                    Security Deposit
                  </span>
                  <span className="font-bold text-sm text-emerald-300">{rental.securityDeposit}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-display tracking-wider text-brand-contrast/60 block">
                    Advance Rent
                  </span>
                  <span className="font-bold text-sm text-brand-contrast">{rental.advanceRent}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-display tracking-wider text-brand-contrast/60 block">
                    Minimum Tenancy
                  </span>
                  <span className="font-bold text-sm text-brand-contrast">{rental.minContractPeriod}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-display font-bold text-xs uppercase tracking-widest text-accent">
                Property Overview
              </h4>
              <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-light">
                {rental.description}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-display font-bold text-xs uppercase tracking-widest text-accent">
                Verified Building & Society Amenities
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rental.amenities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              {bookingSubmitted ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-display font-bold text-sm text-emerald-900 uppercase">
                    Viewing Registered
                  </h4>
                  <p className="text-xs text-emerald-800 font-body">
                    Thank you, {tenantName}. A {BRAND_CONFIG.identity.brandShortName} leasing advisor will coordinate key handover and society entry for {visitDate}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
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
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    <h4 className="font-display font-bold text-xs uppercase tracking-widest text-brand">
                      Schedule Tenant Site Inspection
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-accent"
                    />
                    <input
                      type="tel"
                      required
                      placeholder={`Mobile No. (e.g. ${BRAND_CONFIG.locale.placeholderNames.rentalDetailPhone})`}
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-accent"
                    />
                    <input
                      type="date"
                      required
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full py-3 rounded-full bg-brand hover:bg-accent disabled:opacity-60 text-brand-contrast hover:text-accent-contrast font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{bookingSubmitting ? 'Registering Visit...' : 'Request Visit Slot'}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
