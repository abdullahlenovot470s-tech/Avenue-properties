// Have a lawyer review before use for a real client.
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand.config';
import { usePageMeta } from '../lib/seo';

export const PrivacyPolicyPage: React.FC = () => {
  const businessName = BRAND_CONFIG.identity.brandName;
  const contactEmail = BRAND_CONFIG.contact.email.general;
  const headOffice = BRAND_CONFIG.contact.offices[0];

  usePageMeta({
    title: `Privacy Policy | ${businessName}`,
    description: `Privacy policy explaining how ${businessName} collects, stores, and processes personal information and enquiry data.`,
    path: '/privacy',
  });

  return (
    <div className="min-h-[100svh] pt-20 md:pt-28 pb-6 md:pb-20 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl md:rounded-[36px] p-5 md:p-12 shadow-xl border border-slate-100 space-y-6 md:space-y-8">
        <div className="border-b border-slate-200 pb-5 md:pb-6 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-display uppercase tracking-widest text-accent font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>Legal &amp; Data Protection</span>
          </div>
          <h1 className="font-display font-bold md:font-extrabold text-[clamp(1.5rem,5.5vw,2rem)] md:text-4xl uppercase tracking-tight text-brand">
            Privacy Policy
          </h1>
          <p className="font-body text-xs sm:text-sm text-slate-500">
            Published by {businessName} · Last updated {BRAND_CONFIG.identity.foundedYear}
          </p>
        </div>

        <div className="space-y-6 font-body text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              1. Information We Collect
            </h2>
            <p>
              When you contact {businessName}, create an account, book a viewing, or shortlist properties, we may collect personal information that you voluntarily provide, including your full name, email address, phone number, property enquiry details, preferred office or city, and your saved property list.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              2. How We Use Your Information
            </h2>
            <p>
              We use the information collected to respond to property enquiries, coordinate site visits and advisory consultations, maintain your registered account and saved shortlist, and improve the reliability of our website. We do not sell your personal details to third-party brokers or marketing lists.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              3. Infrastructure, Firebase &amp; Google Processing
            </h2>
            <p>
              {businessName} uses Google Firebase (including Firebase Authentication and Cloud Firestore) and static edge hosting to store submitted enquiries, user account details, and saved properties securely. When you choose Google Sign-In or submit forms protected by Google reCAPTCHA / App Check, data is also processed in accordance with Google’s applicable privacy terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              4. Analytics &amp; Browser Preferences
            </h2>
            <p>
              Where enabled, we may use privacy-friendly traffic measurement (such as Cloudflare Web Analytics or optional Google Analytics) to understand page views and key interactions such as enquiry submissions or WhatsApp clicks. Optional analytics respect browser Do Not Track settings where supported, and your browser local storage may be used to remember display preferences and temporary shortlists.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              5. Data Retention &amp; Deletion Requests
            </h2>
            <p>
              You may request access to, correction of, or deletion of your account and submitted enquiry records at any time by emailing{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-brand font-semibold underline underline-offset-4 hover:text-accent"
              >
                {contactEmail}
              </a>
              . Requests are handled after reasonable identity verification.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-brand">
              6. Contact Information
            </h2>
            <p>
              {businessName}
              {headOffice ? ` · ${headOffice.address} (${headOffice.city})` : ''} · Email:{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-brand font-semibold underline underline-offset-4 hover:text-accent"
              >
                {contactEmail}
              </a>
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-display uppercase tracking-wider">
          <Link to="/terms" className="text-accent hover:text-brand underline underline-offset-4">
            Read Terms of Use
          </Link>
          <Link to="/" className="text-brand hover:text-accent">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
