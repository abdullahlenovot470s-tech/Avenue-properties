import React from 'react';

interface GoogleSignInButtonProps {
  onClick: () => void;
  loading?: boolean;
  text?: string;
  className?: string;
}

export const GoogleGLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.13 0-5.78-2.11-6.73-4.96H1.21v3.15C3.25 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.21C.44 8.14 0 9.9 0 12c0 2.1.44 3.86 1.21 5.39l4.06-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.21 6.61l4.06 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onClick,
  loading = false,
  text = 'Continue with Google',
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-full py-3.5 px-6 rounded-full bg-white hover:bg-slate-50 text-[#1B2A44] font-display font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg border border-slate-200 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] disabled:opacity-70 ${className}`}
    >
      <GoogleGLogo className="w-4 h-4 shrink-0" />
      <span>{loading ? 'Connecting with Google...' : text}</span>
    </button>
  );
};
