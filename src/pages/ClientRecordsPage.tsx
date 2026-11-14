import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Search,
  RefreshCw,
  Trash2,
  Check,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  MessageSquare,
  Users,
  CheckCircle2,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
  Layers,
  Bell,
  Download,
  AlertCircle,
} from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ContactInquiryRecord, RegisteredAccountRecord } from '../lib/inquiriesApi';
import { parseApiResponse, SERVER_UNREACHABLE_MESSAGE } from '../lib/http';
import {
  sendEnquiryToWebhook,
  isEnquiryWebhookConfigured,
  getPendingEnquiriesCount,
  retryPendingEnquiries,
  PENDING_QUEUE_EVENT,
} from '../services/enquiryWebhook';
import { BRAND_CONFIG } from '../config/brand.config';

type SectionView = 'all' | 'inquiries' | 'accounts';
type InquiryStatusFilter = 'all' | 'new' | 'contacted' | 'resolved';
type DateRangeFilter = 'all' | 'today' | 'week';
type AccountFilter = 'all' | 'verified' | 'pending' | 'email' | 'google';

function getTimezoneOffsetMs(timeZone: string, date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const val = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    const utcEquivalent = Date.UTC(
      val('year'),
      val('month') - 1,
      val('day'),
      val('hour') % 24,
      val('minute'),
      val('second')
    );
    return utcEquivalent - date.getTime();
  } catch {
    return 0;
  }
}

function getLocalRangeStarts(): { todayStartMs: number; weekStartMs: number } {
  const now = new Date();
  const offsetMs = getTimezoneOffsetMs(BRAND_CONFIG.locale.timezoneIana, now);
  const shifted = new Date(now.getTime() + offsetMs);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const daysSinceMonday = (shifted.getUTCDay() + 6) % 7;

  const todayStartMs = Date.UTC(y, m, d, 0, 0, 0, 0) - offsetMs;
  const weekStartMs = Date.UTC(y, m, d - daysSinceMonday, 0, 0, 0, 0) - offsetMs;
  return { todayStartMs, weekStartMs };
}

function formatLocalDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleString(BRAND_CONFIG.locale.currencyLocale, {
    timeZone: BRAND_CONFIG.locale.timezoneIana,
    dateStyle: 'medium',
    timeStyle: 'short',
  })} ${BRAND_CONFIG.locale.timezoneLabel}`;
}

function escapeCsvCell(value: unknown): string {
  let str = String(value ?? '');
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(BRAND_CONFIG.locale.currencyLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getInitials(name?: string): string {
  if (!name) return BRAND_CONFIG.identity.brandInitials;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const ClientRecordsPage: React.FC = () => {
  const { managementToken, firebaseUser, logout } = useAuth();
  const { showToast } = useToast();

  const buildMgmtHeaders = useCallback(
    async (json = false): Promise<Record<string, string> | null> => {
      const headers: Record<string, string> = {};
      if (json) headers['Content-Type'] = 'application/json';
      let fbToken = '';
      if (firebaseUser) {
        try {
          fbToken = await firebaseUser.getIdToken();
        } catch {
          fbToken = '';
        }
      }
      const primary = managementToken || fbToken;
      if (!primary) return null;
      headers.Authorization = `Bearer ${primary}`;
      if (fbToken) {
        headers['X-Firebase-Token'] = fbToken;
      }
      return headers;
    },
    [managementToken, firebaseUser]
  );

  const [inquiries, setInquiries] = useState<ContactInquiryRecord[]>([]);
  const [accounts, setAccounts] = useState<RegisteredAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<SectionView>('all');

  // Section 1 state (Contact Form Submissions)
  const [inquirySearch, setInquirySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(null);
  const [confirmDeleteInquiryId, setConfirmDeleteInquiryId] = useState<string | null>(null);

  // Alerts & Pending Queue state
  const clientWebhookConfigured = isEnquiryWebhookConfigured();
  const [serverAlertStatus, setServerAlertStatus] = useState<{
    emailProvider: 'resend' | 'smtp' | 'none';
    serverWebhookConfigured: boolean;
    alertRecipient?: string;
    configIssue?: string;
  } | null>(null);
  const [testPreviewUrl, setTestPreviewUrl] = useState<string | undefined>(undefined);
  const [sendingTestAlert, setSendingTestAlert] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingEnquiriesCount());
  const [retryingQueue, setRetryingQueue] = useState(false);

  const alertsConfigured =
    clientWebhookConfigured ||
    Boolean(serverAlertStatus?.serverWebhookConfigured) ||
    (serverAlertStatus?.emailProvider !== undefined && serverAlertStatus.emailProvider !== 'none');

  // Section 2 state (Registered Accounts)
  const [accountSearch, setAccountSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Client Records & Accounts | ${BRAND_CONFIG.identity.brandName}`;
  }, []);

  const fetchRecords = useCallback(
    async (isManual = false) => {
      const headers = await buildMgmtHeaders(false);
      if (!headers && !auth.currentUser?.emailVerified) {
        setLoading(false);
        return;
      }
      if (isManual) setRefreshing(true);
      setRecordsError(null);
      try {
        let backendAccounts: RegisteredAccountRecord[] = [];
        let backendLoaded = false;

        if (headers) {
          const [res, alertRes] = await Promise.all([
            fetch('/api/management/records', { headers }),
            fetch('/api/management/alerts-status', { headers }).catch(() => null),
          ]);

          if (alertRes) {
            const parsedAlerts = await parseApiResponse<{
              success?: boolean;
              emailProvider?: 'resend' | 'smtp' | 'none';
              serverWebhookConfigured?: boolean;
              alertRecipient?: string;
              configIssue?: string;
            }>(alertRes);
            if (parsedAlerts.ok && parsedAlerts.data?.success) {
              setServerAlertStatus({
                emailProvider: parsedAlerts.data.emailProvider || 'none',
                serverWebhookConfigured: Boolean(parsedAlerts.data.serverWebhookConfigured),
                alertRecipient: parsedAlerts.data.alertRecipient,
                configIssue: parsedAlerts.data.configIssue,
              });
            }
          }

          const parsed = await parseApiResponse<{
            success?: boolean;
            error?: string;
            inquiries?: ContactInquiryRecord[];
            accounts?: RegisteredAccountRecord[];
          }>(res);

          if (parsed.unreachable || !parsed.data) {
            setRecordsError(SERVER_UNREACHABLE_MESSAGE);
            showToast(SERVER_UNREACHABLE_MESSAGE, 'error');
          } else if (parsed.status === 401) {
            const msg = parsed.data.error || 'Management session expired. Please sign in again.';
            showToast(msg, 'error');
            void logout();
          } else if (!parsed.ok || !parsed.data.success) {
            const msg = parsed.data.error || 'Could not load client records.';
            setRecordsError(msg);
            showToast(msg, 'error');
          } else {
            backendLoaded = true;
            setInquiries(Array.isArray(parsed.data.inquiries) ? parsed.data.inquiries : []);
            backendAccounts = Array.isArray(parsed.data.accounts) ? parsed.data.accounts : [];
          }
        }

        const mergedByEmail = new Map<string, RegisteredAccountRecord>();
        for (const acc of backendAccounts) {
          if (acc.email) {
            mergedByEmail.set(acc.email.toLowerCase(), acc);
          }
        }

        // Also read verified client profiles persisted directly in Firestore /users
        if (auth.currentUser?.emailVerified) {
          try {
            const snap = await getDocs(collection(db, 'users'));
            const currentAdminEmail = (auth.currentUser.email || '').toLowerCase();
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data() as Record<string, unknown>;
              const email = String(data.email || '').trim().toLowerCase();
              if (!email || email === currentAdminEmail) return;
              const existing = mergedByEmail.get(email);
              const fsRecord: RegisteredAccountRecord = {
                id: String(data.id || docSnap.id),
                name: String(data.name || existing?.name || email.split('@')[0]),
                email,
                emailVerified: data.emailVerified !== undefined ? Boolean(data.emailVerified) : true,
                provider:
                  data.provider === 'google' || data.provider === 'email'
                    ? data.provider
                    : existing?.provider || 'email',
                photoURL: typeof data.photoURL === 'string' ? data.photoURL : existing?.photoURL,
                phone: typeof data.phone === 'string' && data.phone ? data.phone : existing?.phone,
                createdAt:
                  typeof data.createdAt === 'string' && data.createdAt
                    ? data.createdAt
                    : existing?.createdAt || new Date().toISOString(),
                lastLoginAt:
                  typeof data.lastLoginAt === 'string' ? data.lastLoginAt : existing?.lastLoginAt,
              };
              mergedByEmail.set(email, fsRecord);
            });
            if (mergedByEmail.size > 0 && !backendLoaded) {
              setRecordsError(null);
            }
          } catch (err) {
            try {
              handleFirestoreError(err, OperationType.LIST, 'users');
            } catch {
              // Non-fatal fallback to backend accounts list
            }
          }
        }

        const combinedAccounts = Array.from(mergedByEmail.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAccounts(combinedAccounts);
      } catch {
        setRecordsError(SERVER_UNREACHABLE_MESSAGE);
        showToast(SERVER_UNREACHABLE_MESSAGE, 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildMgmtHeaders, logout, showToast]
  );

  useEffect(() => {
    void fetchRecords(false);
  }, [fetchRecords]);

  useEffect(() => {
    const syncPending = () => setPendingCount(getPendingEnquiriesCount());
    syncPending();
    window.addEventListener(PENDING_QUEUE_EVENT, syncPending);
    window.addEventListener('storage', syncPending);
    return () => {
      window.removeEventListener(PENDING_QUEUE_EVENT, syncPending);
      window.removeEventListener('storage', syncPending);
    };
  }, []);

  const handleSendTestAlert = async () => {
    setSendingTestAlert(true);
    setTestPreviewUrl(undefined);

    let clientSent = false;
    if (clientWebhookConfigured) {
      const webhookRes = await sendEnquiryToWebhook({
        name: 'TEST ENQUIRY',
        email: '',
        phone: '',
        city: '',
        interest: '',
        budget: '',
        message: 'Test from the management page',
        source: 'Management test',
      });
      clientSent = Boolean(webhookRes.sent);
      setPendingCount(getPendingEnquiriesCount());
    }

    let serverSent = false;
    let previewUrl: string | undefined;
    let serverError: string | undefined;
    const alertHeaders = await buildMgmtHeaders(false);
    if (alertHeaders) {
      try {
        const res = await fetch('/api/management/test-alert', {
          method: 'POST',
          headers: alertHeaders,
        });
        const parsed = await parseApiResponse<{
          success?: boolean;
          deliveredToInbox?: boolean;
          webhookSent?: boolean;
          previewUrl?: string;
          error?: string;
        }>(res);
        if (parsed.ok && parsed.data) {
          serverSent = Boolean(parsed.data.success);
          previewUrl = parsed.data.previewUrl;
          serverError = parsed.data.error;
        }
      } catch {
        // Ignore network error and rely on clientSent status
      }
    }

    setSendingTestAlert(false);

    if (serverError) {
      setServerAlertStatus((prev) => (prev ? { ...prev, configIssue: serverError } : prev));
    } else if (serverSent) {
      setServerAlertStatus((prev) => (prev ? { ...prev, configIssue: undefined } : prev));
    }

    if (clientSent || serverSent) {
      showToast('Test alert sent. Check your email in a minute.', 'success');
    } else if (previewUrl) {
      setTestPreviewUrl(previewUrl);
      showToast(
        serverError
          ? `${serverError} Generated an Ethereal test preview instead.`
          : 'No live email/webhook configured yet — generated an Ethereal test preview instead.',
        'info'
      );
    } else {
      showToast(
        serverError ||
          'Email alerts are not configured. Set RESEND_API_KEY, SMTP_*, or VITE_ENQUIRY_WEBHOOK_URL.',
        'error'
      );
    }
  };

  const handleRetryQueue = async () => {
    setRetryingQueue(true);
    const result = await retryPendingEnquiries();
    setPendingCount(result.remainingCount);
    setRetryingQueue(false);

    if (result.skipped) {
      showToast('Email alerts are not configured.', 'info');
    } else if (result.remainingCount === 0) {
      showToast('Queued enquiries retried.', 'info');
    } else {
      showToast(`${result.remainingCount} enquiries remain in queue.`, 'info');
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: 'new' | 'contacted' | 'resolved'
  ) => {
    const headers = await buildMgmtHeaders(true);
    if (!headers) return;
    setUpdatingInquiryId(id);
    try {
      const res = await fetch(`/api/management/inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const parsed = await parseApiResponse<{ success?: boolean; error?: string }>(res);
      if (parsed.unreachable || !parsed.data) {
        showToast(SERVER_UNREACHABLE_MESSAGE, 'error');
      } else if (parsed.status === 401) {
        showToast(parsed.data.error || 'Management session expired. Please sign in again.', 'error');
        void logout();
      } else if (!parsed.ok || !parsed.data.success) {
        showToast(parsed.data.error || 'Failed to update inquiry status.', 'error');
      } else {
        setInquiries((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        showToast(`Marked submission as ${newStatus}.`, 'success');
      }
    } catch {
      showToast(SERVER_UNREACHABLE_MESSAGE, 'error');
    } finally {
      setUpdatingInquiryId(null);
    }
  };

  const handleDeleteInquiry = async (id: string, name: string) => {
    const headers = await buildMgmtHeaders(false);
    if (!headers) return;
    try {
      const res = await fetch(`/api/management/inquiries/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      const parsed = await parseApiResponse<{ success?: boolean; error?: string }>(res);
      setConfirmDeleteInquiryId(null);
      if (parsed.unreachable || !parsed.data) {
        showToast(SERVER_UNREACHABLE_MESSAGE, 'error');
      } else if (parsed.status === 401) {
        showToast(parsed.data.error || 'Management session expired. Please sign in again.', 'error');
        void logout();
      } else if (!parsed.ok || !parsed.data.success) {
        showToast(parsed.data.error || 'Could not delete submission.', 'error');
      } else {
        setInquiries((prev) => prev.filter((item) => item.id !== id));
        showToast(`Removed submission from "${name}".`, 'info');
      }
    } catch {
      setConfirmDeleteInquiryId(null);
      showToast(SERVER_UNREACHABLE_MESSAGE, 'error');
    }
  };

  const handleDeleteAccount = async (id: string, email: string) => {
    const headers = await buildMgmtHeaders(false);
    if (!headers && !auth.currentUser?.emailVerified) return;
    try {
      const res = headers
        ? await fetch(`/api/management/accounts/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers,
          })
        : null;
      const parsed = res ? await parseApiResponse<{ success?: boolean; error?: string }>(res) : null;

      let deletedFromFirestore = false;
      if (auth.currentUser?.emailVerified) {
        try {
          await deleteDoc(doc(db, 'users', id));
          deletedFromFirestore = true;
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
          } catch {
            // Best-effort Firestore delete
          }
        }
      }

      setConfirmDeleteAccountId(null);
      if ((parsed?.ok && parsed.data?.success) || deletedFromFirestore) {
        setAccounts((prev) => prev.filter((acc) => acc.id !== id));
        showToast(`Removed registered account "${email}".`, 'info');
      } else if (!parsed || parsed.unreachable || !parsed.data) {
        showToast(SERVER_UNREACHABLE_MESSAGE, 'error');
      } else if (parsed.status === 401) {
        showToast(parsed.data.error || 'Management session expired. Please sign in again.', 'error');
        void logout();
      } else {
        showToast(parsed.data.error || 'Could not delete account record.', 'error');
      }
    } catch {
      setConfirmDeleteAccountId(null);
      showToast(SERVER_UNREACHABLE_MESSAGE, 'error');
    }
  };

  const { todayCount, weekCount } = useMemo(() => {
    const { todayStartMs, weekStartMs } = getLocalRangeStarts();
    const nowMs = Date.now();
    let today = 0;
    let week = 0;
    for (const item of inquiries) {
      const t = new Date(item.createdAt).getTime();
      if (Number.isNaN(t) || t > nowMs) continue;
      if (t >= todayStartMs) today += 1;
      if (t >= weekStartMs) week += 1;
    }
    return { todayCount: today, weekCount: week };
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    const q = inquirySearch.trim().toLowerCase();
    const { todayStartMs, weekStartMs } = getLocalRangeStarts();
    const nowMs = Date.now();
    return inquiries.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (dateFilter !== 'all') {
        const t = new Date(item.createdAt).getTime();
        if (Number.isNaN(t) || t > nowMs) return false;
        if (dateFilter === 'today' && t < todayStartMs) return false;
        if (dateFilter === 'week' && t < weekStartMs) return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        (item.propertyTitle || '').toLowerCase().includes(q)
      );
    });
  }, [inquiries, inquirySearch, statusFilter, dateFilter]);

  const handleExportCsv = () => {
    const headers = [
      `Time in ${BRAND_CONFIG.locale.timezoneLabel}`,
      'Name',
      'Email',
      'Phone',
      'City',
      'Interest',
      'Budget',
      'Message',
      'Source',
    ];
    const rows = filteredInquiries.map((item) => {
      const messageParts = [
        item.propertyTitle && !item.message.includes(item.propertyTitle)
          ? `Property: ${item.propertyTitle}`
          : '',
        item.preferredDate && !item.message.includes(item.preferredDate)
          ? `Preferred Date: ${item.preferredDate}`
          : '',
        item.message || '',
      ].filter(Boolean);

      return [
        formatLocalDateTime(item.createdAt),
        item.name,
        item.email,
        item.phone,
        item.office || '',
        item.subject || '',
        item.timeframe || '',
        messageParts.join(' | '),
        item.source,
      ].map(escapeCsvCell);
    });

    const csvContent = [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join(
      '\r\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download = `${BRAND_CONFIG.identity.storageKeyPrefix}-enquiries-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (accountFilter === 'verified' && !acc.emailVerified) return false;
      if (accountFilter === 'pending' && acc.emailVerified) return false;
      if (accountFilter === 'email' && acc.provider !== 'email') return false;
      if (accountFilter === 'google' && acc.provider !== 'google') return false;
      if (!q) return true;
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        (acc.phone || '').toLowerCase().includes(q) ||
        acc.provider.toLowerCase().includes(q)
      );
    });
  }, [accounts, accountSearch, accountFilter]);

  const showInquiries = activeView === 'all' || activeView === 'inquiries';
  const showAccounts = activeView === 'all' || activeView === 'accounts';

  const statusBadgeClasses: Record<ContactInquiryRecord['status'], string> = {
    new: 'bg-amber-50 text-amber-800 border-amber-200',
    contacted: 'bg-blue-50 text-blue-800 border-blue-200',
    resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="px-2">
        <ol className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-slate-500">
          <li>
            <Link to="/" className="hover:text-brand transition-colors">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li className="text-brand font-bold" aria-current="page">
            Client Records
          </li>
        </ol>
      </nav>

      {/* Top Overview & Filter Card */}
      <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-10 shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-display uppercase tracking-widest text-accent font-bold block">
              Executive Management Portal
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-brand uppercase tracking-tight leading-none">
              CLIENT SUBMISSIONS & ACCOUNTS
            </h1>
            <p className="font-body text-xs sm:text-sm text-slate-600 max-w-2xl">
              Review all user inquiries submitted across contact, consultation, and property viewing forms alongside every registered client account created on {BRAND_CONFIG.identity.brandShortName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/manage"
              className="px-4 py-2 rounded-full border border-slate-200 hover:border-brand text-slate-700 text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manage Inventory</span>
            </Link>
            <button
              type="button"
              onClick={() => fetchRecords(true)}
              disabled={refreshing}
              className="px-4 py-2 rounded-full bg-brand hover:bg-accent disabled:opacity-60 text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Records'}</span>
            </button>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand text-brand-contrast flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-brand">
                    Alerts
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold border ${
                      alertsConfigured
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {alertsConfigured ? 'Email alerts: active' : 'Email alerts: not configured'}
                  </span>
                </div>
                <p className="font-body text-xs text-slate-600">
                  {alertsConfigured ? (
                    <>
                      Enquiry alerts active
                      {serverAlertStatus?.emailProvider && serverAlertStatus.emailProvider !== 'none'
                        ? ` (${serverAlertStatus.emailProvider.toUpperCase()} to ${serverAlertStatus.alertRecipient || 'management'})`
                        : ''}
                      {clientWebhookConfigured || serverAlertStatus?.serverWebhookConfigured
                        ? ` • Google Sheet webhook & daily ${BRAND_CONFIG.locale.dailyReportLabel} enabled`
                        : ''}
                    </>
                  ) : (
                    `Set RESEND_API_KEY / SMTP_* for instant email alerts or VITE_ENQUIRY_WEBHOOK_URL + VITE_ENQUIRY_KEY for Google Sheet & daily ${BRAND_CONFIG.locale.dailyReportLabel}s.`
                  )}
                </p>
                {serverAlertStatus?.configIssue && (
                  <p className="font-body text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 mt-1">
                    {serverAlertStatus.configIssue}
                  </p>
                )}
                {testPreviewUrl && (
                  <p className="font-body text-xs">
                    <a
                      href={testPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline font-semibold"
                    >
                      Open Ethereal test email preview →
                    </a>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendTestAlert}
              disabled={sendingTestAlert}
              className="px-4 py-2 rounded-full bg-white hover:bg-brand hover:text-brand-contrast text-brand border border-slate-200 text-xs font-display uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-60"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{sendingTestAlert ? 'Testing...' : 'Send test alert'}</span>
            </button>
          </div>

          {pendingCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/80 text-xs">
              <div className="flex items-center gap-2 text-amber-800 font-body font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {pendingCount} {pendingCount === 1 ? 'enquiry is' : 'enquiries are'} waiting to be sent
                </span>
              </div>
              <button
                type="button"
                onClick={handleRetryQueue}
                disabled={retryingQueue}
                className="px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-display uppercase tracking-wider font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                {retryingQueue ? 'Retrying...' : 'Retry now'}
              </button>
            </div>
          )}
        </div>

        {/* Section Filter Tabs */}
        <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveView('all')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'all'
                ? 'bg-brand text-brand-contrast shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Both Sections ({inquiries.length + accounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('inquiries')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'inquiries'
                ? 'bg-brand text-brand-contrast shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contact Submissions ({inquiries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('accounts')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'accounts'
                ? 'bg-brand text-brand-contrast shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Accounts ({accounts.length})</span>
          </button>
        </div>
      </section>

      {loading ? (
        <section className="bg-white rounded-[24px] sm:rounded-[32px] p-12 shadow-xl border border-slate-100 text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-brand/20 border-t-brand animate-spin mx-auto" />
          <p className="font-display text-xs uppercase tracking-widest text-accent font-semibold">
            Loading Stored Submissions & Accounts...
          </p>
        </section>
      ) : recordsError ? (
        <section className="bg-white rounded-[24px] sm:rounded-[32px] p-8 sm:p-10 shadow-xl border border-rose-200 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display font-bold text-lg text-brand uppercase">
              Could Not Load Client Records
            </h2>
            <p className="font-body text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              {recordsError}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchRecords(true)}
            className="px-5 py-2.5 rounded-full bg-brand hover:bg-accent text-brand-contrast text-xs font-display uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </section>
      ) : (
        <>
          {/* SECTION 01: CONTACT FORM SUBMISSIONS */}
          {showInquiries && (
            <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand text-brand-contrast flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block">
                      Section 01 — Inbound Form Submissions
                    </span>
                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-brand uppercase tracking-tight">
                      Contact & Viewing Submissions ({filteredInquiries.length})
                    </h2>
                  </div>
                </div>

                {/* Search, Status, Date Filters & Export CSV */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, email, property..."
                      value={inquirySearch}
                      onChange={(e) => setInquirySearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent w-full sm:w-56"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['all', 'new', 'contacted', 'resolved'] as InquiryStatusFilter[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer transition-colors ${
                          statusFilter === st
                            ? 'bg-brand text-brand-contrast'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setDateFilter((prev) => (prev === 'today' ? 'all' : 'today'))}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                        dateFilter === 'today'
                          ? 'bg-accent text-accent-contrast'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>Today</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold ${
                          dateFilter === 'today'
                            ? 'bg-white/20 text-accent-contrast'
                            : 'bg-white text-brand'
                        }`}
                      >
                        {todayCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDateFilter((prev) => (prev === 'week' ? 'all' : 'week'))}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                        dateFilter === 'week'
                          ? 'bg-accent text-accent-contrast'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>This week</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold ${
                          dateFilter === 'week'
                            ? 'bg-white/20 text-accent-contrast'
                            : 'bg-white text-brand'
                        }`}
                      >
                        {weekCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={filteredInquiries.length === 0}
                      className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:border-brand disabled:opacity-50 text-brand text-[11px] font-display uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {filteredInquiries.length === 0 ? (
                <div className="p-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-display font-bold text-sm text-brand uppercase">
                    No Contact Submissions Found
                  </p>
                  <p className="font-body text-xs text-slate-500">
                    {inquiries.length === 0
                      ? 'When visitors submit any contact, consultation, or private viewing form on the website, their details will appear here.'
                      : 'Try clearing your search term or status filter.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredInquiries.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-accent/40 transition-colors"
                    >
                      <div className="space-y-3">
                        {/* Card Top Row */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display font-bold text-base text-brand">
                                {item.name}
                              </h3>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold border ${statusBadgeClasses[item.status]}`}
                              >
                                {item.status === 'new'
                                  ? 'New'
                                  : item.status === 'contacted'
                                    ? 'Contacted'
                                    : 'Resolved'}
                              </span>
                            </div>
                            <span className="text-[11px] font-display uppercase tracking-wider text-accent font-semibold">
                              {item.source}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-body flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDateTime(item.createdAt)}</span>
                          </div>
                        </div>

                        {/* Subject & Property Highlight */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-display font-semibold text-brand">
                            {item.subject}
                          </span>
                          {item.propertyTitle && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface text-brand font-body font-semibold">
                              <Building2 className="w-3 h-3 text-accent" />
                              <span>{item.propertyTitle}</span>
                            </span>
                          )}
                        </div>

                        {/* Message Body */}
                        {item.message && (
                          <p className="font-body text-xs sm:text-sm text-slate-700 bg-white rounded-xl p-3 border border-slate-100 leading-relaxed whitespace-pre-line">
                            {item.message}
                          </p>
                        )}

                        {/* Contact Metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 font-body pt-1">
                          {item.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span className="truncate">{item.email}</span>
                            </div>
                          )}
                          {item.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>{item.phone}</span>
                            </div>
                          )}
                          {item.office && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>Office / City: {item.office}</span>
                            </div>
                          )}
                          {(item.preferredDate || item.timeframe) && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>
                                {item.preferredDate
                                  ? `Visit Date: ${item.preferredDate}`
                                  : `Timeframe: ${item.timeframe}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/80">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={updatingInquiryId === item.id}
                            aria-pressed={item.status === 'contacted'}
                            onClick={() =>
                              handleStatusChange(
                                item.id,
                                item.status === 'contacted' ? 'new' : 'contacted'
                              )
                            }
                            className={`px-3 py-1 rounded-full border text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60 ${
                              item.status === 'contacted'
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                : 'bg-white text-brand border-slate-200 hover:border-accent hover:bg-slate-50'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {item.status === 'contacted' ? 'Contacted' : 'Mark as contacted'}
                            </span>
                          </button>

                          <label className="text-[10px] font-display uppercase tracking-wider text-slate-500 font-semibold">
                            Status:
                          </label>
                          <select
                            value={item.status}
                            disabled={updatingInquiryId === item.id}
                            onChange={(e) =>
                              handleStatusChange(
                                item.id,
                                e.target.value as 'new' | 'contacted' | 'resolved'
                              )
                            }
                            className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-display uppercase tracking-wider font-semibold text-brand focus:outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>

                        {confirmDeleteInquiryId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteInquiry(item.id, item.name)}
                              className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-display font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteInquiryId(null)}
                              className="p-1 rounded-full bg-slate-200 text-slate-700 cursor-pointer"
                              aria-label="Cancel removal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteInquiryId(item.id)}
                            className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SECTION 02: REGISTERED WEBSITE ACCOUNTS */}
          {showAccounts && (
            <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-accent font-bold block">
                      Section 02 — Client Authentication Registry
                    </span>
                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-brand uppercase tracking-tight">
                      Created User Accounts ({filteredAccounts.length})
                    </h2>
                  </div>
                </div>

                {/* Search & Account Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search user name, email, phone..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-accent w-full sm:w-60"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'verified', 'pending', 'email', 'google'] as AccountFilter[]).map(
                      (flt) => (
                        <button
                          key={flt}
                          type="button"
                          onClick={() => setAccountFilter(flt)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer transition-colors ${
                            accountFilter === flt
                              ? 'bg-accent text-accent-contrast'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {flt}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {filteredAccounts.length === 0 ? (
                <div className="p-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-display font-bold text-sm text-brand uppercase">
                    No Registered User Accounts Found
                  </p>
                  <p className="font-body text-xs text-slate-500">
                    {accounts.length === 0
                      ? 'Whenever a visitor creates an account using email or Google Sign-In, their profile record will be listed here.'
                      : 'Try adjusting your search or filter selection.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-accent/40 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {acc.photoURL ? (
                              <img
                                src={acc.photoURL}
                                alt={acc.name}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-brand text-brand-contrast flex items-center justify-center font-display font-bold text-xs tracking-wider shrink-0">
                                {getInitials(acc.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-sm sm:text-base text-brand truncate">
                                {acc.name}
                              </h3>
                              <p className="font-body text-xs text-slate-600 truncate">
                                {acc.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold border ${
                              acc.provider === 'google'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {acc.provider === 'google' ? 'Google Sign-In' : 'Email Signup'}
                          </span>

                          {acc.emailVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Pending Verification</span>
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 font-body bg-white rounded-xl p-3 border border-slate-100">
                          {acc.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>{acc.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400">Created:</span>
                            <span className="font-medium text-slate-700">
                              {formatDateTime(acc.createdAt)}
                            </span>
                          </div>
                          {acc.lastLoginAt && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400">Last Sign-In:</span>
                              <span className="font-medium text-slate-700">
                                {formatDateTime(acc.lastLoginAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                          ID: {acc.id}
                        </span>

                        {confirmDeleteAccountId === acc.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.id, acc.email)}
                              className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-display font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteAccountId(null)}
                              className="p-1 rounded-full bg-slate-200 text-slate-700 cursor-pointer"
                              aria-label="Cancel removal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAccountId(acc.id)}
                            className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-[11px] font-display uppercase tracking-wider font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};
