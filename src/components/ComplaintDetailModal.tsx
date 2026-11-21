import React, { useEffect, useState } from 'react';
import {
  Check,
  Edit3,
  History,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  Share2,
  Trash2,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { createCatalogFromBusinessType } from '../data/presets';
import {
  getComplaintPaidAmount,
  getComplaintPendingAmount,
  getComplaintTotalBill,
} from '../db/localDb';
import {
  getStatusLabel,
  getTranslation,
  PAYMENT_METHODS,
  STATUS_OPTIONS,
} from '../i18n/translations';
import {
  BusinessSettings,
  CatalogPart,
  Complaint,
  CustomCatalog,
  Language,
  PaymentMethod,
  RepairStatus,
  SparePartItem,
} from '../types';
import {
  formatCurrency,
  formatDateDisplay,
  generateAndShareComplaintPDF,
  openWhatsAppChat,
} from '../utils/exports';
import { StatusLabel } from './StatusBadge';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  settings: BusinessSettings;
  lang: Language;
  onClose: () => void;
  onUpdate: (updated: Complaint) => Promise<void>;
  onUpdateCatalog: (catalog: CustomCatalog) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditBasic: (complaint: Complaint) => void;
  onOpenReceipt: (complaint: Complaint) => void;
  onGoHome: () => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  settings,
  lang,
  onClose,
  onUpdate,
  onUpdateCatalog,
  onDelete,
  onEditBasic,
  onOpenReceipt,
  onGoHome,
}) => {
  const t = getTranslation(lang);
  const catalog = settings.customCatalog || createCatalogFromBusinessType(settings.businessType);
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'repair' | 'payments' | 'history'>('repair');

  // Repair State
  const [status, setStatus] = useState<RepairStatus>(complaint?.status || 'Pending');
  const [repairStartDate, setRepairStartDate] = useState(
    complaint?.repairStartDate || todayStr
  );
  const [deliveryDate, setDeliveryDate] = useState(complaint?.deliveryDate || '');
  const [technicianName, setTechnicianName] = useState(
    complaint?.technicianName || settings.defaultTechnician || ''
  );
  const [problemFound, setProblemFound] = useState(complaint?.problemFound || '');
  const [repairWorkDetails, setRepairWorkDetails] = useState(
    complaint?.repairWorkDetails || ''
  );
  const [spareParts, setSpareParts] = useState<SparePartItem[]>(
    complaint?.spareParts || []
  );
  const [sparePartsCostInput, setSparePartsCostInput] = useState(
    String(complaint?.sparePartsCost || 0)
  );
  const [labourCharges, setLabourCharges] = useState(
    String(complaint?.labourCharges || 0)
  );
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState('1');
  const [newPartCost, setNewPartCost] = useState('');
  const [savePartToCatalog, setSavePartToCatalog] = useState(false);
  const [editCatalogParts, setEditCatalogParts] = useState(false);
  const [goHomeAfterSave, setGoHomeAfterSave] = useState(
    settings.goHomeOnSave !== false
  );

  // Payment State
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayStr);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payNote, setPayNote] = useState('');

  // Manual History Note
  const [historyNote, setHistoryNote] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  // Sync only when switching to a different complaint ID (avoids jarring remounts & lag)
  useEffect(() => {
    if (!complaint) return;
    setStatus(complaint.status);
    setRepairStartDate(complaint.repairStartDate || todayStr);
    setDeliveryDate(complaint.deliveryDate || '');
    setTechnicianName(complaint.technicianName || settings.defaultTechnician || '');
    setProblemFound(complaint.problemFound || '');
    setRepairWorkDetails(complaint.repairWorkDetails || '');
    setSpareParts(complaint.spareParts || []);
    setSparePartsCostInput(String(complaint.sparePartsCost || 0));
    setLabourCharges(String(complaint.labourCharges || 0));
    setGoHomeAfterSave(settings.goHomeOnSave !== false);
  }, [complaint?.id]);

  if (!complaint) return null;

  const pendingPartQty = Math.max(1, Number(newPartQty) || 1);
  const pendingPartUnit = Math.max(0, Number(newPartCost) || 0);
  const pendingPartTotal =
    newPartName.trim() || pendingPartUnit > 0
      ? pendingPartQty * pendingPartUnit
      : 0;

  const basePartsCost = Math.max(0, Number(sparePartsCostInput) || 0);
  const effectivePartsCost = basePartsCost + pendingPartTotal;
  const labourNum = Math.max(0, Number(labourCharges) || 0);
  const totalRepairCalc = effectivePartsCost + labourNum;

  const totalBill = getComplaintTotalBill(complaint);
  const liveTotalBill =
    totalRepairCalc > 0 ? totalRepairCalc : complaint.estimatedCost || totalBill;
  const paidTotal = getComplaintPaidAmount(complaint);
  const remainingDue = getComplaintPendingAmount(complaint);
  const liveRemainingDue = Math.max(0, liveTotalBill - paidTotal);

  const handleAddSparePart = async () => {
    const trimmed = newPartName.trim();
    const costNum = Math.max(0, Number(newPartCost) || 0);
    if (!trimmed && costNum <= 0) return;
    const partLabel = trimmed || (lang === 'gu' ? 'સ્પેરપાર્ટ' : 'Spare Part');
    const qtyNum = Math.max(1, Number(newPartQty) || 1);
    const itemTotal = qtyNum * costNum;

    const item: SparePartItem = {
      id: `sp-${Date.now()}`,
      name: partLabel,
      quantity: qtyNum,
      unitCost: costNum,
    };
    setSpareParts([...spareParts, item]);
    setSparePartsCostInput(String(basePartsCost + itemTotal));

    if (
      savePartToCatalog &&
      trimmed &&
      !catalog.spareParts.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      const catItem: CatalogPart = {
        id: `cat-part-${Date.now()}`,
        name: trimmed,
        defaultCost: costNum,
      };
      await onUpdateCatalog({
        ...catalog,
        spareParts: [...catalog.spareParts, catItem],
      });
    }

    setNewPartName('');
    setNewPartQty('1');
    setNewPartCost('');
    setSavePartToCatalog(false);
  };

  const handleUpdatePartRow = (
    id: string,
    field: 'quantity' | 'unitCost',
    value: string
  ) => {
    const num = Math.max(field === 'quantity' ? 1 : 0, Number(value) || 0);
    const target = spareParts.find((p) => p.id === id);
    if (!target) return;
    const oldTotal = (Number(target.quantity) || 1) * (Number(target.unitCost) || 0);
    const updatedRow = { ...target, [field]: num };
    const newTotal = updatedRow.quantity * updatedRow.unitCost;
    const diff = newTotal - oldTotal;
    setSpareParts(spareParts.map((p) => (p.id === id ? updatedRow : p)));
    setSparePartsCostInput(String(Math.max(0, basePartsCost + diff)));
  };

  const handleRemovePart = (id: string) => {
    const target = spareParts.find((p) => p.id === id);
    const removedTotal = target
      ? (Number(target.quantity) || 1) * (Number(target.unitCost) || 0)
      : 0;
    setSpareParts(spareParts.filter((p) => p.id !== id));
    setSparePartsCostInput(String(Math.max(0, basePartsCost - removedTotal)));
  };

  const handleRemoveCatalogPart = async (partId: string) => {
    await onUpdateCatalog({
      ...catalog,
      spareParts: catalog.spareParts.filter((p) => p.id !== partId),
    });
  };

  const handleStatusChange = (nextStatus: RepairStatus) => {
    setStatus(nextStatus);
    if (nextStatus === 'Delivered' && !deliveryDate) {
      setDeliveryDate(todayStr);
    }
  };

  const handleSaveRepairLog = async () => {
    const now = new Date().toISOString();
    let finalParts = [...spareParts];

    // If user typed a part or part price in the add row without clicking "+ Add Part", auto-include it
    if (newPartName.trim() || pendingPartUnit > 0) {
      finalParts.push({
        id: `sp-${Date.now()}`,
        name: newPartName.trim() || (lang === 'gu' ? 'સ્પેરપાર્ટ' : 'Spare Part'),
        quantity: pendingPartQty,
        unitCost: pendingPartUnit,
      });
      setSpareParts(finalParts);
      setSparePartsCostInput(String(effectivePartsCost));
      setNewPartName('');
      setNewPartQty('1');
      setNewPartCost('');
      setSavePartToCatalog(false);
    }

    const newHistory = [...(complaint.history || [])];

    if (status !== complaint.status) {
      newHistory.push({
        id: `hist-${Date.now()}-st`,
        timestamp: now,
        date: todayStr,
        type: status === 'Delivered' ? 'delivered' : 'status',
        title: `${lang === 'gu' ? 'સ્થિતિ બદલાઈ' : 'Status Updated'}: ${getStatusLabel(
          status,
          lang
        )}`,
        details: `${complaint.status} → ${status}${
          problemFound ? ` · ${problemFound}` : ''
        }`,
        actor: technicianName || settings.ownerName,
      });
    } else {
      newHistory.push({
        id: `hist-${Date.now()}-rp`,
        timestamp: now,
        date: todayStr,
        type: 'repair',
        title: lang === 'gu' ? 'રિપેરીંગ લોગ અપડેટ' : 'Repair Log Updated',
        details:
          repairWorkDetails ||
          problemFound ||
          `Updated spare parts (${finalParts.length}) & total ₹${totalRepairCalc}`,
        actor: technicianName || settings.ownerName,
      });
    }

    const updated: Complaint = {
      ...complaint,
      status,
      repairStartDate,
      deliveryDate: status === 'Delivered' ? deliveryDate || todayStr : deliveryDate,
      technicianName: technicianName.trim(),
      problemFound: problemFound.trim(),
      repairWorkDetails: repairWorkDetails.trim(),
      spareParts: finalParts,
      sparePartsCost: effectivePartsCost,
      labourCharges: labourNum,
      totalRepairCost: totalRepairCalc,
      history: newHistory,
      updatedAt: now,
    };

    await onUpdate(updated);
    if (goHomeAfterSave) {
      onGoHome();
      return;
    }
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.max(0, Number(payAmount) || 0);
    if (amt <= 0) return;
    const now = new Date().toISOString();

    let finalParts = [...spareParts];
    if (newPartName.trim() || pendingPartUnit > 0) {
      finalParts.push({
        id: `sp-${Date.now()}`,
        name: newPartName.trim() || (lang === 'gu' ? 'સ્પેરપાર્ટ' : 'Spare Part'),
        quantity: pendingPartQty,
        unitCost: pendingPartUnit,
      });
      setSpareParts(finalParts);
      setSparePartsCostInput(String(effectivePartsCost));
      setNewPartName('');
      setNewPartQty('1');
      setNewPartCost('');
      setSavePartToCatalog(false);
    }

    const updatedHistory = [...(complaint.history || [])];
    if (status !== complaint.status) {
      updatedHistory.push({
        id: `hist-${Date.now()}-st`,
        timestamp: now,
        date: todayStr,
        type: status === 'Delivered' ? 'delivered' : 'status',
        title: `${lang === 'gu' ? 'સ્થિતિ બદલાઈ' : 'Status Updated'}: ${getStatusLabel(
          status,
          lang
        )}`,
        details: `${complaint.status} → ${status}${
          problemFound ? ` · ${problemFound}` : ''
        }`,
        actor: technicianName || settings.ownerName,
      });
    }

    const record = {
      id: `pay-${Date.now()}`,
      amount: amt,
      date: payDate,
      method: payMethod,
      note: payNote.trim(),
      createdAt: now,
    };

    updatedHistory.push({
      id: `hist-${Date.now()}-pay`,
      timestamp: now,
      date: payDate,
      type: 'payment',
      title: `${lang === 'gu' ? 'પેમેન્ટ મળ્યું' : 'Payment Received'}: ₹${amt}`,
      details: `${payMethod}${payNote.trim() ? ` · ${payNote.trim()}` : ''}`,
      actor: settings.ownerName,
    });

    const updated: Complaint = {
      ...complaint,
      status,
      repairStartDate,
      deliveryDate: status === 'Delivered' ? deliveryDate || todayStr : deliveryDate,
      technicianName: technicianName.trim(),
      problemFound: problemFound.trim(),
      repairWorkDetails: repairWorkDetails.trim(),
      spareParts: finalParts,
      sparePartsCost: effectivePartsCost,
      labourCharges: labourNum,
      totalRepairCost: totalRepairCalc,
      payments: [...(complaint.payments || []), record],
      history: updatedHistory,
      updatedAt: now,
    };
    await onUpdate(updated);
    setPayAmount('');
    setPayNote('');
    onGoHome();
  };

  const handleDeletePayment = async (payId: string) => {
    const now = new Date().toISOString();
    const updated: Complaint = {
      ...complaint,
      payments: (complaint.payments || []).filter((p) => p.id !== payId),
      updatedAt: now,
    };
    await onUpdate(updated);
  };

  const handleAddManualNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyNote.trim()) return;
    const now = new Date().toISOString();
    const updated: Complaint = {
      ...complaint,
      history: [
        ...(complaint.history || []),
        {
          id: `hist-${Date.now()}-note`,
          timestamp: now,
          date: todayStr,
          type: 'note',
          title: lang === 'gu' ? 'રિપેરીંગ નોંધ' : 'Service Log Note',
          details: historyNote.trim(),
          actor: technicianName || settings.ownerName,
        },
      ],
      updatedAt: now,
    };
    await onUpdate(updated);
    setHistoryNote('');
  };

  const handleDeleteHistoryEntry = async (histId: string) => {
    const now = new Date().toISOString();
    const updated: Complaint = {
      ...complaint,
      history: (complaint.history || []).filter((h) => h.id !== histId),
      updatedAt: now,
    };
    await onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 sm:p-4">
      <div className="w-full max-w-3xl max-h-[94vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                {complaint.complaintNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{formatDateDisplay(complaint.complaintDate)}</span>
              <span aria-hidden="true">·</span>
              <StatusLabel status={complaint.status} lang={lang} />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {complaint.customerName} — {complaint.productName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Contact & Receipt Action Strip */}
        <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={`tel:${complaint.mobileNumber}`}
            className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Phone className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.actions.call}</span>
          </a>
          <button
            type="button"
            onClick={() => openWhatsAppChat(complaint, settings, lang, 'status')}
            className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.actions.whatsapp}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenReceipt(complaint)}
            className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>{t.actions.printReceipt}</span>
          </button>
          <button
            type="button"
            onClick={() => generateAndShareComplaintPDF(complaint, settings)}
            className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.actions.sharePdf}</span>
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => onEditBasic(complaint)}
            className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t.actions.edit}</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await onDelete(complaint.id);
              onClose();
            }}
            className="min-h-[40px] px-3 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.actions.delete}</span>
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="px-5 pt-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('repair')}
            className={`min-h-[42px] px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'repair'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>{t.detail.overviewTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`min-h-[42px] px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>
              {t.detail.paymentsTab} ({formatCurrency(remainingDue)})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`min-h-[42px] px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>
              {t.detail.historyTab} ({(complaint.history || []).length})
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'repair' && (
            <>
              {/* Intake Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.form.mobileNumber}:{' '}
                    <span className="font-mono text-slate-900 dark:text-slate-100">
                      {complaint.mobileNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.form.address}:{' '}
                    <span className="text-slate-800 dark:text-slate-200">
                      {complaint.address || '-'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.form.modelNumber}:{' '}
                    <span className="font-mono text-slate-900 dark:text-slate-100">
                      {complaint.modelNumber || '-'}
                    </span>{' '}
                    · SN:{' '}
                    <span className="font-mono text-slate-900 dark:text-slate-100">
                      {complaint.serialNumber || '-'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.form.complaintDetails}:{' '}
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {complaint.complaintDetails || '-'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.form.estimatedCost}:{' '}
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(complaint.estimatedCost)}
                    </span>
                  </div>
                </div>
              </div>

              {complaint.productPhoto && (
                <div>
                  <img
                    src={complaint.productPhoto}
                    alt={complaint.productName}
                    className="w-full max-h-52 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {/* Start Date & Technician */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t.detail.repairStartDate}
                  </label>
                  <input
                    type="date"
                    value={repairStartDate}
                    onChange={(e) => setRepairStartDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t.detail.technicianName}
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
              </div>

              {/* Diagnosis & Work */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t.detail.problemFound}
                  </label>
                  <textarea
                    rows={3}
                    value={problemFound}
                    onChange={(e) => setProblemFound(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t.detail.repairWorkDetails}
                  </label>
                  <textarea
                    rows={3}
                    value={repairWorkDetails}
                    onChange={(e) => setRepairWorkDetails(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </div>
              </div>

              {/* Spare Parts Table */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.detail.sparePartsUsed}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditCatalogParts(!editCatalogParts)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {editCatalogParts
                      ? t.actions.save
                      : `${t.actions.edit} ${t.settings.catalogParts}`}
                  </button>
                </div>

                {spareParts.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">{t.detail.partName}</th>
                          <th className="text-right px-2 py-2 font-medium">{t.detail.qty}</th>
                          <th className="text-right px-2 py-2 font-medium">{t.detail.unitCost}</th>
                          <th className="text-right px-3 py-2 font-medium">Total</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {spareParts.map((sp) => (
                          <tr
                            key={sp.id}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {sp.name}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <input
                                type="number"
                                min="1"
                                value={sp.quantity}
                                onChange={(e) =>
                                  handleUpdatePartRow(sp.id, 'quantity', e.target.value)
                                }
                                className="w-14 px-1.5 py-1 text-right rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <input
                                type="number"
                                min="0"
                                value={sp.unitCost}
                                onChange={(e) =>
                                  handleUpdatePartRow(sp.id, 'unitCost', e.target.value)
                                }
                                className="w-20 px-1.5 py-1 text-right rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                              ₹{sp.quantity * sp.unitCost}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePart(sp.id)}
                                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer"
                                title={t.settings.removeItem}
                                aria-label="Remove part"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add Spare Part Row */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      placeholder={t.detail.partName}
                      className="sm:col-span-6 min-h-[42px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                    <input
                      type="number"
                      min="1"
                      value={newPartQty}
                      onChange={(e) => setNewPartQty(e.target.value)}
                      placeholder={t.detail.qty}
                      className="sm:col-span-2 min-h-[42px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      value={newPartCost}
                      onChange={(e) => setNewPartCost(e.target.value)}
                      placeholder={t.detail.unitCost}
                      className="sm:col-span-2 min-h-[42px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddSparePart}
                      className="sm:col-span-2 min-h-[42px] px-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t.actions.addPart}</span>
                    </button>
                  </div>

                  {newPartName.trim() && (
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={savePartToCatalog}
                        onChange={(e) => setSavePartToCatalog(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span>
                        {lang === 'gu'
                          ? 'આ પાર્ટને કાયમી લિસ્ટમાં સેવ કરો'
                          : 'Save this part to reusable parts list'}
                      </span>
                    </label>
                  )}
                </div>

                {/* Quick Pick Spare Parts from Catalog */}
                <div className="flex flex-wrap gap-1.5">
                  {catalog.spareParts.map((sp) => (
                    <div
                      key={sp.id}
                      className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setNewPartName(sp.name);
                          if (sp.defaultCost > 0) {
                            setNewPartCost(String(sp.defaultCost));
                          }
                        }}
                        className="px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                      >
                        + {sp.name}
                        {sp.defaultCost > 0 ? ` (₹${sp.defaultCost})` : ''}
                      </button>
                      {editCatalogParts && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCatalogPart(sp.id)}
                          className="px-1.5 py-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950 cursor-pointer"
                          title={t.settings.removeItem}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.detail.sparePartsCost}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sparePartsCostInput}
                    onChange={(e) => setSparePartsCostInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums font-semibold text-sm"
                  />
                  {pendingPartTotal > 0 ? (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono mt-1">
                      + ₹{pendingPartTotal} = {formatCurrency(effectivePartsCost)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {t.detail.partsAutoHint}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.detail.labourCharges}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={labourCharges}
                    onChange={(e) => setLabourCharges(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t.detail.totalRepairCost}
                  </label>
                  <div className="min-h-[44px] px-3 flex items-center rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 font-mono tabular-nums font-bold text-base text-blue-700 dark:text-blue-300">
                    {formatCurrency(totalRepairCalc)}
                  </div>
                </div>
              </div>

              {/* Repair Status (Below Total Repairing Cost) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      {t.detail.repairStatus}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(e.target.value as RepairStatus)}
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {getStatusLabel(st, lang)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {status === 'Delivered' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                        {t.detail.deliveryDate}
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={goHomeAfterSave}
                      onChange={(e) => setGoHomeAfterSave(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <span>{t.detail.goHomeAfterSave}</span>
                  </label>

                  <div className="flex items-center justify-end gap-3">
                    {savedToast && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        <span>{t.settings.savedSuccess}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveRepairLog}
                      className="min-h-[44px] px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer whitespace-nowrap"
                    >
                      {t.detail.saveRepairLog}
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Hisab (Below Repair Status) */}
              <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{t.detail.paymentsTab}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t.detail.totalBill}
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                      {formatCurrency(liveTotalBill)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t.detail.totalPaid}
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrency(paidTotal)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t.detail.remainingBalance}
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                      {formatCurrency(liveRemainingDue)}
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleAddPayment}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t.actions.addPayment}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        {t.detail.paymentAmount}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder={String(liveRemainingDue || '')}
                        className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        {t.detail.paymentDate}
                      </label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        {t.detail.paymentMethod}
                      </label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                        className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {t.paymentMethod[m]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        {t.detail.paymentNote}
                      </label>
                      <input
                        type="text"
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        placeholder="GPay / Cash..."
                        className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
                    >
                      {t.actions.addPayment}
                    </button>
                  </div>
                </form>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {t.detail.paymentHistory}
                  </h4>
                  {!complaint.payments || complaint.payments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                      {t.detail.noPayments}
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                      {complaint.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-4 py-3 text-sm"
                        >
                          <div>
                            <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatCurrency(p.amount)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDateDisplay(p.date)} · {t.paymentMethod[p.method]}
                              {p.note ? ` · ${p.note}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id)}
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer"
                            aria-label="Delete payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.detail.totalBill}
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                    {formatCurrency(totalBill)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.detail.totalPaid}
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(paidTotal)}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t.detail.remainingBalance}
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                    {formatCurrency(remainingDue)}
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleAddPayment}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.actions.addPayment}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {t.detail.paymentAmount}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={String(remainingDue || '')}
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {t.detail.paymentDate}
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {t.detail.paymentMethod}
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {t.paymentMethod[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {t.detail.paymentNote}
                    </label>
                    <input
                      type="text"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="GPay / Cash..."
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                  >
                    {t.actions.addPayment}
                  </button>
                </div>
              </form>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {t.detail.paymentHistory}
                </h4>
                {(!complaint.payments || complaint.payments.length === 0) ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                    {t.detail.noPayments}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                    {complaint.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {formatCurrency(p.amount)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDateDisplay(p.date)} · {t.paymentMethod[p.method]}
                            {p.note ? ` · ${p.note}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer"
                          aria-label="Delete payment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              <form onSubmit={handleAddManualNote} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={historyNote}
                  onChange={(e) => setHistoryNote(e.target.value)}
                  placeholder={t.detail.notePlaceholder}
                  className="flex-1 min-h-[44px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  {t.actions.addNote}
                </button>
              </form>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.detail.permanentHistory}
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {[...(complaint.history || [])]
                    .reverse()
                    .map((entry) => (
                      <div key={entry.id} className="p-3.5 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {entry.title}
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
                              {formatDateDisplay(entry.date)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            {entry.details}
                          </p>
                          {entry.actor && (
                            <div className="text-[11px] text-slate-400">
                              By {entry.actor}
                            </div>
                          )}
                        </div>
                        {entry.type !== 'created' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryEntry(entry.id)}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                            title={t.settings.removeItem}
                            aria-label="Remove history entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
