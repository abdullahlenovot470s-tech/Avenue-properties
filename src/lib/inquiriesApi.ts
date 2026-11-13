import { parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from './http';

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
  inquiry?: ContactInquiryRecord;
}> {
  try {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
    return { success: true, inquiry: parsed.data.inquiry };
  } catch {
    return {
      success: false,
      unreachable: true,
      error: SERVER_UNREACHABLE_MESSAGE,
    };
  }
}
