import { BRAND_CONFIG } from '../config/brand.config';

export type EnquiryWebhookSource =
  | 'Contact'
  | 'Consultation'
  | 'Site Visit'
  | "Let's Talk"
  | 'Other'
  | 'Management test';

export interface EnquiryWebhookData {
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  interest?: string;
  budget?: string;
  message?: string;
  source: EnquiryWebhookSource;
  website?: string;
}

export interface SendEnquiryWebhookResult {
  skipped?: boolean;
  queued?: boolean;
  sent?: boolean;
}

interface QueuedEnquiryPayload {
  name: string;
  email: string;
  phone: string;
  city: string;
  interest: string;
  budget: string;
  message: string;
  source: EnquiryWebhookSource;
  page: string;
  website: string;
  queuedAt: string;
}

const PENDING_ENQUIRIES_KEY = 'pendingEnquiries';
const MAX_PENDING_ITEMS = 50;
export const PENDING_QUEUE_EVENT = `${BRAND_CONFIG.identity.storageKeyPrefix}-pending-enquiries-changed`;

function getWebhookConfig(): { url: string; key: string } {
  const rawUrl = import.meta.env.VITE_ENQUIRY_WEBHOOK_URL;
  const rawKey = import.meta.env.VITE_ENQUIRY_KEY;
  return {
    url: typeof rawUrl === 'string' ? rawUrl.trim() : '',
    key: typeof rawKey === 'string' ? rawKey.trim() : '',
  };
}

export function isEnquiryWebhookConfigured(): boolean {
  if (!BRAND_CONFIG.features.enableEnquiryWebhook) return false;
  const { url, key } = getWebhookConfig();
  return Boolean(url && key);
}

function stripHtmlTags(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function readPendingQueue(): QueuedEnquiryPayload[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(PENDING_ENQUIRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingQueue(items: QueuedEnquiryPayload[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const capped = items.slice(-MAX_PENDING_ITEMS);
    if (capped.length === 0) {
      window.localStorage.removeItem(PENDING_ENQUIRIES_KEY);
    } else {
      window.localStorage.setItem(PENDING_ENQUIRIES_KEY, JSON.stringify(capped));
    }
    window.dispatchEvent(new CustomEvent(PENDING_QUEUE_EVENT, { detail: { count: capped.length } }));
  } catch {
    // Ignore storage errors (e.g. private browsing quota)
  }
}

export function getPendingEnquiriesCount(): number {
  return readPendingQueue().length;
}

function enqueuePendingEnquiry(item: QueuedEnquiryPayload): void {
  const current = readPendingQueue();
  current.push(item);
  writePendingQueue(current.slice(-MAX_PENDING_ITEMS));
}

async function postToWebhook(url: string, key: string, payload: Omit<QueuedEnquiryPayload, 'queuedAt'>): Promise<void> {
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      key,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      city: payload.city,
      interest: payload.interest,
      budget: payload.budget,
      message: payload.message,
      source: payload.source,
      page: payload.page,
      website: payload.website,
    }),
  });
}

let retryInProgress = false;

export async function retryPendingEnquiries(): Promise<{
  skipped?: boolean;
  sentCount: number;
  remainingCount: number;
}> {
  const { url, key } = getWebhookConfig();
  const initialQueue = readPendingQueue();

  if (!url || !key) {
    return { skipped: true, sentCount: 0, remainingCount: initialQueue.length };
  }

  if (initialQueue.length === 0 || retryInProgress) {
    return { sentCount: 0, remainingCount: initialQueue.length };
  }

  retryInProgress = true;
  let sentCount = 0;

  try {
    const remaining: QueuedEnquiryPayload[] = [];
    for (let i = 0; i < initialQueue.length; i++) {
      const item = initialQueue[i];
      try {
        await postToWebhook(url, key, {
          name: stripHtmlTags(item.name),
          email: stripHtmlTags(item.email),
          phone: stripHtmlTags(item.phone),
          city: stripHtmlTags(item.city),
          interest: stripHtmlTags(item.interest),
          budget: stripHtmlTags(item.budget),
          message: stripHtmlTags(item.message),
          source: (stripHtmlTags(item.source) as EnquiryWebhookSource) || 'Other',
          page: stripHtmlTags(item.page),
          website: stripHtmlTags(item.website),
        });
        sentCount += 1;
        // Remove sent item immediately from storage in case subsequent items fail
        const latestPending = [...remaining, ...initialQueue.slice(i + 1)];
        writePendingQueue(latestPending);
      } catch {
        remaining.push(item);
      }
    }
    writePendingQueue(remaining);
    return { sentCount, remainingCount: remaining.length };
  } finally {
    retryInProgress = false;
  }
}

export async function sendEnquiryToWebhook(
  data: EnquiryWebhookData
): Promise<SendEnquiryWebhookResult> {
  const honeypotValue = stripHtmlTags(data.website);
  if (honeypotValue) {
    return { skipped: true };
  }

  if (!BRAND_CONFIG.features.enableEnquiryWebhook) {
    return { skipped: true };
  }

  const { url, key } = getWebhookConfig();
  if (!url || !key) {
    return { skipped: true };
  }

  const cleanSource = (stripHtmlTags(data.source) as EnquiryWebhookSource) || 'Other';
  const pageTitle =
    typeof document !== 'undefined' ? stripHtmlTags(document.title) : BRAND_CONFIG.identity.brandName;

  const cleanPayload: Omit<QueuedEnquiryPayload, 'queuedAt'> = {
    name: stripHtmlTags(data.name),
    email: stripHtmlTags(data.email),
    phone: stripHtmlTags(data.phone),
    city: stripHtmlTags(data.city),
    interest: stripHtmlTags(data.interest),
    budget: stripHtmlTags(data.budget),
    message: stripHtmlTags(data.message),
    source: cleanSource,
    page: `${pageTitle} (${cleanSource})`,
    website: '',
  };

  try {
    await postToWebhook(url, key, cleanPayload);
    return { sent: true };
  } catch {
    enqueuePendingEnquiry({
      ...cleanPayload,
      queuedAt: new Date().toISOString(),
    });
    return { queued: true };
  }
}

let listenersInitialized = false;

if (typeof window !== 'undefined' && !listenersInitialized) {
  listenersInitialized = true;
  window.addEventListener('online', () => {
    void retryPendingEnquiries();
  });
  // Retry any queued items on page load without blocking initial render
  globalThis.setTimeout(() => {
    void retryPendingEnquiries();
  }, 500);
}
