import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HERO_ASSETS, HERO_STATS } from '../../../data/realEstateData';
import { BRAND_CONFIG } from '../../../config/brand.config';
import { PillButton } from '../../../components/common/PillButton';
import { useLanguage } from '../../../context/LanguageContext';
import { URGLISH_COPY } from '../../../data/urglishTranslations';
import { useRevealFallback } from '../../../lib/useAnimationFallback';

interface HeroProps {
  onOpenConsultation: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenConsultation }) => {
  const { t } = useLanguage();
  const [heroSrc, setHeroSrc] = useState<string>(HERO_ASSETS.heroImage);
  const { forceVisible, markCompleted } = useRevealFallback(1000);

  const handleHeroImgError = () => {
    if (heroSrc !== HERO_ASSETS.heroFallback) {
      setHeroSrc(HERO_ASSETS.heroFallback);
    }
  };

  return (
    <section
      id="hero"
      className="relative w-full pt-2 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto"
    >
      <div className="relative w-full min-h-[24rem] md:min-h-[460px] md:max-h-[560px] rounded-2xl md:rounded-[32px] overflow-hidden shadow-lg flex flex-col justify-end p-4 md:p-8 text-white bg-brand">
        {/* High-priority above-the-fold hero background image */}
        <img
          src={heroSrc}
          alt={`${BRAND_CONFIG.identity.brandShortName} architectural residence showcase`}
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          onError={handleHeroImgError}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          style={{ objectPosition: '65% center' }}
        />

        {/* Giant Brand Watermark */}
        <div className="hidden md:flex absolute inset-x-0 top-16 md:top-20 pointer-events-none select-none overflow-hidden justify-center z-0 px-4">
          <span
            className="font-display font-bold uppercase tracking-tighter text-center"
            style={{
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              lineHeight: 0.9,
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.02) 80%, transparent 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {BRAND_CONFIG.identity.watermarkText}
          </span>
        </div>

        {/* Contrast Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand/85 via-brand/40 to-transparent pointer-events-none z-0" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-brand/70 to-transparent pointer-events-none z-0" />

        {/* Spacer */}
        <div className="w-full h-6 shrink-0" />

        {/* Content in normal document flow */}
        <div className="relative z-20 w-full flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4 lg:gap-8 min-w-0">
          {/* Left: Text Block */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onAnimationComplete={markCompleted}
            style={forceVisible ? { opacity: 1, transform: 'none' } : undefined}
            className="w-full lg:max-w-[45%] min-w-0"
          >
            <h1
              className="font-display font-bold uppercase text-white max-w-[560px] text-[clamp(1.5rem,5.2vw,2rem)] md:text-[clamp(1.5rem,5.2vw,2.75rem)] leading-[1.05] tracking-[-0.01em]"
            >
              {`${BRAND_CONFIG.copy.hero.titleLine1} ${BRAND_CONFIG.copy.hero.titleLine2} ${BRAND_CONFIG.copy.hero.titleLine3}`}
            </h1>

            <p className="mt-2 sm:mt-2.5 font-body text-white/80 font-light leading-relaxed max-w-md line-clamp-2 text-xs sm:text-base">
              {t(BRAND_CONFIG.copy.hero.subtitle, URGLISH_COPY.hero.subtitle)}
            </p>

            <div className="mt-3 sm:mt-4">
              <PillButton
                variant="white"
                size="md"
                className="!text-xs sm:!text-sm !py-2 sm:!py-2.5 !px-5"
                onClick={onOpenConsultation}
              >
                {BRAND_CONFIG.copy.hero.ctaButtonLabel}
              </PillButton>
            </div>
          </motion.div>

          {/* Right: Stat Cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
            onAnimationComplete={markCompleted}
            style={forceVisible ? { opacity: 1, transform: 'none' } : undefined}
            className="flex flex-row flex-nowrap gap-2 sm:gap-3 shrink-0 w-full lg:w-auto min-w-0 overflow-x-auto snap-x snap-mandatory no-scrollbar"
          >
            {HERO_STATS.map((stat) => (
              <div
                key={stat.value}
                onClick={onOpenConsultation}
                className="p-2.5 rounded-2xl bg-white/15 border border-white/20 text-white flex-1 sm:flex-initial shrink-0 snap-start min-w-[110px] sm:min-w-[135px] cursor-pointer hover:bg-white/20 transition-all shadow-md group flex flex-col justify-center"
              >
                <div
                  className="font-display font-bold tracking-tight text-white group-hover:scale-105 transition-transform text-lg"
                  style={{ lineHeight: 1.1 }}
                >
                  {stat.value}
                </div>

                <div className="mt-1 text-[0.65rem] sm:text-[11px] uppercase tracking-wider font-display font-medium text-white/80 whitespace-normal leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
