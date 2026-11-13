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
): Promise<{ success: boolean; error?: string; inquiry?: ContactInquiryRecord }> {
  try {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Could not submit inquiry.' };
    }
    return { success: true, inquiry: data.inquiry };
  } catch {
    return { success: false, error: 'Network error while submitting your inquiry.' };
  }
}
