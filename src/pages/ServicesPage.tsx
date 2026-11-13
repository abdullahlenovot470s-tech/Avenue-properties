import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SERVICES_OFFERED, HERO_ASSETS } from '../data/realEstateData';
import { SafeImage } from '../components/common/SafeImage';
import { PillButton } from '../components/common/PillButton';
import { Check, ShieldCheck, ArrowRight, Layers, Briefcase, FileCheck, Landmark } from 'lucide-react';

interface ServicesPageProps {
  onOpenConsultation: (serviceTitle?: string) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenConsultation }) => {
  const [activeTab, setActiveTab] = useState<string>(SERVICES_OFFERED[0].id);

  const selectedService = SERVICES_OFFERED.find((s) => s.id === activeTab) || SERVICES_OFFERED[0];

  React.useEffect(() => {
    document.title = 'Services & Advisory | Avenue Luxury Properties';
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header Banner */}
      <section className="relative w-full bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden p-6 sm:p-10 md:p-14 shadow-xl border border-slate-100">
        <div className="absolute top-4 right-0 pointer-events-none select-none overflow-hidden max-w-full z-0">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-[#E2E8F0]/30 select-none"
            style={{ fontSize: 'clamp(4rem, 12vw, 7.5rem)' }}
          >
            SERVICES
          </span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
            End-To-End Advisory Practice
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-[#1B2A44] uppercase tracking-tight leading-none">
            STRATEGIC PROPERTY & ARCHITECTURAL ADVISORY.
          </h1>
          <p className="font-body text-sm sm:text-base text-[#1B2A44]/80 leading-relaxed font-light">
            We operate at the intersection of modern architecture and family property preservation, providing Pakistani buyers and overseas families with absolute transparency, verified documentation, and off-market access.
          </p>
        </div>
      </section>

      {/* Interactive 3-Pillar Explorer */}
      <section className="bg-[#2F4B73] rounded-[28px] sm:rounded-[36px] p-6 sm:p-12 md:p-16 text-white shadow-2xl relative overflow-hidden">
        {/* Navigation Tabs for Services */}
        <div className="flex flex-wrap gap-2.5 pb-8 border-b border-white/15">
          {SERVICES_OFFERED.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                activeTab === s.id
                  ? 'bg-white text-[#1B2A44] shadow-md scale-102'
                  : 'glass-card-subtle text-white/80 hover:text-white hover:bg-white/15'
              }`}
            >
              {s.number}. {s.title}
            </button>
          ))}
        </div>

        {/* Active Service Detailed Presentation */}
        <div className="pt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-6">
            <span className="text-[10px] font-display uppercase tracking-widest text-white/60 block">
              Pillar {selectedService.number}
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-4xl uppercase tracking-tight">
              {selectedService.title}
            </h2>
            <p className="font-body text-xs sm:text-sm text-white/80 leading-relaxed font-light">
              {selectedService.description}
            </p>

            {/* Scope Details */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-display uppercase tracking-wider text-white/90">
                Core Engagement Scope:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedService.expandedDetails.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-white/80">
                    <Check className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deliverables List */}
            {selectedService.deliverables && (
              <div className="p-5 rounded-2xl glass-panel border border-white/20 mt-4">
                <div className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-amber-200 mb-2">
                  <FileCheck className="w-4 h-4 text-amber-300" />
                  <span>Key Practice Deliverables</span>
                </div>
                <ul className="space-y-2 text-xs text-white/90">
                  {selectedService.deliverables.map((del, dIdx) => (
                    <li key={dIdx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{del}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4">
              <PillButton
                variant="white"
                size="md"
                onClick={() => onOpenConsultation(selectedService.title)}
              >
                Retain Avenue for {selectedService.title}
              </PillButton>
            </div>
          </div>

          {/* Right Visual Card */}
          <div className="lg:col-span-5 relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-white/20 group">
            <SafeImage
              src={selectedService.thumbnailImage || HERO_ASSETS.serviceVilla}
              alt={selectedService.title}
              width={800}
              height={600}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A44]/90 via-transparent to-transparent flex items-end p-6">
              <div className="text-white">
                <span className="text-[10px] font-display uppercase tracking-widest text-white/70 block">
                  Avenue Advisory Standard
                </span>
                <span className="text-sm font-display font-bold">
                  Strict Confidentiality Assured
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Specialized Services Grid */}
      <section className="bg-white rounded-[28px] sm:rounded-[36px] p-8 sm:p-14 md:p-16 shadow-xl border border-slate-100">
        <div className="mb-10">
          <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block mb-1">
            Specialised Capabilities
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#1B2A44] uppercase tracking-tight">
            FAMILY OFFICES & OVERSEAS DESK
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-body mt-1 max-w-xl">
            Tailored property solutions designed for family groups, corporate investors, and overseas Pakistanis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B2A44] text-white flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[#1B2A44] uppercase">
              Family Property Management
            </h3>
            <p className="text-xs text-slate-600 font-body leading-relaxed">
              We manage property portfolios for business families, handling society transfers, verified tenant placement, and annual property valuation reviews.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B2A44] text-white flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[#1B2A44] uppercase">
              Architect & Builder Coordination
            </h3>
            <p className="text-xs text-slate-600 font-body leading-relaxed">
              For clients constructing custom houses, we connect you with PCATP-licensed architects and trusted construction contractors in Lahore, Islamabad, and Karachi.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B2A44] text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-[#1B2A44] uppercase">
              Discreet Private Sales
            </h3>
            <p className="text-xs text-slate-600 font-body leading-relaxed">
              Sell premium residences without public signage or unverified walkthroughs. Sales are arranged discreetly between verified principals.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
