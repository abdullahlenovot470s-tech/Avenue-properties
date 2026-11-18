import { IS_STATIC_MODE, parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from './http';
import { createInquiryFirestore } from './inquiriesFirestore';
import { isEnquiryWebhookConfigured } from '../services/enquiryWebhook';
import {
  checkClientSubmissionRateLimit,
  normalizeInquiryFingerprint,
  recordClientSubmissionSuccess,
  validateSpamCheckAndContent,
  type SpamCheckPayload,
} from './spamProtection';
import { trackEvent } from './analytics';

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

export async function submitInquiry(
  payload: InquiryPayload
): Promise<{
  success: boolean;
  error?: string;
  unreachable?: boolean;
  storageMode?: 'backend' | 'firestore';
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

  if (IS_STATIC_MODE) {
    const fsResult = await createInquiryFirestore(payload);
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
      const fsResult = await createInquiryFirestore(payload);
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
    const fsResult = await createInquiryFirestore(payload);
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
}
