import { BRAND_CONFIG } from '../config/brand.config.ts';

// NOTE: The honeypot field and arithmetic challenge in this module are UI/client-side
// deterrents to reduce casual bot submissions — they are NOT a real security boundary.
// Enforce actual write protection on direct Firestore requests via Firebase App Check
// (ReCaptchaV3Provider) and Firestore Security Rules.

export type ChallengeOperator = '+' | '-';

export interface SpamChallenge {
  a: number;
  b: number;
  op: ChallengeOperator;
  issuedAt: number;
  sig: string;
}

export interface SpamCheckPayload {
  honeypot?: string;
  startedAt: number;
  challengeA: number;
  challengeB: number;
  challengeOp: ChallengeOperator;
  challengeAnswer: string;
  challengeSig: string;
}

export interface SpamValidationInput {
  name: string;
  email?: string;
  phone?: string;
  office?: string;
  subject?: string;
  message?: string;
  propertyTitle?: string;
  spamCheck?: Partial<SpamCheckPayload>;
  legacyWebsite?: string;
  requireChallenge?: boolean;
}

export interface SpamValidationResult {
  valid: boolean;
  error?: string;
  isBotTrap?: boolean;
}

export const MIN_FORM_FILL_MS = 1800;
export const MAX_CHALLENGE_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLIENT_COOLDOWN_MS = 30 * 1000; // 30 seconds between rapid submissions
const CLIENT_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CLIENT_SUBMISSIONS_PER_WINDOW = 5;
const DUPLICATE_SUPPRESSION_MS = 10 * 60 * 1000; // 10 minutes

const STORAGE_KEY = `${BRAND_CONFIG.identity.storageKeyPrefix}-inq-guard-v1`;

interface StoredSubmissionEntry {
  ts: number;
  fp: string;
}

const memorySubmissionLog: StoredSubmissionEntry[] = [];

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function computeChallengeSig(
  a: number,
  b: number,
  op: ChallengeOperator,
  issuedAt: number
): string {
  const salt = BRAND_CONFIG.identity.storageKeyPrefix || 'estate';
  return fnv1aHash(`${salt}|${a}|${op}|${b}|${issuedAt}|v1`);
}

export function createSpamChallenge(): SpamChallenge {
  const useSubtract = Math.random() >= 0.5;
  let a: number;
  let b: number;
  let op: ChallengeOperator;

  if (useSubtract) {
    op = '-';
    b = Math.floor(Math.random() * 8) + 2; // 2..9
    a = b + Math.floor(Math.random() * 8) + 2; // always positive result >= 2
  } else {
    op = '+';
    a = Math.floor(Math.random() * 9) + 2; // 2..10
    b = Math.floor(Math.random() * 9) + 1; // 1..9
  }

  const issuedAt = Date.now();
  return {
    a,
    b,
    op,
    issuedAt,
    sig: computeChallengeSig(a, b, op, issuedAt),
  };
}

export function expectedChallengeAnswer(
  a: number,
  b: number,
  op: ChallengeOperator
): number {
  return op === '-' ? a - b : a + b;
}

export function buildSpamCheckPayload(
  challenge: SpamChallenge,
  answer: string,
  honeypot = ''
): SpamCheckPayload {
  return {
    honeypot,
    startedAt: challenge.issuedAt,
    challengeA: challenge.a,
    challengeB: challenge.b,
    challengeOp: challenge.op,
    challengeAnswer: answer.trim(),
    challengeSig: challenge.sig,
  };
}

function countUrls(text: string): number {
  if (!text) return 0;
  const matches = text.match(/(?:https?:\/\/|www\.)[^\s]+/gi);
  return matches ? matches.length : 0;
}

