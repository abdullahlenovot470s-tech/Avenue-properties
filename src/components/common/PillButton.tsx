import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface PillButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'dark' | 'white' | 'glass' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  icon?: boolean;
}

export const PillButton: React.FC<PillButtonProps> = ({
  children,
  onClick,
  variant = 'dark',
  size = 'md',
  className = '',
  type = 'button',
  icon = true,
}) => {
  const baseStyles =
    'group inline-flex items-center justify-between font-display uppercase tracking-wider font-semibold rounded-full transition-all duration-300 whitespace-nowrap shrink-0 active:scale-95 cursor-pointer select-none';

  const sizeStyles = {
    sm: 'text-[10px] py-1.5 pl-4 pr-1.5 gap-2.5',
    md: 'text-[11px] py-2 pl-5 pr-2 gap-3',
    lg: 'text-xs py-3 pl-7 pr-3 gap-4',
  }[size];

  const variantStyles = {
    dark: 'bg-[#1B2A44] hover:bg-[#2F4B73] text-white shadow-sm hover:shadow-md',
    white: 'bg-white hover:bg-[#E6ECF5] text-[#1B2A44] shadow-sm hover:shadow-md',
    glass: 'glass-panel hover:bg-white/25 text-white shadow-sm',
    outline: 'border border-[#1B2A44]/30 hover:border-[#1B2A44] text-[#1B2A44] hover:bg-[#1B2A44]/5',
  }[variant];

  const circleStyles = {
    dark: 'bg-white text-[#1B2A44] group-hover:scale-105',
    white: 'bg-[#1B2A44] text-white group-hover:scale-105',
    glass: 'bg-white/20 text-white group-hover:bg-white/30',
    outline: 'bg-[#1B2A44] text-white group-hover:scale-105',
  }[variant];

  const circleSize = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      <span>{children}</span>
      {icon && (
        <span
          className={`flex items-center justify-center rounded-full transition-transform duration-300 ${circleStyles} ${circleSize} shrink-0`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      )}
    </button>
  );
};
