import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  Edit3,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { getComplaintPendingAmount } from '../db/localDb';
import { getTranslation } from '../i18n/translations';
import { BusinessSettings, Complaint, Customer, Language } from '../types';
import {
  formatCurrency,
  formatDateDisplay,
  normalizePhoneForWhatsApp,
} from '../utils/exports';
import { StatusLabel } from './StatusBadge';

interface CustomersViewProps {
  customers: Customer[];
  complaints: Complaint[];
  settings: BusinessSettings;
  lang: Language;
  onSaveCustomer: (customer: Customer) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onSelectComplaint: (c: Complaint) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  complaints,
  settings,
  lang,
  onSaveCustomer,
  onDeleteCustomer,
  onSelectComplaint,
}) => {
  const t = getTranslation(lang);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const enrichedCustomers = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return customers
      .map((cust) => {
        const custComplaints = complaints.filter(
          (c) =>
            c.customerId === cust.id ||
            (c.mobileNumber && c.mobileNumber === cust.mobileNumber)
        );
        const pendingTotal = custComplaints.reduce(
          (sum, c) => sum + getComplaintPendingAmount(c),
          0
        );
        return {
          customer: cust,
          complaints: custComplaints,
          pendingTotal,
        };
      })
      .filter((entry) => {
        if (!q) return true;
        const hay = `${entry.customer.name} ${entry.customer.mobileNumber} ${entry.customer.address}`.toLowerCase();
        return hay.includes(q);
      });
  }, [customers, complaints, search]);

  const openNewForm = () => {
    setEditingCustomer(null);
    setName('');
    setMobileNumber('');
    setAddress('');
    setNotes('');
    setShowForm(true);
  };

  const openEditForm = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setMobileNumber(cust.mobileNumber);
    setAddress(cust.address);
    setNotes(cust.notes || '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobileNumber.trim()) return;
    const now = new Date().toISOString();
    const record: Customer = editingCustomer
      ? {
          ...editingCustomer,
          name: name.trim(),
          mobileNumber: mobileNumber.trim(),
          address: address.trim(),
          notes: notes.trim(),
          updatedAt: now,
        }
      : {
          id: `cust-${Date.now()}`,
          name: name.trim(),
          mobileNumber: mobileNumber.trim(),
          address: address.trim(),
          notes: notes.trim(),
          createdAt: now,
          updatedAt: now,
        };
    await onSaveCustomer(record);
    setShowForm(false);
    if (selectedCustomer && selectedCustomer.id === record.id) {
      setSelectedCustomer(record);
    }
  };

  const selectedEntry = selectedCustomer
    ? enrichedCustomers.find((e) => e.customer.id === selectedCustomer.id)
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.customers.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.customers.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{t.actions.addCustomer}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.customers.searchPlaceholder}
          className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {enrichedCustomers.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <User className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.customers.noCustomers}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrichedCustomers.map(({ customer, complaints: custJobs, pendingTotal }) => (
            <div
              key={customer.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => setSelectedCustomer(customer)}
                className="text-left cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {customer.name}
                  </h3>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    {custJobs.length} {t.customers.totalJobs}
                  </span>
                </div>
                <div className="font-mono text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  {customer.mobileNumber}
                </div>
                {customer.address && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {customer.address}
                  </p>
                )}
              </button>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="text-slate-500">{t.customers.pendingAmount}: </span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      pendingTotal > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatCurrency(pendingTotal)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${customer.mobileNumber}`}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label={t.actions.call}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const wa = normalizePhoneForWhatsApp(customer.mobileNumber);
                      if (wa) {
                        const msg = `Hello ${customer.name}, message from ${settings.shopName}`;
                        window.open(
                          `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      }
                    }}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    aria-label={t.actions.whatsapp}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(customer)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    aria-label={t.actions.edit}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer History Modal */}
      {selectedCustomer && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 sm:p-4">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedCustomer.name}
                </h2>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {selectedCustomer.mobileNumber} · {selectedCustomer.address || '-'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteCustomer(selectedCustomer.id);
                    setSelectedCustomer(null);
                  }}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                  aria-label={t.actions.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  aria-label={t.actions.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>
                  {t.customers.historyTitle} ({selectedEntry.complaints.length})
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  {t.customers.pendingAmount}: {formatCurrency(selectedEntry.pendingTotal)}
                </span>
              </div>

              {selectedEntry.complaints.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">{t.complaints.noResults}</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {selectedEntry.complaints.map((c) => {
                    const due = getComplaintPendingAmount(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          onSelectComplaint(c);
                        }}
                        className="w-full p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {c.complaintNumber} · {formatDateDisplay(c.complaintDate)}
                          </span>
                          <StatusLabel status={c.status} lang={lang} />
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                          {c.productName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex justify-between">
                          <span className="truncate">{c.complaintDetails || '-'}</span>
                          <span className="font-mono shrink-0 ml-2">
                            {due > 0 ? `${t.complaints.balanceDue}: ₹${due}` : t.complaints.paidFull}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingCustomer ? t.actions.edit : t.actions.addCustomer}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.form.customerName} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.form.mobileNumber} *
                </label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.form.address}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t.customers.notes}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium cursor-pointer"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
