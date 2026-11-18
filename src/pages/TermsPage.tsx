// Have a lawyer review before use for a real client.
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand.config';
import { usePageMeta } from '../lib/seo';

export const TermsPage: React.FC = () => {
  const businessName = BRAND_CONFIG.identity.brandName;
  const contactEmail = BRAND_CONFIG.contact.email.general;
  const headOffice = BRAND_CONFIG.contact.offices[0];

  usePageMeta({
    title: `Terms of Use | ${businessName}`,
    description: `Terms and conditions governing website access, property information, enquiries, and advisory disclaimers for ${businessName}.`,
    path: '/#/terms',
  });

  return (
    <div className="min-h-[100svh] pt-20 md:pt-28 pb-6 md:pb-20 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl md:rounded-[36px] p-5 md:p-12 shadow-xl border border-slate-100 space-y-6 md:space-y-8">
        <div className="border-b border-slate-200 pb-5 md:pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-display uppercase tracking-widest text-accent font-semibold">
            <FileText className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>Website &amp; Advisory Terms</span>
          </div>
          <h1 className="font-display font-bold md:font-extrabold text-[clamp(1.5rem,5.5vw,2rem)] md:text-4xl uppercase tracking-tight text-brand">
            Terms of Use
          </h1>
          <p className="font-body text-xs sm:text-sm text-slate-500">
            {businessName} · General Terms &amp; Conditions
          </p>
        </div>

        <div className="space-y-6 font-body text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using this website operated by {businessName}, submitting an enquiry, or registering an account, you agree to these Terms of Use and our{' '}
              <Link to="/privacy" className="text-brand font-semibold underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              2. Property Listings &amp; Estimates
            </h2>
            <p>
              Property descriptions, floor areas, availability status, prices, maps, and financing or installment calculations shown on this website are provided for general informational purposes only. Figures displayed by calculators or estimators are approximate only and do not constitute a formal offer, valuation, or bank financing commitment.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              3. User Accounts &amp; Acceptable Use
            </h2>
            <p>
              When creating an account or submitting forms, you agree to provide accurate contact details and not to misuse automated tools, spam protections, or inquiry channels. We reserve the right to suspend or remove accounts or submissions that violate applicable laws or attempt unauthorized access.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              4. Third-Party Services &amp; Data Processing
            </h2>
            <p>
              Our website relies on third-party infrastructure such as Google Firebase (authentication and database storage), external messaging links (such as WhatsApp), map embeds, and optional traffic analytics. Your interactions with external services are subject to their respective terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              5. Limitation of Liability &amp; Contact
            </h2>
            <p>
              All real estate transactions remain subject to independent legal title verification, formal written agreements, and applicable local authority approvals. For questions regarding these terms or to request removal of your account data, contact {businessName}
              {headOffice ? ` at ${headOffice.address} (${headOffice.city})` : ''} or email{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-brand font-semibold underline underline-offset-4 hover:text-accent"
              >
                {contactEmail}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-display uppercase tracking-wider">
          <Link to="/privacy" className="text-accent hover:text-brand underline underline-offset-4">
            Read Privacy Policy
          </Link>
          <Link to="/" className="text-brand hover:text-accent">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
