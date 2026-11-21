import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  MessageCircle,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  getComplaintPendingAmount,
  getComplaintTotalBill,
} from '../db/localDb';
import {
  getStatusLabel,
  getTranslation,
  STATUS_OPTIONS,
} from '../i18n/translations';
import { BusinessSettings, Complaint, Language, RepairStatus } from '../types';
import { formatCurrency, formatDateDisplay, openWhatsAppChat } from '../utils/exports';
import { StatusLabel } from './StatusBadge';

interface ComplaintsViewProps {
  complaints: Complaint[];
  settings: BusinessSettings;
  lang: Language;
  onNewComplaint: () => void;
  onSelectComplaint: (c: Complaint) => void;
  onOpenReceipt: (c: Complaint) => void;
}

type DateFilterMode = 'all' | 'today' | 'last7' | 'month' | 'custom';

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  complaints,
  settings,
  lang,
  onNewComplaint,
  onSelectComplaint,
  onOpenReceipt,
}) => {
  const t = getTranslation(lang);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | RepairStatus>('all');
  const [dateMode, setDateMode] = useState<DateFilterMode>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pendingPayOnly, setPendingPayOnly] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.slice(0, 7);

    return complaints.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (pendingPayOnly && getComplaintPendingAmount(c) <= 0) return false;

      if (dateMode === 'today' && c.complaintDate !== todayStr) return false;
      if (dateMode === 'last7' && c.complaintDate < weekAgoStr) return false;
      if (dateMode === 'month' && !c.complaintDate.startsWith(currentMonthPrefix))
        return false;
      if (dateMode === 'custom') {
        if (fromDate && c.complaintDate < fromDate) return false;
        if (toDate && c.complaintDate > toDate) return false;
      }

      if (q) {
        const hay = [
          c.complaintNumber,
          c.customerName,
          c.mobileNumber,
          c.productName,
          c.modelNumber,
          c.serialNumber,
          c.complaintDate,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    complaints,
    searchQuery,
    statusFilter,
    dateMode,
    fromDate,
    toDate,
    pendingPayOnly,
    todayStr,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateMode('all');
    setFromDate('');
    setToDate('');
    setPendingPayOnly(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.complaints.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
            {filtered.length} / {complaints.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewComplaint}
          className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{t.actions.newComplaint}</span>
        </button>
      </div>

      {/* Search & Filter Panel */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.complaints.searchPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | RepairStatus)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="all">{t.complaints.allStatuses}</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {getStatusLabel(st, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value as DateFilterMode)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="all">{t.complaints.allDates}</option>
              <option value="today">{t.complaints.today}</option>
              <option value="last7">{t.complaints.last7Days}</option>
              <option value="month">{t.complaints.thisMonth}</option>
              <option value="custom">{t.complaints.customRange}</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingPayOnly(!pendingPayOnly)}
              className={`flex-1 min-h-[44px] px-3 rounded-xl border text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                pendingPayOnly
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.complaints.pendingPayOnly}
            </button>
            {(searchQuery || statusFilter !== 'all' || dateMode !== 'all' || pendingPayOnly) && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                title={t.actions.clearFilters}
                aria-label={t.actions.clearFilters}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {dateMode === 'custom' && (
          <div className="grid grid-cols-2 sm:max-w-md gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                {t.complaints.from}
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                {t.complaints.to}
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.complaints.noResults}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">{t.form.complaintNumber}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t.form.customerName}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t.form.productName}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t.detail.repairStatus}</th>
                    <th className="text-right px-4 py-3 font-semibold">{t.detail.totalBill}</th>
                    <th className="text-right px-4 py-3 font-semibold">{t.complaints.balanceDue}</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((c) => {
                    const total = getComplaintTotalBill(c);
                    const due = getComplaintPendingAmount(c);
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectComplaint(c)}
                            className="text-left cursor-pointer"
                          >
                            <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                              {c.complaintNumber}
                            </div>
                            <div className="font-mono text-xs text-slate-500">
                              {formatDateDisplay(c.complaintDate)}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {c.customerName}
                          </div>
                          <div className="font-mono text-xs text-slate-500">
                            {c.mobileNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {c.productName}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {c.complaintDetails || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusLabel status={c.status} lang={lang} />
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {due > 0 ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {formatCurrency(due)}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              {t.complaints.paidFull}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={`tel:${c.mobileNumber}`}
                              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title={t.actions.call}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => openWhatsAppChat(c, settings, lang, 'status')}
                              className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title={t.actions.whatsapp}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenReceipt(c)}
                              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title={t.actions.printReceipt}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectComplaint(c)}
                              className="ml-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                            >
                              {t.actions.view}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Touch List */}
          <div className="lg:hidden space-y-3">
            {filtered.map((c) => {
              const total = getComplaintTotalBill(c);
              const due = getComplaintPendingAmount(c);
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelectComplaint(c)}
                    className="w-full text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {c.complaintNumber} · {formatDateDisplay(c.complaintDate)}
                      </span>
                      <StatusLabel status={c.status} lang={lang} />
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {c.customerName}
                    </div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {c.productName}
                    </div>
                    {c.complaintDetails && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {c.complaintDetails}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                        {t.detail.totalBill}: {formatCurrency(total)}
                      </span>
                      {due > 0 ? (
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {t.complaints.balanceDue}: {formatCurrency(due)}
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {t.complaints.paidFull}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${c.mobileNumber}`}
                      className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t.actions.call}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => openWhatsAppChat(c, settings, lang, 'status')}
                      className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.actions.whatsapp}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(c)}
                      className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
                      aria-label={t.actions.printReceipt}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
