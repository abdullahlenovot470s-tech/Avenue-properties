import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PropertyListing, PortfolioProject } from '../../types';
import { SafeImage } from '../common/SafeImage';
import { PillButton } from '../common/PillButton';
import { X, MapPin, Bed, Bath, Maximize2, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PropertyDetailModalProps {
  property: PropertyListing | PortfolioProject | null;
  isOpen: boolean;
  onClose: () => void;
  onBookViewing: (name: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onBookViewing,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  if (!isOpen || !property) return null;

  // Unify property vs portfolio item images & fields
  const isListing = 'exteriorImage' in property;
  const name = isListing ? property.name : property.title;
  const location = property.location;
  const price = isListing ? property.price : property.valuation;
  const beds = property.beds;
  const baths = property.baths;
  const sqft = isListing ? property.sqft : property.size;
  const description = isListing ? property.description : property.summary;
  const amenities = isListing
    ? property.amenities
    : [
        'Solar Hybrid Inverter System',
        'Double Glazed Acoustic Windows',
        'Swimming Pool',
        'Separate Servant Quarters',
        '24/7 Society Guard Patrol'
      ];

  const images = isListing
    ? [property.exteriorImage, property.interiorImages[0], property.interiorImages[1]]
    : [property.image];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-[28px] sm:rounded-[36px] overflow-hidden text-[#1B2A44] shadow-2xl p-6 sm:p-10 border border-slate-100 max-h-[92vh] flex flex-col justify-between overflow-y-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#1B2A44] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            {/* Gallery Main Photo */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden shadow-lg border border-slate-200">
              <SafeImage
                src={images[activePhotoIdx] || images[0]}
                alt={name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 glass-panel-dark px-3 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-white">
                Photo {activePhotoIdx + 1} of {images.length}
              </div>
            </div>

            {/* Thumbnail Selectors if multiple */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 mt-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhotoIdx(i)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activePhotoIdx === i
                        ? 'border-[#1B2A44] scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <SafeImage src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Header info */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2F4B73] mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{location}</span>
                </div>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[#1B2A44]">
                  {name}
                </h3>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-[10px] uppercase font-display tracking-wider text-slate-500 block">
                  Offered Exclusively At
                </span>
                <span className="font-display font-bold text-2xl text-[#1B2A44]">
                  {price}
                </span>
              </div>
            </div>

            {/* Specs Row */}
            <div className="grid grid-cols-3 gap-3 py-4 my-2 border-b border-slate-100 text-xs sm:text-sm text-[#1B2A44]">
              <div className="flex items-center gap-2 bg-[#E6ECF5]/40 p-3 rounded-xl">
                <Bed className="w-4 h-4 text-[#2F4B73]" />
                <span>{beds} Bedrooms</span>
              </div>
              <div className="flex items-center gap-2 bg-[#E6ECF5]/40 p-3 rounded-xl">
                <Bath className="w-4 h-4 text-[#2F4B73]" />
                <span>{baths} Bathrooms</span>
              </div>
              <div className="flex items-center gap-2 bg-[#E6ECF5]/40 p-3 rounded-xl">
                <Maximize2 className="w-4 h-4 text-[#2F4B73]" />
                <span>{sqft}</span>
              </div>
            </div>

            {/* Description Narrative */}
            <div className="py-2">
              <h4 className="text-xs font-display uppercase tracking-widest text-slate-500 mb-2">
                Architectural Statement
              </h4>
              <p className="font-body text-xs sm:text-sm text-[#1B2A44]/80 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="py-3">
              <h4 className="text-xs font-display uppercase tracking-widest text-slate-500 mb-2.5">
                Key Property Features
              </h4>
              <div className="flex flex-wrap gap-2">
                {amenities.map((item, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Complete fard, registry, and society NOC verification available upon request</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <PillButton
                variant="dark"
                size="md"
                onClick={() => {
                  onClose();
                  onBookViewing(name);
                }}
                className="w-full sm:w-auto"
              >
                Schedule Private Viewing
              </PillButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
