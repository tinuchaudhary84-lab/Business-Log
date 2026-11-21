import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, MessageCircle, Printer } from 'lucide-react';
import {
  getComplaintPaidAmount,
  getComplaintPendingAmount,
  getComplaintTotalBill,
} from '../db/localDb';
import { getTranslation } from '../i18n/translations';
import { BusinessSettings, Complaint, Customer, Language } from '../types';
import {
  formatCurrency,
  formatDateDisplay,
  openWhatsAppChat,
} from '../utils/exports';
import { StatusLabel } from './StatusBadge';

interface ReportsViewProps {
  complaints: Complaint[];
  customers: Customer[];
  settings: BusinessSettings;
  lang: Language;
  onSelectComplaint: (c: Complaint) => void;
  onOpenReceipt: (c: Complaint) => void;
  onExportExcel: () => void;
}

type ReportType =
  | 'daily'
  | 'monthly'
  | 'pendingJobs'
  | 'completedJobs'
  | 'customerHistory'
  | 'monthlyIncome'
  | 'pendingPayments';

export const ReportsView: React.FC<ReportsViewProps> = ({
  complaints,
  customers,
  settings,
  lang,
  onSelectComplaint,
  onOpenReceipt,
  onExportExcel,
}) => {
  const t = getTranslation(lang);
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = todayStr.slice(0, 7);

  const [reportType, setReportType] = useState<ReportType>('daily');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers[0]?.id || ''
  );

  const reportTabs: { id: ReportType; label: string }[] = [
    { id: 'daily', label: t.reports.daily },
    { id: 'monthly', label: t.reports.monthly },
    { id: 'pendingJobs', label: t.reports.pendingJobs },
    { id: 'completedJobs', label: t.reports.completedJobs },
    { id: 'customerHistory', label: t.reports.customerHistory },
    { id: 'monthlyIncome', label: t.reports.monthlyIncome },
    { id: 'pendingPayments', label: t.reports.pendingPayments },
  ];

  const reportComplaints = useMemo(() => {
    switch (reportType) {
      case 'daily':
        return complaints.filter((c) => c.complaintDate === selectedDate);
      case 'monthly':
        return complaints.filter((c) => c.complaintDate.startsWith(selectedMonth));
      case 'pendingJobs':
        return complaints.filter(
          (c) => c.status !== 'Completed' && c.status !== 'Delivered'
        );
      case 'completedJobs':
        return complaints.filter(
          (c) => c.status === 'Completed' || c.status === 'Delivered'
        );
      case 'customerHistory': {
        const cust = customers.find((x) => x.id === selectedCustomerId);
        if (!cust) return [];
        return complaints.filter(
          (c) =>
            c.customerId === cust.id || c.mobileNumber === cust.mobileNumber
        );
      }
      case 'pendingPayments':
        return complaints.filter((c) => getComplaintPendingAmount(c) > 0);
      default:
        return [];
    }
  }, [
    reportType,
    complaints,
    customers,
    selectedDate,
    selectedMonth,
    selectedCustomerId,
  ]);

  const monthlyIncomeData = useMemo(() => {
    const entries: {
      complaintNumber: string;
      customerName: string;
      productName: string;
      date: string;
      amount: number;
      method: string;
    }[] = [];
    let cash = 0;
    let upi = 0;
    let other = 0;

    for (const c of complaints) {
      for (const p of c.payments || []) {
        if (p.date.startsWith(selectedMonth)) {
          entries.push({
            complaintNumber: c.complaintNumber,
            customerName: c.customerName,
            productName: c.productName,
            date: p.date,
            amount: p.amount,
            method: p.method,
          });
          if (p.method === 'Cash') cash += p.amount;
          else if (p.method === 'UPI') upi += p.amount;
          else other += p.amount;
        }
      }
    }
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return { entries, cash, upi, other, total: cash + upi + other };
  }, [complaints, selectedMonth]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.reports.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.reports.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onExportExcel}
          className="min-h-[44px] px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t.actions.exportExcel}</span>
        </button>
      </div>

      {/* Report Switcher */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReportType(tab.id)}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              reportType === tab.id
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Filters */}
      {(reportType === 'daily' ||
        reportType === 'monthly' ||
        reportType === 'monthlyIncome' ||
        reportType === 'customerHistory') && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
          {reportType === 'daily' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t.reports.selectDate}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          )}

          {(reportType === 'monthly' || reportType === 'monthlyIncome') && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t.reports.selectMonth}
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          )}

          {reportType === 'customerHistory' && (
            <div className="min-w-[260px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t.reports.selectCustomer}
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobileNumber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Monthly Income Report */}
      {reportType === 'monthlyIncome' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t.reports.totalIncome}</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(monthlyIncomeData.total)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t.reports.cashTotal}</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(monthlyIncomeData.cash)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t.reports.upiTotal}</div>
              <div className="text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(monthlyIncomeData.upi)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t.reports.otherTotal}</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300 mt-1">
                {formatCurrency(monthlyIncomeData.other)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {monthlyIncomeData.entries.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                {t.detail.noPayments}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyIncomeData.entries.map((entry, idx) => (
                  <div
                    key={`${entry.complaintNumber}-${idx}`}
                    className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {entry.customerName} ·{' '}
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                          {entry.complaintNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDateDisplay(entry.date)} · {entry.productName} ·{' '}
                        {entry.method}
                      </div>
                    </div>
                    <div className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(entry.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List-based Reports */
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t.reports.jobCount}</div>
              <div className="text-xl font-bold font-mono tabular-nums mt-1">
                {reportComplaints.length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">{t.detail.totalPaid}</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(
                  reportComplaints.reduce((s, c) => s + getComplaintPaidAmount(c), 0)
                )}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
              <div className="text-xs text-slate-500">{t.detail.remainingBalance}</div>
              <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(
                  reportComplaints.reduce(
                    (s, c) => s + getComplaintPendingAmount(c),
                    0
                  )
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {reportComplaints.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                {t.complaints.noResults}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportComplaints.map((c) => {
                  const total = getComplaintTotalBill(c);
                  const due = getComplaintPendingAmount(c);
                  return (
                    <div
                      key={c.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectComplaint(c)}
                        className="text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {c.complaintNumber}
                          </span>
                          <span>·</span>
                          <span className="font-mono">{formatDateDisplay(c.complaintDate)}</span>
                          <span>·</span>
                          <StatusLabel status={c.status} lang={lang} />
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {c.customerName} — {c.productName}
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
                          {t.detail.totalBill}: {formatCurrency(total)} ·{' '}
                          {due > 0
                            ? `${t.complaints.balanceDue}: ${formatCurrency(due)}`
                            : t.complaints.paidFull}
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {reportType === 'pendingPayments' && due > 0 && (
                          <button
                            type="button"
                            onClick={() => openWhatsAppChat(c, settings, lang, 'reminder')}
                            className="min-h-[40px] px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{t.reports.sendReminder}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(c)}
                          className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
                          aria-label={t.actions.printReceipt}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
