import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand.config';
import { useLanguage } from '../../context/LanguageContext';
import { URGLISH_COPY } from '../../data/urglishTranslations';

interface InstallmentCalculatorProps {
  defaultPrice: number;
}

function formatPKRSummary(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return `${BRAND_CONFIG.locale.currencyCode} 0`;
  }
  if (amount >= 10000000) {
    return `${BRAND_CONFIG.locale.currencyCode} ${(amount / 10000000).toFixed(2)} Crore`;
  }
  if (amount >= 100000) {
    return `${BRAND_CONFIG.locale.currencyCode} ${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `${BRAND_CONFIG.locale.currencyCode} ${Math.round(amount).toLocaleString('en-PK')}`;
}

export const InstallmentCalculator: React.FC<InstallmentCalculatorProps> = ({
  defaultPrice,
}) => {
  const { t } = useLanguage();
  const [price, setPrice] = useState<number>(defaultPrice > 0 ? defaultPrice : 0);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30);
  const [years, setYears] = useState<number>(15);
  const [annualRate, setAnnualRate] = useState<number>(
    BRAND_CONFIG.finance.defaultAnnualRate
  );

  useEffect(() => {
    if (defaultPrice > 0) {
      setPrice(defaultPrice);
    }
  }, [defaultPrice]);

  if (!BRAND_CONFIG.features.enableCalculator) {
    return null;
  }

  const safePrice = Math.max(0, Number.isFinite(price) ? price : 0);
  const safeDownPct = Math.min(90, Math.max(0, downPaymentPercent));
  const safeYears = Math.min(30, Math.max(1, years));
  const safeRate = Math.min(40, Math.max(0, Number.isFinite(annualRate) ? annualRate : 0));

  const downPaymentAmount = (safePrice * safeDownPct) / 100;
  const principal = Math.max(0, safePrice - downPaymentAmount);
  const totalMonths = safeYears * 12;
  const monthlyRate = safeRate / 100 / 12;

  const monthlyInstallment =
    principal <= 0
      ? 0
      : monthlyRate > 0
        ? (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
          (Math.pow(1 + monthlyRate, totalMonths) - 1)
        : principal / totalMonths;

  const totalPayable = downPaymentAmount + monthlyInstallment * totalMonths;

  return (
    <div className="bg-brand rounded-2xl md:rounded-[36px] p-5 md:p-10 text-brand-contrast shadow-xl space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-contrast/10 pb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Calculator className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
          <h3 className="font-display font-bold text-[clamp(1rem,3.6vw,1.25rem)] md:text-xl uppercase tracking-tight text-brand-contrast">
            HOME FINANCING &amp; INSTALLMENT CALCULATOR
          </h3>
        </div>
        <span className="text-[10px] font-display uppercase tracking-widest text-brand-contrast/60">
          {BRAND_CONFIG.locale.nationalityAdjective} Bank / Developer Model
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div>
          <label
            htmlFor="calc-price"
            className="block text-[10px] uppercase font-display tracking-wider text-brand-contrast/70 mb-1.5"
          >
            Property Price ({BRAND_CONFIG.locale.currencyCode})
          </label>
          <input
            id="calc-price"
            type="number"
            min="0"
            step="100000"
            value={price || ''}
            onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-brand-contrast font-display font-bold text-sm focus:outline-none focus:border-white/50"
          />
          <span className="block text-[11px] text-brand-contrast/70 mt-1">
            {formatPKRSummary(safePrice)}
          </span>
        </div>

        <div>
          <label
            htmlFor="calc-downpayment"
            className="block text-[10px] uppercase font-display tracking-wider text-brand-contrast/70 mb-1"
          >
            Down Payment ({safeDownPct}%)
          </label>
          <div className="font-display font-bold text-base text-emerald-300">
            {formatPKRSummary(downPaymentAmount)}
          </div>
          <input
            id="calc-downpayment"
            type="range"
            min="10"
            max="80"
            step="5"
            value={safeDownPct}
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="w-full mt-2 accent-white cursor-pointer"
          />
        </div>

        <div>
          <label
            htmlFor="calc-years"
            className="block text-[10px] uppercase font-display tracking-wider text-brand-contrast/70 mb-1"
          >
            Tenure ({safeYears} {safeYears === 1 ? 'Year' : 'Years'})
          </label>
          <div className="font-display font-bold text-base text-brand-contrast">
            {totalMonths} Months
          </div>
          <input
            id="calc-years"
            type="range"
            min="1"
            max="25"
            step="1"
            value={safeYears}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full mt-2 accent-white cursor-pointer"
          />
        </div>

        <div>
          <label
            htmlFor="calc-rate"
            className="block text-[10px] uppercase font-display tracking-wider text-brand-contrast/70 mb-1.5"
          >
            Annual Rate (%)
          </label>
          <input
            id="calc-rate"
            type="number"
            min="0"
            max="40"
            step="0.25"
            value={annualRate}
            onChange={(e) => setAnnualRate(Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-brand-contrast font-display font-bold text-sm focus:outline-none focus:border-white/50"
          />
          <span className="block text-[11px] text-brand-contrast/70 mt-1">
            {safeRate.toFixed(2)}% p.a.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-brand-contrast/10">
        <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
          <span className="block text-[10px] uppercase font-display tracking-wider text-brand-contrast/70">
            Estimated Monthly Installment
          </span>
          <div className="font-display font-bold text-xl sm:text-2xl text-amber-200 mt-1">
            {formatPKRSummary(monthlyInstallment)}
            <span className="text-xs text-brand-contrast/70 font-body font-normal"> / mo</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
          <span className="block text-[10px] uppercase font-display tracking-wider text-brand-contrast/70">
            Total Payable (Down Payment + Installments)
          </span>
          <div className="font-display font-bold text-xl sm:text-2xl text-emerald-300 mt-1">
            {formatPKRSummary(totalPayable)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-brand-contrast/70 font-body">
        <span>Estimate only. Not a bank offer.</span>
        <span>
          {t(
            'Excludes stamp duty, CVT & society transfer fee.',
            URGLISH_COPY.detailPages.financingExclusionNote
          )}
        </span>
      </div>
    </div>
  );
};
