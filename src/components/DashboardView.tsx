import React, { useState } from 'react';
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  Wrench,
  X,
} from 'lucide-react';
import { getBusinessTypeOptions } from '../data/presets';
import {
  getComplaintPaidAmount,
  getComplaintPendingAmount,
} from '../db/localDb';
import { getBusinessTypeLabel, getTranslation } from '../i18n/translations';
import {
  BusinessSettings,
  BusinessType,
  BusinessTypeOption,
  Complaint,
  Language,
} from '../types';
import { formatCurrency, formatDateDisplay, openWhatsAppChat } from '../utils/exports';
import { StatusLabel } from './StatusBadge';

interface DashboardViewProps {
  complaints: Complaint[];
  settings: BusinessSettings;
  lang: Language;
  onNewComplaint: () => void;
  onSelectComplaint: (c: Complaint) => void;
  onOpenReceipt: (c: Complaint) => void;
  onNavigateTab: (tab: 'complaints' | 'customers' | 'reports' | 'settings') => void;
  onExportExcel: () => void;
  onBackupJson: () => void;
  onSelectBusinessType: (type: BusinessType) => void;
  onUpdateBusinessTypes: (options: BusinessTypeOption[], activeType?: BusinessType) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  complaints,
  settings,
  lang,
  onNewComplaint,
  onSelectComplaint,
  onOpenReceipt,
  onNavigateTab,
  onExportExcel,
  onBackupJson,
  onSelectBusinessType,
  onUpdateBusinessTypes,
}) => {
  const t = getTranslation(lang);
  const [newBizName, setNewBizName] = useState('');
  const businessOptions = getBusinessTypeOptions(settings);

  const totalComplaints = complaints.length;
  const newComplaints = complaints.filter((c) => c.status === 'Pending').length;
  const pendingComplaints = complaints.filter((c) =>
    ['Pending', 'Checking', 'Waiting for Spare Parts'].includes(c.status)
  ).length;
  const inProgressRepairs = complaints.filter((c) => c.status === 'Under Repair').length;
  const completedRepairs = complaints.filter((c) => c.status === 'Completed').length;
  const deliveredItems = complaints.filter((c) => c.status === 'Delivered').length;

  const totalReceived = complaints.reduce((s, c) => s + getComplaintPaidAmount(c), 0);
  const totalPendingPayment = complaints.reduce(
    (s, c) => s + getComplaintPendingAmount(c),
    0
  );

  const pendingJobs = complaints.filter(
    (c) => c.status !== 'Completed' && c.status !== 'Delivered'
  );

  const stats = [
    { label: t.dashboard.totalComplaints, value: String(totalComplaints), tone: 'text-slate-900 dark:text-slate-100' },
    { label: t.dashboard.newComplaints, value: String(newComplaints), tone: 'text-amber-600 dark:text-amber-400' },
    { label: t.dashboard.pendingComplaints, value: String(pendingComplaints), tone: 'text-orange-600 dark:text-orange-400' },
    { label: t.dashboard.inProgressRepairs, value: String(inProgressRepairs), tone: 'text-blue-600 dark:text-blue-400' },
    { label: t.dashboard.completedRepairs, value: String(completedRepairs), tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: t.dashboard.deliveredItems, value: String(deliveredItems), tone: 'text-slate-600 dark:text-slate-400' },
    { label: t.dashboard.totalReceived, value: formatCurrency(totalReceived), tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: t.dashboard.totalPendingPayment, value: formatCurrency(totalPendingPayment), tone: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Intro & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {settings.shopName} ·{' '}
            {getBusinessTypeLabel(settings.businessType, lang, businessOptions)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportExcel}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t.actions.exportExcel}</span>
          </button>
          <button
            type="button"
            onClick={onBackupJson}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>{t.actions.backupData}</span>
          </button>
          <button
            type="button"
            onClick={onNewComplaint}
            className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.newComplaint}</span>
          </button>
        </div>
      </div>

      {/* Optional Business Type Setup Strip (if not yet customized) */}
      {!settings.setupCompleted && (
        <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t.dashboard.businessPromptTitle}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {t.dashboard.businessPromptDesc}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {businessOptions.map((bType) => {
              const active = settings.businessType === bType.id;
              return (
                <div
                  key={bType.id}
                  className={`inline-flex items-center rounded-lg border text-xs font-medium overflow-hidden ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectBusinessType(bType.id)}
                    className="min-h-[40px] px-3.5 cursor-pointer whitespace-nowrap"
                  >
                    {lang === 'gu' ? bType.labelGu : bType.labelEn}
                  </button>
                  {businessOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = businessOptions.filter((o) => o.id !== bType.id);
                        const nextActive = active ? next[0].id : settings.businessType;
                        onUpdateBusinessTypes(next, nextActive);
                      }}
                      className={`min-h-[40px] px-2 cursor-pointer ${
                        active
                          ? 'hover:bg-blue-700 text-white'
                          : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                      }`}
                      title={t.settings.removeItem}
                      aria-label={t.settings.removeItem}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <input
              type="text"
              value={newBizName}
              onChange={(e) => setNewBizName(e.target.value)}
              placeholder={t.settings.newBusinessTypePlaceholder}
              className="flex-1 min-h-[40px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = newBizName.trim();
                if (!trimmed) return;
                const newOpt: BusinessTypeOption = {
                  id: `custom-${Date.now()}`,
                  labelEn: trimmed,
                  labelGu: trimmed,
                };
                onUpdateBusinessTypes([...businessOptions, newOpt], newOpt.id);
                setNewBizName('');
              }}
              className="min-h-[40px] px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.settings.addItemBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* 8-Card KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((st) => (
          <div
            key={st.label}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {st.label}
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1.5 ${st.tone}`}
            >
              {st.value}
            </div>
          </div>
        ))}
      </div>

      {/* Pending List Section (Advice #3: Immediately visible pending customers) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t.dashboard.pendingListTitle} ({pendingJobs.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.dashboard.pendingListSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('complaints')}
            className="min-h-[40px] px-3 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>{t.nav.complaints}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingJobs.length === 0 ? (
          <div className="p-8 text-center">
            <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.dashboard.noPending}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingJobs.slice(0, 8).map((c) => {
              const due = getComplaintPendingAmount(c);
              return (
                <div
                  key={c.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelectComplaint(c)}
                    className="text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {c.complaintNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{formatDateDisplay(c.complaintDate)}</span>
                      <span aria-hidden="true">·</span>
                      <StatusLabel status={c.status} lang={lang} />
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate mt-1">
                      {c.customerName} — {c.productName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {c.complaintDetails || '-'}
                      {due > 0 && (
                        <span className="ml-2 font-mono font-semibold text-amber-600 dark:text-amber-400">
                          · {t.complaints.balanceDue}: {formatCurrency(due)}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${c.mobileNumber}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={t.actions.call}
                      aria-label={t.actions.call}
                    >
                      <Phone className="w-4 h-4 text-blue-600" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openWhatsAppChat(c, settings, lang, 'status')}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title={t.actions.whatsapp}
                      aria-label={t.actions.whatsapp}
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(c)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title={t.actions.printReceipt}
                      aria-label={t.actions.printReceipt}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectComplaint(c)}
                      className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 cursor-pointer whitespace-nowrap"
                    >
                      {t.actions.view}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
