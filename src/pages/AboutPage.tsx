import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { TEAM_MEMBERS, HERO_ASSETS, HERO_STATS } from '../data/realEstateData';
import { SafeImage } from '../components/common/SafeImage';
import { AvatarPlaceholder } from '../components/common/AvatarPlaceholder';
import { PillButton } from '../components/common/PillButton';
import { Award, Compass, ShieldCheck, Landmark, Check } from 'lucide-react';

interface AboutPageProps {
  onOpenConsultation: (service?: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onOpenConsultation }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = 'About Avenue | Luxury Properties & Architecture';
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Hero Narrative Card with Ghost Watermark */}
      <section className="relative w-full bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden p-6 sm:p-10 md:p-14 shadow-xl border border-slate-100">
        <div className="absolute top-4 right-0 pointer-events-none select-none overflow-hidden max-w-full z-0">
          <span
            className="font-display font-black leading-none uppercase tracking-tighter text-[#E2E8F0]/30 select-none"
            style={{ fontSize: 'clamp(4rem, 12vw, 7.5rem)' }}
          >
            HERITAGE
          </span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
            The Avenue Manifesto
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-[#1B2A44] uppercase tracking-tight leading-none">
            DEFINING ARCHITECTURAL EXCELLENCE IN PAKISTAN.
          </h1>
          <p className="font-body text-sm sm:text-base text-[#1B2A44]/80 leading-relaxed font-light">
            Founded on the belief that a home is a family's foundation and enduring legacy, Avenue bridges visionary modern architecture with clear legal titles and transparent transfers. We operate not merely as conventional agents, but as trusted advisors for Pakistan's premier family residences.
          </p>

          <div className="pt-2 flex items-center gap-4">
            <PillButton
              variant="dark"
              size="md"
              onClick={() => onOpenConsultation('Private Representation Consultation')}
            >
              Consultation
            </PillButton>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-display uppercase tracking-widest text-[#1B2A44] hover:text-[#2F4B73] font-semibold underline underline-offset-4 cursor-pointer"
            >
              Explore Portfolio
            </button>
          </div>
        </div>
      </section>

      {/* Two-Column Story & Architectural Walkway Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 bg-[#1B2A44] text-white rounded-[28px] sm:rounded-[36px] p-8 sm:p-12 md:p-14 shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <span className="text-[10px] font-display uppercase tracking-widest text-white/60 block">
              Core Principles
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl uppercase tracking-tight">
              PRECISION OVER VOLUME. INTEGRITY OVER SPEED.
            </h2>
            <p className="font-body text-xs sm:text-sm text-white/80 leading-relaxed font-light">
              Unlike volume-driven realtors, Avenue represents a vetted selection of luxury residences across Lahore, Islamabad, and Karachi. Each property undergoes a comprehensive audit verifying clear fard and registry, society NOC approval (LDA, CDA, DHA, Bahria), structural stability, and reliable solar and utility infrastructure.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>100% verified society transfers and clean possession</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Direct consultation with PCATP-registered architects</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Assistance for overseas Pakistanis with power of attorney</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Load-shedding-proof solar microgrid & generator inspection</span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between border-t border-white/10 mt-8">
            {HERO_STATS.map((s) => (
              <div key={s.value}>
                <div className="font-display font-bold text-2xl text-white">{s.value}</div>
                <div className="text-[11px] text-white/60 font-display uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 relative aspect-[16/9] lg:aspect-auto rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-xl min-h-[320px] group border border-slate-200">
          <SafeImage
            src={HERO_ASSETS.approachWalkway}
            alt="Avenue Architecture Walkway"
            width={1200}
            height={675}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A44]/80 via-transparent to-transparent flex items-end p-8">
            <div className="glass-panel p-5 rounded-2xl text-white w-full">
              <span className="text-[10px] uppercase font-display tracking-widest text-white/70 block">
                Avenue Archive #094
              </span>
              <div className="font-display font-bold text-base">DHA Phase 6 Promenade, Lahore</div>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership & Founding Partners */}
      <section className="bg-white rounded-[28px] sm:rounded-[36px] p-8 sm:p-14 md:p-16 shadow-xl border border-slate-100">
        <div className="mb-10">
          <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block mb-1">
            Executive Leadership
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#1B2A44] uppercase tracking-tight">
            PARTNERS & DIRECTORS
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 font-medium font-body mt-1 max-w-xl">
            Led by senior Pakistani property and architecture professionals with degrees from NCA Lahore, IBA Karachi, and NUST.
          </p>
        </div>

        {/* 1. Mobile 2x2 Team Grid (< sm) */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-32 rounded-xl overflow-hidden mb-2 border border-slate-200/80 bg-[#1B2A44] shadow-xs">
                  <AvatarPlaceholder
                    variant={member.avatarVariant}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 right-1.5 glass-panel-dark px-2 py-0.5 rounded-full text-[9px] font-display uppercase tracking-wider text-white">
                    {member.location}
                  </div>
                </div>

                <h3 className="font-display font-bold text-[0.88rem] text-[#1B2A44] uppercase tracking-tight truncate leading-tight">
                  {member.name}
                </h3>
                <span className="text-[0.72rem] font-medium text-[#2F4B73] block truncate font-display">
                  {member.role}
                </span>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-200/60">
                <button
                  onClick={() => onOpenConsultation(`Consultation with ${member.name}`)}
                  className="text-[0.72rem] font-display uppercase tracking-wider text-[#1B2A44] hover:text-[#2F4B73] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Book Consultation</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 2. Tablet & Desktop Team Grid (>= sm) */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <div>
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-5 border border-slate-200/80 bg-[#1B2A44] shadow-md group">
                  <AvatarPlaceholder
                    variant={member.avatarVariant}
                    className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 glass-panel-dark px-3 py-1 rounded-full text-[10px] font-display uppercase tracking-wider text-white">
                    {member.location}
                  </div>
                </div>

                <h3 className="font-display font-bold text-base sm:text-lg text-[#1B2A44] uppercase tracking-tight">
                  {member.name}
                </h3>
                <span className="text-xs font-semibold text-[#2F4B73] block mb-2 font-display">
                  {member.role}
                </span>

                <p className="text-xs text-slate-700 font-body leading-relaxed">{member.bio}</p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-200/60">
                <button
                  onClick={() => onOpenConsultation(`Consultation with ${member.name}`)}
                  className="text-[11px] font-display uppercase tracking-wider text-[#1B2A44] hover:text-[#2F4B73] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Book Consultation</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Block */}
      <section className="bg-[#2F4B73] rounded-[28px] sm:rounded-[36px] p-8 sm:p-14 text-white text-center shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <h3 className="font-display font-black text-2xl sm:text-4xl uppercase tracking-tight">
            DISCUSS AN ACQUISITION WITH AVENUE
          </h3>
          <p className="font-body text-xs sm:text-sm text-white/80 leading-relaxed font-light">
            Whether evaluating a residential plot or acquiring a completed luxury home in DHA, Islamabad, or Karachi, our managing partners offer trusted counsel.
          </p>
          <div className="pt-2 flex items-center justify-center">
            <PillButton
              variant="white"
              size="lg"
              onClick={() => onOpenConsultation('Partner Consultation')}
            >
              Schedule Partner Consultation
            </PillButton>
          </div>
        </div>
      </section>
    </div>
  );
};
