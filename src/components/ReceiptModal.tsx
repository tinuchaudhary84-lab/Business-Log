import React, { useState } from 'react';
import { Printer, Share2, X } from 'lucide-react';
import {
  getComplaintPaidAmount,
  getComplaintPendingAmount,
  getComplaintTotalBill,
} from '../db/localDb';
import { getStatusLabel, getTranslation } from '../i18n/translations';
import { BusinessSettings, Complaint, Language } from '../types';
import {
  formatCurrency,
  formatDateDisplay,
  generateAndShareComplaintPDF,
} from '../utils/exports';

interface ReceiptModalProps {
  complaint: Complaint | null;
  settings: BusinessSettings;
  lang: Language;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  complaint,
  settings,
  lang,
  onClose,
}) => {
  const [thermal, setThermal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const t = getTranslation(lang);

  if (!complaint) return null;

  const total = getComplaintTotalBill(complaint);
  const paid = getComplaintPaidAmount(complaint);
  const due = getComplaintPendingAmount(complaint);

  const handlePrint = () => {
    window.print();
  };

  const handleSharePdf = async () => {
    setSharing(true);
    try {
      await generateAndShareComplaintPDF(complaint, settings);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Non-print toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setThermal(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer whitespace-nowrap ${
                !thermal
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.receipt.a4Mode}
            </button>
            <button
              type="button"
              onClick={() => setThermal(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer whitespace-nowrap ${
                thermal
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.receipt.thermalMode}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSharePdf}
              disabled={sharing}
              className="min-h-[40px] px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-4 h-4" />
              <span>{t.actions.sharePdf}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[40px] px-4 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>{t.actions.printReceipt}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              aria-label={t.actions.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          <div
            className={`print-only-container mx-auto bg-white text-slate-900 border border-slate-300 p-5 sm:p-7 ${
              thermal ? 'max-w-[340px] text-xs' : 'max-w-[680px] text-sm'
            }`}
          >
            {/* Header */}
            <div className="text-center border-b border-slate-300 pb-4">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {settings.shopName}
              </h2>
              <p className="text-xs text-slate-600 mt-1">{settings.shopAddress}</p>
              <p className="text-xs font-mono text-slate-700 mt-0.5">
                Ph: {settings.shopPhone}
              </p>
              <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-xs font-semibold">
                <span>{t.receipt.title}</span>
                <span className="text-slate-500">{t.receipt.subtitle}</span>
              </div>
            </div>

            {/* Ticket Meta */}
            <div className="grid grid-cols-2 gap-2 py-3 border-b border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">{t.form.complaintNumber}:</span>
                <div className="font-mono font-bold text-sm text-slate-900">
                  {complaint.complaintNumber}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500">{t.form.complaintDate}:</span>
                <div className="font-mono font-semibold text-slate-900">
                  {formatDateDisplay(complaint.complaintDate)}
                </div>
                <div className="text-slate-700 mt-0.5 font-medium">
                  {getStatusLabel(complaint.status, lang)}
                </div>
              </div>
            </div>

            {/* Customer & Device */}
            <div className={`grid ${thermal ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'} py-3 border-b border-slate-200`}>
              <div>
                <div className="text-xs font-bold text-slate-700 mb-1">
                  {t.receipt.receivedFrom}
                </div>
                <div className="font-semibold text-slate-900">{complaint.customerName}</div>
                <div className="font-mono text-xs text-slate-700">{complaint.mobileNumber}</div>
                {complaint.address && (
                  <div className="text-xs text-slate-600 mt-0.5">{complaint.address}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700 mb-1">
                  {t.receipt.deviceDetails}
                </div>
                <div className="font-semibold text-slate-900">{complaint.productName}</div>
                {(complaint.modelNumber || complaint.serialNumber) && (
                  <div className="font-mono text-xs text-slate-600 mt-0.5">
                    {complaint.modelNumber ? `Mod: ${complaint.modelNumber}` : ''}{' '}
                    {complaint.serialNumber ? `| SN: ${complaint.serialNumber}` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Complaint & Repair Summary */}
            <div className="py-3 border-b border-slate-200 space-y-1.5 text-xs">
              <div>
                <span className="font-semibold text-slate-700">{t.receipt.problemReported}: </span>
                <span className="text-slate-800">{complaint.complaintDetails || '-'}</span>
              </div>
              {complaint.initialCondition && (
                <div>
                  <span className="font-semibold text-slate-700">{t.form.initialCondition}: </span>
                  <span className="text-slate-700">{complaint.initialCondition}</span>
                </div>
              )}
              {complaint.problemFound && (
                <div>
                  <span className="font-semibold text-slate-700">{t.detail.problemFound}: </span>
                  <span className="text-slate-800">{complaint.problemFound}</span>
                </div>
              )}
              {complaint.repairWorkDetails && (
                <div>
                  <span className="font-semibold text-slate-700">{t.detail.repairWorkDetails}: </span>
                  <span className="text-slate-800">{complaint.repairWorkDetails}</span>
                </div>
              )}
            </div>

            {/* Spare Parts if any */}
            {complaint.spareParts && complaint.spareParts.length > 0 && (
              <div className="py-3 border-b border-slate-200">
                <div className="text-xs font-bold text-slate-700 mb-1.5">
                  {t.detail.sparePartsUsed}
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {complaint.spareParts.map((sp) => (
                      <tr key={sp.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-1 text-slate-800">
                          {sp.name} <span className="text-slate-500">x{sp.quantity}</span>
                        </td>
                        <td className="py-1 text-right font-mono tabular-nums text-slate-900">
                          {formatCurrency(sp.quantity * sp.unitCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="py-3 border-b border-slate-200 space-y-1 text-xs">
              {complaint.totalRepairCost === 0 && complaint.estimatedCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">{t.receipt.estimated}</span>
                  <span className="font-mono tabular-nums">{formatCurrency(complaint.estimatedCost)}</span>
                </div>
              )}
              {complaint.totalRepairCost > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t.detail.sparePartsCost}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(complaint.sparePartsCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t.detail.labourCharges}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(complaint.labourCharges)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-slate-300">
                <span>{t.receipt.totalAmount}</span>
                <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>{t.receipt.paidAmount}</span>
                <span className="font-mono tabular-nums">{formatCurrency(paid)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900">
                <span>{t.receipt.balanceDue}</span>
                <span className="font-mono tabular-nums">{formatCurrency(due)}</span>
              </div>
            </div>

            {/* Terms & Signatures */}
            {settings.receiptTerms && (
              <div className="py-3 text-[11px] text-slate-600 whitespace-pre-line border-b border-slate-200">
                {settings.receiptTerms}
              </div>
            )}

            <div className="pt-8 pb-2 flex items-end justify-between text-[11px] text-slate-700">
              <div className="border-t border-slate-400 pt-1 px-2">{t.receipt.customerSign}</div>
              <div className="border-t border-slate-400 pt-1 px-2">{t.receipt.authSign}</div>
            </div>
            <p className="text-center text-[11px] text-slate-500 mt-3">{t.receipt.thankYou}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