function containsMarkupOrUrlSpam(text: string): boolean {
  if (!text) return false;
  return (
    /https?:\/\//i.test(text) ||
    /\bwww\.[a-z0-9-]+/i.test(text) ||
    /<\/?[a-z][\s\S]*?>/i.test(text) ||
    /\[(?:url|link)\b/i.test(text)
  );
}

function hasSpamMessagePatterns(message: string): boolean {
  if (!message) return false;
  if (countUrls(message) > 2) return true;
  if (/<a\s+href|<script|<iframe|\[url=|\[link=/i.test(message)) return true;
  if (/(.)\1{14,}/.test(message)) return true;
  return false;
}

export function normalizeInquiryFingerprint(input: {
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  propertyTitle?: string;
}): string {
  const contact = (
    String(input.email || '').trim().toLowerCase() ||
    String(input.phone || '').replace(/[\s\-().]/g, '').trim()
  ).slice(0, 120);
  const subj = String(input.subject || '').trim().toLowerCase().slice(0, 120);
  const prop = String(input.propertyTitle || '').trim().toLowerCase().slice(0, 120);
  const msg = String(input.message || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 240);
  return fnv1aHash(`${contact}|${subj}|${prop}|${msg}`);
}

export function validateSpamCheckAndContent(
  input: SpamValidationInput
): SpamValidationResult {
  const honeypot = String(
    input.spamCheck?.honeypot || input.legacyWebsite || ''
  ).trim();
  if (honeypot.length > 0) {
    return {
      valid: false,
      isBotTrap: true,
      error: 'Unable to verify your submission. Please refresh the page and try again.',
    };
  }

  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const phone = String(input.phone || '').trim();
  const office = String(input.office || '').trim();
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();
  const propertyTitle = String(input.propertyTitle || '').trim();

  if (name.length < 2) {
    return { valid: false, error: 'Please enter your full name (at least 2 characters).' };
  }

  if (
    containsMarkupOrUrlSpam(name) ||
    containsMarkupOrUrlSpam(office) ||
    containsMarkupOrUrlSpam(subject) ||
    containsMarkupOrUrlSpam(propertyTitle)
  ) {
    return {
      valid: false,
      error: 'Links or HTML markup are not permitted in name or subject fields.',
    };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { valid: false, error: 'Please provide a valid email address.' };
  }

  if (phone) {
    const cleanedPhone = phone.replace(/[\s\-().]/g, '');
    if (!/^\+?\d{7,15}$/.test(cleanedPhone)) {
      return { valid: false, error: 'Please provide a valid contact phone number.' };
    }
  }

  if (hasSpamMessagePatterns(message)) {
    return {
      valid: false,
      error: 'Your message triggered our spam filter (excessive links or markup). Please revise and try again.',
    };
  }

  const requireChallenge = input.requireChallenge !== false;
  const spamCheck = input.spamCheck;

  if (requireChallenge || (spamCheck && spamCheck.challengeSig !== undefined)) {
    if (
      !spamCheck ||
      typeof spamCheck.startedAt !== 'number' ||
      typeof spamCheck.challengeA !== 'number' ||
      typeof spamCheck.challengeB !== 'number' ||
      (spamCheck.challengeOp !== '+' && spamCheck.challengeOp !== '-') ||
      !spamCheck.challengeSig
    ) {
      return {
        valid: false,
        error: 'Please complete the human verification question before submitting.',
      };
    }

    const expectedSig = computeChallengeSig(
      spamCheck.challengeA,
      spamCheck.challengeB,
      spamCheck.challengeOp,
      spamCheck.startedAt
    );
    if (spamCheck.challengeSig !== expectedSig) {
      return {
        valid: false,
        error: 'Verification check could not be validated. Please refresh the question and try again.',
      };
    }

    if (
      spamCheck.challengeA < 1 ||
      spamCheck.challengeA > 30 ||
      spamCheck.challengeB < 1 ||
      spamCheck.challengeB > 30
    ) {
      return {
        valid: false,
        error: 'Verification check is invalid. Please refresh the question and try again.',
      };
    }

    const now = Date.now();
    const elapsed = now - spamCheck.startedAt;
    if (elapsed < MIN_FORM_FILL_MS) {
      return {
        valid: false,
        error: 'Please take a brief moment before submitting your inquiry.',
      };
    }
    if (elapsed > MAX_CHALLENGE_AGE_MS) {
      return {
        valid: false,
        error: 'Your verification check expired. Please solve the refreshed question and submit again.',
      };
    }

    const rawAnswer = String(spamCheck.challengeAnswer ?? '').trim();
    if (!/^-?\d+$/.test(rawAnswer)) {
      return {
        valid: false,
        error: 'Please enter the numeric answer to the verification question.',
      };
    }
    const numericAnswer = Number(rawAnswer);
    const expected = expectedChallengeAnswer(
      spamCheck.challengeA,
      spamCheck.challengeB,
      spamCheck.challengeOp
    );
    if (numericAnswer !== expected) {
      return {
        valid: false,
        error: 'Incorrect verification answer. Please try again.',
      };
    }
  }

  return { valid: true };
}

function readBrowserLog(): StoredSubmissionEntry[] {
  const cutoff = Date.now() - CLIENT_RATE_WINDOW_MS;
  if (typeof window === 'undefined') {
    return memorySubmissionLog.filter((item) => item.ts >= cutoff);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memorySubmissionLog.filter((item) => item.ts >= cutoff);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredSubmissionEntry =>
        Boolean(item) &&
        typeof item.ts === 'number' &&
        typeof item.fp === 'string' &&
        item.ts >= cutoff
    );
  } catch {
    return memorySubmissionLog.filter((item) => item.ts >= cutoff);
  }
}

function writeBrowserLog(entries: StoredSubmissionEntry[]): void {
  const cutoff = Date.now() - CLIENT_RATE_WINDOW_MS;
  const pruned = entries.filter((item) => item.ts >= cutoff).slice(-20);
  memorySubmissionLog.length = 0;
  memorySubmissionLog.push(...pruned);

  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Ignore storage quota / private mode restrictions
  }
}

export function checkClientSubmissionRateLimit(
  fingerprint: string
): { allowed: true } | { allowed: false; error: string } {
  const now = Date.now();
  const entries = readBrowserLog();

  const latest = entries[entries.length - 1];
  if (latest && now - latest.ts < CLIENT_COOLDOWN_MS) {
    const waitSec = Math.max(1, Math.ceil((CLIENT_COOLDOWN_MS - (now - latest.ts)) / 1000));
    return {
      allowed: false,
      error: `Please wait ${waitSec} seconds before submitting another inquiry.`,
    };
  }

  if (entries.length >= MAX_CLIENT_SUBMISSIONS_PER_WINDOW) {
    return {
      allowed: false,
      error: 'Too many inquiries submitted recently. Please wait a few minutes or contact our office directly by phone.',
    };
  }

  const duplicate = entries.find(
    (entry) => entry.fp === fingerprint && now - entry.ts < DUPLICATE_SUPPRESSION_MS
  );
  if (duplicate) {
    return {
      allowed: false,
      error: 'This inquiry was already received recently. An advisor will respond shortly.',
    };
  }

  return { allowed: true };
}

export function recordClientSubmissionSuccess(fingerprint: string): void {
  const entries = readBrowserLog();
  entries.push({ ts: Date.now(), fp: fingerprint });
  writeBrowserLog(entries);
}
