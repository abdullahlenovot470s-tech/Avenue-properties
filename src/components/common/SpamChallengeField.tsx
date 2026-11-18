import React from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import type { SpamChallenge } from '../../lib/spamProtection';

interface SpamChallengeFieldProps {
  challenge: SpamChallenge;
  answer: string;
  onAnswerChange: (value: string) => void;
  onRefresh: () => void;
  variant?: 'dark' | 'light';
  inputId?: string;
}

export const SpamChallengeField: React.FC<SpamChallengeFieldProps> = ({
  challenge,
  answer,
  onAnswerChange,
  onRefresh,
  variant = 'dark',
  inputId,
}) => {
  const isDark = variant === 'dark';
  const opSymbol = challenge.op === '-' ? '−' : '+';
  const generatedId = React.useId();
  const resolvedId = inputId || `spam-check-${generatedId}`;

  return (
    <div
      className={`rounded-xl px-3.5 py-2.5 border flex flex-wrap items-center justify-between gap-2.5 ${
        isDark
          ? 'bg-white/10 border-white/20 text-white'
          : 'bg-slate-50 border-slate-200 text-brand'
      }`}
    >
      <label
        htmlFor={resolvedId}
        className={`flex items-center gap-2 text-xs font-display tracking-wide select-none ${
          isDark ? 'text-white/90' : 'text-slate-700'
        }`}
      >
        <ShieldCheck
          className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-300' : 'text-accent'}`}
          aria-hidden="true"
        />
        <span className="uppercase text-[11px] font-semibold tracking-wider">
          Verify:
        </span>
        <span className="font-bold text-sm tabular-nums whitespace-nowrap">
          {challenge.a} {opSymbol} {challenge.b} =
        </span>
      </label>

      <div className="flex items-center gap-1.5 ml-auto">
        <input
          id={resolvedId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          maxLength={4}
          autoComplete="off"
          aria-label={`Human verification: what is ${challenge.a} ${
            challenge.op === '-' ? 'minus' : 'plus'
          } ${challenge.b}?`}
          placeholder="?"
          value={answer}
          onChange={(e) => {
            const digitsOnly = e.target.value.replace(/[^\d-]/g, '');
            onAnswerChange(digitsOnly);
          }}
          className={`w-20 px-3 py-1.5 rounded-lg border text-center text-sm font-display font-bold tabular-nums focus:outline-none transition-colors ${
            isDark
              ? 'bg-white/15 border-white/25 text-white placeholder-white/40 focus:border-white/60 focus:bg-white/20'
              : 'bg-white border-slate-200 text-brand placeholder-slate-400 focus:border-accent'
          }`}
        />
        <button
          type="button"
          onClick={onRefresh}
          title="Get a new verification question"
          aria-label="Generate a new verification question"
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            isDark
              ? 'border-white/20 text-white/75 hover:text-white hover:bg-white/10'
              : 'border-slate-200 text-slate-500 hover:text-brand hover:bg-white'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
