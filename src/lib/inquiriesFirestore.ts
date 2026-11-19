import {
  formatFirestoreQuotaMessage,
  getDbAsync,
  handleFirestoreError,
  isFirestoreQuotaError,
  OperationType,
} from './firebase';
import { BRAND_CONFIG } from '../config/brand.config';
import type { ContactInquiryRecord, InquiryPayload } from './inquiriesApi';
import { validateSpamCheckAndContent } from './spamProtection';

function generateId(prefix: string): string {
  const bytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${hex}`;
}

export async function createInquiryFirestore(
  payload: InquiryPayload
): Promise<{ success: boolean; error?: string; inquiry?: ContactInquiryRecord }> {
  const name = String(payload.name || '').trim().slice(0, 120);
  const email = String(payload.email || '').trim().toLowerCase().slice(0, 254);
  const phone = String(payload.phone || '').trim().slice(0, 32);
  const office = String(payload.office || BRAND_CONFIG.locale.defaultCity).trim().slice(0, 100);
  const subject = String(payload.subject || 'General Inquiry').trim().slice(0, 200);
  const message = String(payload.message || '').trim().slice(0, 5000);
  const source = (String(payload.source || 'Contact Page').trim() || 'Contact Page').slice(0, 100);
  const propertyTitle = payload.propertyTitle
    ? String(payload.propertyTitle).trim().slice(0, 200)
    : undefined;
  const preferredDate = payload.preferredDate
    ? String(payload.preferredDate).trim().slice(0, 64)
    : undefined;
  const timeframe = payload.timeframe
    ? String(payload.timeframe).trim().slice(0, 100)
    : undefined;

  if (!name) {
    return { success: false, error: 'Full name is required.' };
  }
  if (!email && !phone) {
    return {
      success: false,
      error: 'Please provide an email address or contact phone number.',
    };
  }

  const spamCheckResult = validateSpamCheckAndContent({
    name,
    email,
    phone,
    office,
    subject,
    message,
    propertyTitle,
    spamCheck: payload.spamCheck,
    requireChallenge: true,
  });
  if (!spamCheckResult.valid) {
    return {
      success: false,
      error: spamCheckResult.error || 'Could not verify submission.',
    };
  }

  const id = generateId('inq');
  const record: ContactInquiryRecord = {
    id,
    name,
    email,
    phone,
    office,
    subject,
    message,
    source,
    status: 'new',
    createdAt: new Date().toISOString().slice(0, 64),
  };

  const firestoreDoc: Record<string, unknown> = { ...record };
  if (propertyTitle) {
    record.propertyTitle = propertyTitle;
    firestoreDoc.propertyTitle = propertyTitle;
  }
  if (preferredDate) {
    record.preferredDate = preferredDate;
    firestoreDoc.preferredDate = preferredDate;
  }
  if (timeframe) {
    record.timeframe = timeframe;
    firestoreDoc.timeframe = timeframe;
  }

  const docPath = `inquiries/${id}`;
  try {
    const [db, { doc, setDoc }] = await Promise.all([
      getDbAsync(),
      import('firebase/firestore'),
    ]);
    await setDoc(doc(db, 'inquiries', id), firestoreDoc);
    return { success: true, inquiry: record };
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      return {
        success: false,
        error: formatFirestoreQuotaMessage(err),
      };
    }
    try {
      handleFirestoreError(err, OperationType.CREATE, docPath);
    } catch {
      // Logged structured error
    }
    return {
      success: false,
      error: 'Could not save inquiry right now. Please try again shortly.',
    };
  }
}

export async function listInquiriesFirestore(): Promise<{
  success: boolean;
  inquiries: ContactInquiryRecord[];
  error?: string;
}> {
  const path = 'inquiries';
  try {
    const [db, { collection, getDocs, limit, orderBy, query }] = await Promise.all([
      getDbAsync(),
      import('firebase/firestore'),
    ]);
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(300));
    const snap = await getDocs(q);
    const inquiries: ContactInquiryRecord[] = snap.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const rawStatus = String(data.status || 'new');
      const status: ContactInquiryRecord['status'] =
        rawStatus === 'contacted' || rawStatus === 'resolved' ? rawStatus : 'new';
      return {
        id: String(data.id || docSnap.id),
        name: String(data.name || ''),
        email: String(data.email || ''),
        phone: String(data.phone || ''),
        office: String(data.office || ''),
        subject: String(data.subject || 'General Inquiry'),
        message: String(data.message || ''),
        source: String(data.source || 'Contact Page'),
        propertyTitle: typeof data.propertyTitle === 'string' ? data.propertyTitle : undefined,
        preferredDate: typeof data.preferredDate === 'string' ? data.preferredDate : undefined,
        timeframe: typeof data.timeframe === 'string' ? data.timeframe : undefined,
        status,
        createdAt: String(data.createdAt || new Date().toISOString()),
      };
    });
    return { success: true, inquiries };
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      return {
        success: false,
        inquiries: [],
        error: formatFirestoreQuotaMessage(err),
      };
    }
    try {
      handleFirestoreError(err, OperationType.LIST, path);
    } catch {
      // Logged structured error
    }
    return {
      success: false,
      inquiries: [],
      error: 'Could not load inquiries from Firestore. Ensure you are signed in with the verified management account.',
    };
  }
}

export async function updateInquiryStatusFirestore(
  id: string,
  status: 'new' | 'contacted' | 'resolved'
): Promise<{ success: boolean; error?: string }> {
  const path = `inquiries/${id}`;
  try {
    const [db, { doc, updateDoc }] = await Promise.all([
      getDbAsync(),
      import('firebase/firestore'),
    ]);
    await updateDoc(doc(db, 'inquiries', id), { status });
    return { success: true };
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      return { success: false, error: formatFirestoreQuotaMessage(err) };
    }
    try {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } catch {
      // Logged structured error
    }
    return {
      success: false,
      error: 'Could not update inquiry status in Firestore.',
    };
  }
}

export async function deleteInquiryFirestore(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const path = `inquiries/${id}`;
  try {
    const [db, { deleteDoc, doc }] = await Promise.all([
      getDbAsync(),
      import('firebase/firestore'),
    ]);
    await deleteDoc(doc(db, 'inquiries', id));
    return { success: true };
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      return { success: false, error: formatFirestoreQuotaMessage(err) };
    }
    try {
      handleFirestoreError(err, OperationType.DELETE, path);
    } catch {
      // Logged structured error
    }
    return {
      success: false,
      error: 'Could not delete inquiry from Firestore.',
    };
  }
}
