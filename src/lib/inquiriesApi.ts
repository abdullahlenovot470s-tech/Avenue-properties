import { parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from './http';
import { isEnquiryWebhookConfigured } from '../services/enquiryWebhook';
import { BRAND_CONFIG } from '../config/brand.config';
import {
  checkClientSubmissionRateLimit,
  normalizeInquiryFingerprint,
  recordClientSubmissionSuccess,
  validateSpamCheckAndContent,
  type SpamCheckPayload,
} from './spamProtection';
import { trackEvent } from './analytics';

const ENQUIRY_DELIVERY = BRAND_CONFIG.features.enquiryDelivery;
const FIREBASE_ENABLED =
  BRAND_CONFIG.features.enableClientLogin ||
  BRAND_CONFIG.features.enableAdminPanel ||
  BRAND_CONFIG.features.enableEnquiriesDashboard;

export interface InquiryPayload {
  name: string;
  email?: string;
  phone?: string;
  office?: string;
  subject?: string;
  message?: string;
  source: string;
  propertyTitle?: string;
  preferredDate?: string;
  timeframe?: string;
  spamCheck?: SpamCheckPayload;
}

export interface ContactInquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  office: string;
  subject: string;
  message: string;
  source: string;
  propertyTitle?: string;
  preferredDate?: string;
  timeframe?: string;
  status: 'new' | 'contacted' | 'resolved';
  createdAt: string;
}

export interface RegisteredAccountRecord {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  provider: 'email' | 'google';
  photoURL?: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
}

async function submitInquiryViaFirestore(payload: InquiryPayload) {
  if (!FIREBASE_ENABLED) {
    return {
      success: false,
      error:
        'Online enquiry storage is disabled right now. Please contact us directly via WhatsApp or telephone.',
    };
  }
  const { createInquiryFirestore } = await import('./inquiriesFirestore');
  return createInquiryFirestore(payload);
}

export async function submitInquiry(
  payload: InquiryPayload
): Promise<{
  success: boolean;
  error?: string;
  unreachable?: boolean;
  storageMode?: 'backend' | 'firestore' | 'webhook';
  inquiry?: ContactInquiryRecord;
}> {
  const preCheck = validateSpamCheckAndContent({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    office: payload.office,
    subject: payload.subject,
    message: payload.message,
    propertyTitle: payload.propertyTitle,
    spamCheck: payload.spamCheck,
    requireChallenge: true,
  });

  if (!preCheck.valid) {
    return {
      success: false,
      error: preCheck.error || 'Could not verify submission.',
    };
  }

  const fingerprint = normalizeInquiryFingerprint({
    email: payload.email,
    phone: payload.phone,
    subject: payload.subject,
    message: payload.message,
    propertyTitle: payload.propertyTitle,
  });

  const rateLimitCheck = checkClientSubmissionRateLimit(fingerprint);
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      error: rateLimitCheck.error,
    };
  }

  if (ENQUIRY_DELIVERY === 'webhook') {
    if (!isEnquiryWebhookConfigured()) {
      return {
        success: false,
        error:
          'Online enquiry delivery is not configured right now. Please contact us directly via WhatsApp or telephone.',
      };
    }
    recordClientSubmissionSuccess(fingerprint);
    trackEvent('enquiry_submit', { source: payload.source, mode: 'webhook' });
    return {
      success: true,
      storageMode: 'webhook',
    };
  }

  if (ENQUIRY_DELIVERY === 'firestore') {
    const fsResult = await submitInquiryViaFirestore(payload);
    if (fsResult.success) {
      recordClientSubmissionSuccess(fingerprint);
      trackEvent('enquiry_submit', { source: payload.source, mode: 'firestore' });
      return {
        success: true,
        inquiry: fsResult.inquiry,
        storageMode: 'firestore',
      };
    }
    return {
      success: false,
      unreachable: true,
      error: fsResult.error || SERVER_UNREACHABLE_MESSAGE,
    };
  }

  try {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        webhookDispatched: isEnquiryWebhookConfigured(),
      }),
    });
    const parsed = await parseApiResponse<{
      success?: boolean;
      error?: string;
      inquiry?: ContactInquiryRecord;
    }>(res);

    if (parsed.unreachable || !parsed.data) {
      return {
        success: false,
        unreachable: true,
        error: SERVER_UNREACHABLE_MESSAGE,
      };
    }

    if (!parsed.ok || !parsed.data.success) {
      return {
        success: false,
        error: parsed.data.error || 'Could not submit inquiry.',
      };
    }
    recordClientSubmissionSuccess(fingerprint);
    trackEvent('enquiry_submit', { source: payload.source, mode: 'backend' });
    return { success: true, inquiry: parsed.data.inquiry, storageMode: 'backend' };
  } catch {
    return {
      success: false,
      unreachable: true,
      error: SERVER_UNREACHABLE_MESSAGE,
    };
  }
}
