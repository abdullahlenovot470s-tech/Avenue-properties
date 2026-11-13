import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RentalListing } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { PillButton } from '../common/PillButton';
import { useToast } from '../../context/ToastContext';
import { submitInquiry } from '../../lib/inquiriesApi';
import {
  X,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Clock,
  FileText,
  DollarSign,
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

  if (!isOpen || !rental) return null;

  const images = rental.gallery && rental.gallery.length > 0 ? rental.gallery : [rental.image];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    if (!res.success) {
      showToast(res.error || 'Could not submit viewing request. Please try again.', 'error');
      return;
    }

    setBookingSubmitted(true);
    showToast(`Viewing request registered for ${rental.title}. An Avenue leasing advisor will contact you.`, 'success');
    if (onBookViewing) {
      onBookViewing(rental.title);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1B2A44]/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-white rounded-[28px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-slate-100 z-10 max-h-[92vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-[#2F4B73]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Verified Avenue Lease</span>
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

          {/* Scrollable Modal Body */}
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
            {/* Gallery Section */}
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
                          ? 'border-[#1B2A44] scale-105 shadow-sm'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <SafeImage src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Core Details */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[#2F4B73] font-semibold mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>{rental.areaSociety}</span>
                </div>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1B2A44] uppercase tracking-tight">
                  {rental.title}
                </h2>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] uppercase font-display tracking-widest text-slate-400 block">
                  Monthly Rent
                </span>
                <span className="font-display font-extrabold text-2xl sm:text-3xl text-[#1B2A44]">
                  {formatRent(rental.monthlyRent)}
                </span>
              </div>
            </div>

            {/* Quick Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Bed className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Bedrooms</span>
                <span className="font-bold text-sm text-[#1B2A44]">{rental.beds} Beds</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Bath className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Baths</span>
                <span className="font-bold text-sm text-[#1B2A44]">{rental.baths} Baths</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Maximize2 className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Size / Floor</span>
                <span className="font-bold text-sm text-[#1B2A44]">{rental.sizeOrFloor}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <Calendar className="w-4 h-4 text-[#2F4B73] mb-1" />
                <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">Possession</span>
                <span className="font-bold text-sm text-[#1B2A44]">{rental.availableFrom}</span>
              </div>
            </div>

            {/* Lease Terms Box */}
            <div className="bg-[#1B2A44] text-white p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <FileText className="w-4 h-4 text-amber-300" />
                <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white">
                  Lease & Contract Terms
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-body">
                <div>
                  <span className="text-[10px] uppercase font-display tracking-wider text-white/60 block">
                    Security Deposit
                  </span>
                  <span className="font-bold text-sm text-emerald-300">{rental.securityDeposit}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-display tracking-wider text-white/60 block">
                    Advance Rent
                  </span>
                  <span className="font-bold text-sm text-white">{rental.advanceRent}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-display tracking-wider text-white/60 block">
                    Minimum Tenancy
                  </span>
                  <span className="font-bold text-sm text-white">{rental.minContractPeriod}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#2F4B73]">
                Property Overview
              </h4>
              <p className="font-body text-xs sm:text-sm text-slate-700 leading-relaxed font-light">
                {rental.description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="space-y-3">
              <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#2F4B73]">
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

            {/* Schedule Visit Form */}
            <div className="border-t border-slate-100 pt-6">
              {bookingSubmitted ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-display font-bold text-sm text-emerald-900 uppercase">
                    Viewing Registered
                  </h4>
                  <p className="text-xs text-emerald-800 font-body">
                    Thank you, {tenantName}. An Avenue leasing advisor will coordinate key handover and society entry for {visitDate}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#2F4B73]" />
                    <h4 className="font-display font-bold text-xs uppercase tracking-widest text-[#1B2A44]">
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
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Mobile No. (e.g. 0300-1234567)"
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                    />
                    <input
                      type="date"
                      required
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#2F4B73]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full py-3 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] disabled:opacity-60 text-white font-display font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
