import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, MessageCircle } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand.config';
import { getWhatsAppUrl } from '../../config/siteConfig';

interface ErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  onGoHome?: () => void;
  fullViewport?: boolean;
}

export const ErrorFallbackPage: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onGoHome,
  fullViewport = false,
}) => {
  const supportEmail = BRAND_CONFIG.contact.email.general;
  const whatsappHref = getWhatsAppUrl(
    `Assalam o Alaikum, I encountered an unexpected application error on ${BRAND_CONFIG.identity.brandName}.`
  );

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.hash = '#/';
      window.location.reload();
    }
  };

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const errorDetail = error?.message?.trim() || 'An unexpected runtime issue interrupted this view.';

  return (
    <div
      role="alert"
      className={`w-full px-3 sm:px-6 md:px-8 flex items-center justify-center ${
        fullViewport ? 'min-h-[100svh] bg-surface text-brand py-10' : 'min-h-[65svh] py-8 sm:py-12'
      }`}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl md:rounded-[32px] p-5 md:p-12 shadow-xl border border-slate-200/80 text-brand">
        {/* Status Indicator + Monogram */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-display uppercase tracking-widest text-error font-semibold block">
                Application Error
              </span>
              <span className="font-display font-bold text-sm text-brand">
                {BRAND_CONFIG.identity.brandName}
              </span>
            </div>
          </div>

          <div className="w-10 h-10 rounded-full bg-surface border border-brand/15 flex items-center justify-center font-display font-black text-sm text-brand select-none shrink-0">
            {BRAND_CONFIG.identity.brandMonogram}
          </div>
        </div>

        {/* Main Message */}
        <div className="pt-6 space-y-4">
          <h1
            className="font-display font-bold md:font-extrabold text-[clamp(1.5rem,5.5vw,2rem)] md:text-3xl uppercase tracking-tight text-brand leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Something Went Wrong
          </h1>

          <p className="font-body text-sm sm:text-base text-text-muted leading-relaxed">
            This page encountered an unexpected error and could not be displayed properly. No changes
            to your saved account or inquiry details have been lost—you can try reloading this view
            or return to the homepage.
          </p>

          <p className="font-body text-sm text-brand/90 leading-relaxed bg-surface/50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <span className="font-semibold text-brand">Need help? Contact the developer:</span>{' '}
            If this error continues to occur after refreshing, please contact the site developer or
            technical support team at{' '}
            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                `${BRAND_CONFIG.identity.brandShortName} Website Error Report`
              )}`}
              className="font-semibold text-accent underline underline-offset-4 hover:text-brand"
            >
              {supportEmail}
            </a>{' '}
            or reach out via WhatsApp and share what you were viewing when the issue happened so it
            can be resolved promptly.
          </p>

          <details className="rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 text-xs font-body text-text-muted">
            <summary className="cursor-pointer font-display font-semibold text-[11px] uppercase tracking-wider text-brand/80 select-none">
              Technical Error Details (For Developer)
            </summary>
            <p className="mt-2 font-mono text-[11px] text-brand/80 break-words leading-relaxed">
              {errorDetail}
            </p>
          </details>
        </div>

        {/* Recovery Actions */}
        <div className="pt-6 mt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-brand text-brand-contrast font-display font-semibold text-xs uppercase tracking-wider hover:bg-accent hover:text-accent-contrast transition-colors shadow-sm cursor-pointer max-w-full whitespace-normal text-center md:whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Try Again</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-brand/25 text-brand font-display font-semibold text-xs uppercase tracking-wider hover:bg-brand/5 transition-colors cursor-pointer max-w-full whitespace-normal text-center md:whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Reload Page</span>
          </button>

          <button
            type="button"
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-brand/25 text-brand font-display font-semibold text-xs uppercase tracking-wider hover:bg-brand/5 transition-colors cursor-pointer max-w-full whitespace-normal text-center md:whitespace-nowrap"
          >
            <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Back to Home</span>
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-emerald-600/30 text-emerald-700 font-display font-semibold text-xs uppercase tracking-wider hover:bg-emerald-50 transition-colors cursor-pointer max-w-full whitespace-normal text-center md:whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>WhatsApp Support</span>
          </a>

          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-accent font-display font-semibold text-xs uppercase tracking-wider hover:text-brand transition-colors cursor-pointer max-w-full whitespace-normal text-center md:whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Email Developer</span>
          </a>
        </div>
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  fullViewport?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallbackPage
          error={this.state.error}
          onRetry={this.handleReset}
          fullViewport={this.props.fullViewport}
        />
      );
    }

    return this.props.children;
  }
}
