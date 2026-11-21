import React, { useMemo, useState } from 'react';
import { Camera, Plus, Trash2, UserCheck, X } from 'lucide-react';
import { createCatalogFromBusinessType } from '../data/presets';
import { compressImageFile, formatComplaintNumber } from '../db/localDb';
import { getTranslation, PAYMENT_METHODS } from '../i18n/translations';
import {
  BusinessSettings,
  Complaint,
  CustomCatalog,
  Customer,
  Language,
  PaymentMethod,
} from '../types';

interface ComplaintFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (complaint: Complaint, isNew: boolean) => Promise<void>;
  onUpdateCatalog: (catalog: CustomCatalog) => Promise<void>;
  settings: BusinessSettings;
  customers: Customer[];
  existingComplaint?: Complaint | null;
  lang: Language;
}

export const ComplaintFormModal: React.FC<ComplaintFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdateCatalog,
  settings,
  customers,
  existingComplaint,
  lang,
}) => {
  const t = getTranslation(lang);
  const isEdit = !!existingComplaint;
  const todayStr = new Date().toISOString().split('T')[0];
  const catalog = settings.customCatalog || createCatalogFromBusinessType(settings.businessType);

  const [complaintNumber, setComplaintNumber] = useState(
    existingComplaint?.complaintNumber ||
      formatComplaintNumber(settings.nextSequenceNumber)
  );
  const [complaintDate, setComplaintDate] = useState(
    existingComplaint?.complaintDate || todayStr
  );
  const [customerName, setCustomerName] = useState(existingComplaint?.customerName || '');
  const [mobileNumber, setMobileNumber] = useState(existingComplaint?.mobileNumber || '');
  const [address, setAddress] = useState(existingComplaint?.address || '');
  const [matchedCustomerId, setMatchedCustomerId] = useState(
    existingComplaint?.customerId || ''
  );
  const [productName, setProductName] = useState(existingComplaint?.productName || '');
  const [modelNumber, setModelNumber] = useState(existingComplaint?.modelNumber || '');
  const [serialNumber, setSerialNumber] = useState(existingComplaint?.serialNumber || '');
  const [complaintDetails, setComplaintDetails] = useState(
    existingComplaint?.complaintDetails || ''
  );
  const [initialCondition, setInitialCondition] = useState(
    existingComplaint?.initialCondition || ''
  );
  const [estimatedCost, setEstimatedCost] = useState(
    existingComplaint?.estimatedCost ? String(existingComplaint.estimatedCost) : ''
  );
  const [advancePayment, setAdvancePayment] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>('Cash');
  const [customerRemarks, setCustomerRemarks] = useState(
    existingComplaint?.customerRemarks || ''
  );
  const [productPhoto, setProductPhoto] = useState<string | undefined>(
    existingComplaint?.productPhoto
  );
  const [technicianName, setTechnicianName] = useState(
    existingComplaint?.technicianName || settings.defaultTechnician || ''
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick add/remove states for presets
  const [editCatalogMode, setEditCatalogMode] = useState(false);
  const [newQuickProduct, setNewQuickProduct] = useState('');
  const [newQuickFault, setNewQuickFault] = useState('');

  const matchingCustomers = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    const m = mobileNumber.trim();
    if (!q && m.length < 3) return [];
    return customers
      .filter(
        (c) =>
          (q && c.name.toLowerCase().includes(q)) ||
          (m.length >= 3 && c.mobileNumber.includes(m))
      )
      .slice(0, 4);
  }, [customers, customerName, mobileNumber]);

  if (!isOpen) return null;

  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setMobileNumber(c.mobileNumber);
    setAddress(c.address);
    setMatchedCustomerId(c.id);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setProductPhoto(compressed);
    } catch {
      setErrorMsg('Could not process photo. Try another image.');
    }
  };

  const appendSuggestion = (current: string, item: string, setter: (v: string) => void) => {
    if (!current.trim()) {
      setter(item);
      return;
    }
    if (current.toLowerCase().includes(item.toLowerCase())) return;
    setter(`${current.trim()}, ${item}`);
  };

  const handleAddCatalogString = async (
    key: 'products' | 'faults',
    val: string,
    clearFn: () => void
  ) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (catalog[key].some((x) => x.toLowerCase() === trimmed.toLowerCase())) {
      clearFn();
      return;
    }
    await onUpdateCatalog({
      ...catalog,
      [key]: [...catalog[key], trimmed],
    });
    clearFn();
  };

  const handleRemoveCatalogString = async (
    key: 'products' | 'faults',
    item: string
  ) => {
    await onUpdateCatalog({
      ...catalog,
      [key]: catalog[key].filter((x) => x !== item),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !mobileNumber.trim() || !productName.trim()) {
      setErrorMsg(t.form.requiredError);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    const now = new Date().toISOString();
    const estNum = Math.max(0, Number(estimatedCost) || 0);
    const advNum = Math.max(0, Number(advancePayment) || 0);

    try {
      if (isEdit && existingComplaint) {
        const updated: Complaint = {
          ...existingComplaint,
          complaintNumber: complaintNumber.trim(),
          complaintDate,
          customerName: customerName.trim(),
          mobileNumber: mobileNumber.trim(),
          address: address.trim(),
          productName: productName.trim(),
          modelNumber: modelNumber.trim(),
          serialNumber: serialNumber.trim(),
          complaintDetails: complaintDetails.trim(),
          receivedAccessories: existingComplaint.receivedAccessories || '',
          initialCondition: initialCondition.trim(),
          estimatedCost: estNum,
          customerRemarks: customerRemarks.trim(),
          productPhoto,
          technicianName: technicianName.trim(),
          updatedAt: now,
          history: [
            ...(existingComplaint.history || []),
            {
              id: `hist-${Date.now()}`,
              timestamp: now,
              date: todayStr,
              type: 'note',
              title: lang === 'gu' ? 'ફરિયાદ વિગત સુધારી' : 'Complaint Details Updated',
              details: `${productName.trim()} — ${complaintDetails.trim() || 'Updated record'}`,
              actor: settings.ownerName || 'Admin',
            },
          ],
        };
        await onSave(updated, false);
      } else {
        const custId = matchedCustomerId || `cust-${Date.now()}`;
        const payments =
          advNum > 0
            ? [
                {
                  id: `pay-${Date.now()}`,
                  amount: advNum,
                  date: complaintDate,
                  method: advanceMethod,
                  note: 'Advance at complaint booking',
                  createdAt: now,
                },
              ]
            : [];

        const newComplaint: Complaint = {
          id: `cmp-${Date.now()}`,
          complaintNumber: complaintNumber.trim(),
          complaintDate,
          customerId: custId,
          customerName: customerName.trim(),
          mobileNumber: mobileNumber.trim(),
          address: address.trim(),
          productName: productName.trim(),
          modelNumber: modelNumber.trim(),
          serialNumber: serialNumber.trim(),
          complaintDetails: complaintDetails.trim(),
          receivedAccessories: '',
          initialCondition: initialCondition.trim(),
          estimatedCost: estNum,
          customerRemarks: customerRemarks.trim(),
          productPhoto,
          repairStartDate: '',
          problemFound: '',
          repairWorkDetails: '',
          spareParts: [],
          sparePartsCost: 0,
          labourCharges: 0,
          totalRepairCost: 0,
          technicianName: technicianName.trim(),
          status: 'Pending',
          deliveryDate: '',
          payments,
          history: [
            {
              id: `hist-${Date.now()}`,
              timestamp: now,
              date: complaintDate,
              type: 'created',
              title: lang === 'gu' ? 'નવી ફરિયાદ નોંધાઈ' : 'Complaint Registered',
              details: `Logged ${complaintNumber.trim()} for ${productName.trim()}${
                advNum > 0 ? ` (Advance ₹${advNum} via ${advanceMethod})` : ''
              }.`,
              actor: settings.ownerName || 'Admin',
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        await onSave(newComplaint, true);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0 gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? t.form.editTitle : t.form.newTitle}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditCatalogMode(!editCatalogMode)}
              className={`min-h-[36px] px-3 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                editCatalogMode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {editCatalogMode ? t.actions.save : `${t.actions.edit} ${t.form.suggestions}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label={t.actions.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Complaint Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.form.complaintNumber}
              </label>
              <input
                type="text"
                value={complaintNumber}
                onChange={(e) => setComplaintNumber(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.form.complaintDate}
              </label>
              <input
                type="date"
                value={complaintDate}
                onChange={(e) => setComplaintDate(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          {/* Customer Info + Smart Autocomplete */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.form.customerName} *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setMatchedCustomerId('');
                  }}
                  placeholder="e.g., Rameshbhai Patel"
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.form.mobileNumber} *
                </label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            {!isEdit && !matchedCustomerId && matchingCustomers.length > 0 && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-2.5 space-y-1.5">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{t.form.suggestions}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchingCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 hover:border-blue-500 cursor-pointer"
                    >
                      {c.name} · <span className="font-mono">{c.mobileNumber}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchedCustomerId && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t.form.existingCustomerHint}</span>
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.form.address}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Society, Street, Landmark"
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.form.productName} *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., LG Split AC / Submersible Pump / LED TV"
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {catalog.products.map((item) => (
                  <div key={item} className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setProductName(item)}
                      className="px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                    >
                      + {item}
                    </button>
                    {editCatalogMode && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCatalogString('products', item)}
                        className="px-1.5 py-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
                        title={t.settings.removeItem}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {editCatalogMode && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newQuickProduct}
                    onChange={(e) => setNewQuickProduct(e.target.value)}
                    placeholder={t.settings.addItemPlaceholder}
                    className="flex-1 min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddCatalogString('products', newQuickProduct, () =>
                        setNewQuickProduct('')
                      )
                    }
                    className="min-h-[38px] px-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.settings.addItemBtn}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.form.modelNumber}
                </label>
                <input
                  type="text"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.form.serialNumber}
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.form.complaintDetails}
              </label>
              <textarea
                rows={2}
                value={complaintDetails}
                onChange={(e) => setComplaintDetails(e.target.value)}
                placeholder="Describe fault or issue reported by customer"
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {catalog.faults.map((fault) => (
                  <div key={fault} className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => appendSuggestion(complaintDetails, fault, setComplaintDetails)}
                      className="px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                    >
                      + {fault}
                    </button>
                    {editCatalogMode && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCatalogString('faults', fault)}
                        className="px-1.5 py-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
                        title={t.settings.removeItem}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {editCatalogMode && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newQuickFault}
                    onChange={(e) => setNewQuickFault(e.target.value)}
                    placeholder={t.settings.addItemPlaceholder}
                    className="flex-1 min-h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddCatalogString('faults', newQuickFault, () =>
                        setNewQuickFault('')
                      )
                    }
                    className="min-h-[38px] px-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.settings.addItemBtn}</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.form.initialCondition}
              </label>
              <input
                type="text"
                value={initialCondition}
                onChange={(e) => setInitialCondition(e.target.value)}
                placeholder="Good / Scratches / Dent / Dead"
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Estimates, Advance & Technician */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.form.estimatedCost}
                </label>
                <input
                  type="number"
                  min="0"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              {!isEdit && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      {t.form.advancePayment}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={advancePayment}
                      onChange={(e) => setAdvancePayment(e.target.value)}
                      placeholder="0"
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      {t.form.advanceMethod}
                    </label>
                    <select
                      value={advanceMethod}
                      onChange={(e) => setAdvanceMethod(e.target.value as PaymentMethod)}
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {t.paymentMethod[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {isEdit && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t.detail.technicianName}
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.form.customerRemarks}
                </label>
                <input
                  type="text"
                  value={customerRemarks}
                  onChange={(e) => setCustomerRemarks(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.form.productPhoto}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 min-h-[44px] px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 flex items-center justify-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>{t.form.uploadPhoto}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {productPhoto && (
                    <button
                      type="button"
                      onClick={() => setProductPhoto(undefined)}
                      className="min-h-[44px] px-3 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {productPhoto && (
              <div className="mt-2">
                <img
                  src={productPhoto}
                  alt={productName || 'Product photo'}
                  className="w-full max-h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            {t.actions.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {t.actions.save}
          </button>
        </div>
      </div>
    </div>
  );
};
