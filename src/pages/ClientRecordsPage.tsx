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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ContactInquiryRecord, RegisteredAccountRecord } from '../lib/inquiriesApi';

type SectionView = 'all' | 'inquiries' | 'accounts';
type InquiryStatusFilter = 'all' | 'new' | 'contacted' | 'resolved';
type AccountFilter = 'all' | 'verified' | 'pending' | 'email' | 'google';

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getInitials(name?: string): string {
  if (!name) return 'AV';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const ClientRecordsPage: React.FC = () => {
  const { managementToken } = useAuth();
  const { showToast } = useToast();

  const [inquiries, setInquiries] = useState<ContactInquiryRecord[]>([]);
  const [accounts, setAccounts] = useState<RegisteredAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeView, setActiveView] = useState<SectionView>('all');

  // Section 1 state (Contact Form Submissions)
  const [inquirySearch, setInquirySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>('all');
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(null);
  const [confirmDeleteInquiryId, setConfirmDeleteInquiryId] = useState<string | null>(null);

  // Section 2 state (Registered Accounts)
  const [accountSearch, setAccountSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Client Records & Accounts | Avenue Luxury Properties';
  }, []);

  const fetchRecords = useCallback(
    async (isManual = false) => {
      if (!managementToken) {
        setLoading(false);
        return;
      }
      if (isManual) setRefreshing(true);
      try {
        const res = await fetch('/api/management/records', {
          headers: {
            Authorization: `Bearer ${managementToken}`,
          },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Could not load client records.', 'error');
        } else {
          setInquiries(Array.isArray(data.inquiries) ? data.inquiries : []);
          setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        }
      } catch {
        showToast('Network error loading client records.', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [managementToken, showToast]
  );

  useEffect(() => {
    void fetchRecords(false);
  }, [fetchRecords]);

  const handleStatusChange = async (
    id: string,
    newStatus: 'new' | 'contacted' | 'resolved'
  ) => {
    if (!managementToken) return;
    setUpdatingInquiryId(id);
    try {
      const res = await fetch(`/api/management/inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managementToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update inquiry status.', 'error');
      } else {
        setInquiries((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        showToast(`Marked submission as ${newStatus}.`, 'success');
      }
    } catch {
      showToast('Network error updating inquiry status.', 'error');
    } finally {
      setUpdatingInquiryId(null);
    }
  };

  const handleDeleteInquiry = async (id: string, name: string) => {
    if (!managementToken) return;
    try {
      const res = await fetch(`/api/management/inquiries/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${managementToken}`,
        },
      });
      const data = await res.json();
      setConfirmDeleteInquiryId(null);
      if (!res.ok || !data.success) {
        showToast(data.error || 'Could not delete submission.', 'error');
      } else {
        setInquiries((prev) => prev.filter((item) => item.id !== id));
        showToast(`Removed submission from "${name}".`, 'info');
      }
    } catch {
      setConfirmDeleteInquiryId(null);
      showToast('Network error deleting submission.', 'error');
    }
  };

  const handleDeleteAccount = async (id: string, email: string) => {
    if (!managementToken) return;
    try {
      const res = await fetch(`/api/management/accounts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${managementToken}`,
        },
      });
      const data = await res.json();
      setConfirmDeleteAccountId(null);
      if (!res.ok || !data.success) {
        showToast(data.error || 'Could not delete account record.', 'error');
      } else {
        setAccounts((prev) => prev.filter((acc) => acc.id !== id));
        showToast(`Removed registered account "${email}".`, 'info');
      }
    } catch {
      setConfirmDeleteAccountId(null);
      showToast('Network error deleting account.', 'error');
    }
  };

  const filteredInquiries = useMemo(() => {
    const q = inquirySearch.trim().toLowerCase();
    return inquiries.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
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
  }, [inquiries, inquirySearch, statusFilter]);

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
            <Link to="/" className="hover:text-[#1B2A44] transition-colors">
              Home
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </li>
          <li className="text-[#1B2A44] font-bold" aria-current="page">
            Client Records
          </li>
        </ol>
      </nav>

      {/* Top Overview & Filter Card */}
      <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-10 shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
              Executive Management Portal
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-[#1B2A44] uppercase tracking-tight leading-none">
              CLIENT SUBMISSIONS & ACCOUNTS
            </h1>
            <p className="font-body text-xs sm:text-sm text-slate-600 max-w-2xl">
              Review all user inquiries submitted across contact, consultation, and property viewing forms alongside every registered client account created on Avenue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/manage"
              className="px-4 py-2 rounded-full border border-slate-200 hover:border-[#1B2A44] text-slate-700 text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manage Inventory</span>
            </Link>
            <button
              type="button"
              onClick={() => fetchRecords(true)}
              disabled={refreshing}
              className="px-4 py-2 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] disabled:opacity-60 text-white text-xs font-display uppercase tracking-wider font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Records'}</span>
            </button>
          </div>
        </div>

        {/* Section Filter Tabs */}
        <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveView('all')}
            className={`px-5 py-2.5 rounded-full font-display text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'all'
                ? 'bg-[#1B2A44] text-white shadow-md'
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
                ? 'bg-[#1B2A44] text-white shadow-md'
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
                ? 'bg-[#1B2A44] text-white shadow-md'
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
          <div className="w-10 h-10 rounded-full border-2 border-[#1B2A44]/20 border-t-[#1B2A44] animate-spin mx-auto" />
          <p className="font-display text-xs uppercase tracking-widest text-[#2F4B73] font-semibold">
            Loading Stored Submissions & Accounts...
          </p>
        </section>
      ) : (
        <>
          {/* SECTION 01: CONTACT FORM SUBMISSIONS */}
          {showInquiries && (
            <section className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-xl border border-slate-100 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#1B2A44] text-white flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
                      Section 01 — Inbound Form Submissions
                    </span>
                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#1B2A44] uppercase tracking-tight">
                      Contact & Viewing Submissions ({filteredInquiries.length})
                    </h2>
                  </div>
                </div>

                {/* Search & Status Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, email, property..."
                      value={inquirySearch}
                      onChange={(e) => setInquirySearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73] w-full sm:w-60"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'new', 'contacted', 'resolved'] as InquiryStatusFilter[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider font-semibold cursor-pointer transition-colors ${
                          statusFilter === st
                            ? 'bg-[#1B2A44] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredInquiries.length === 0 ? (
                <div className="p-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-display font-bold text-sm text-[#1B2A44] uppercase">
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
                      className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#2F4B73]/40 transition-colors"
                    >
                      <div className="space-y-3">
                        {/* Card Top Row */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display font-bold text-base text-[#1B2A44]">
                                {item.name}
                              </h3>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold border ${statusBadgeClasses[item.status]}`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <span className="text-[11px] font-display uppercase tracking-wider text-[#2F4B73] font-semibold">
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
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-display font-semibold text-[#1B2A44]">
                            {item.subject}
                          </span>
                          {item.propertyTitle && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E6ECF5] text-[#1B2A44] font-body font-semibold">
                              <Building2 className="w-3 h-3 text-[#2F4B73]" />
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
                              <Mail className="w-3.5 h-3.5 text-[#2F4B73] shrink-0" />
                              <span className="truncate">{item.email}</span>
                            </div>
                          )}
                          {item.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#2F4B73] shrink-0" />
                              <span>{item.phone}</span>
                            </div>
                          )}
                          {item.office && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#2F4B73] shrink-0" />
                              <span>Office / City: {item.office}</span>
                            </div>
                          )}
                          {(item.preferredDate || item.timeframe) && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#2F4B73] shrink-0" />
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
                        <div className="flex items-center gap-2">
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
                            className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-display uppercase tracking-wider font-semibold text-[#1B2A44] focus:outline-none focus:border-[#2F4B73] cursor-pointer"
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
                  <div className="w-11 h-11 rounded-2xl bg-[#2F4B73] text-white flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-[#2F4B73] font-bold block">
                      Section 02 — Client Authentication Registry
                    </span>
                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#1B2A44] uppercase tracking-tight">
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
                      className="pl-8 pr-3 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-[#2F4B73] w-full sm:w-60"
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
                              ? 'bg-[#2F4B73] text-white'
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
                  <p className="font-display font-bold text-sm text-[#1B2A44] uppercase">
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
                      className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-[#2F4B73]/40 transition-colors"
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
                              <div className="w-11 h-11 rounded-full bg-[#1B2A44] text-white flex items-center justify-center font-display font-bold text-xs tracking-wider shrink-0">
                                {getInitials(acc.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-sm sm:text-base text-[#1B2A44] truncate">
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
                              <Phone className="w-3.5 h-3.5 text-[#2F4B73] shrink-0" />
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
