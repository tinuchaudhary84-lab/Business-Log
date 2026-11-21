import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  getComplaintPaidAmount,
  getComplaintPendingAmount,
  getComplaintTotalBill,
} from '../db/localDb';
import { BusinessSettings, Complaint, Customer, Language } from '../types';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return CURRENCY_FORMATTER.format(amount || 0);
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function openWhatsAppChat(
  complaint: Complaint,
  settings: BusinessSettings,
  lang: Language,
  mode: 'status' | 'reminder' = 'status'
) {
  const phone = normalizePhoneForWhatsApp(complaint.mobileNumber);
  if (!phone) return;
  const total = getComplaintTotalBill(complaint);
  const paid = getComplaintPaidAmount(complaint);
  const due = getComplaintPendingAmount(complaint);

  let text = '';
  if (mode === 'reminder') {
    text =
      lang === 'gu'
        ? `નમસ્તે ${complaint.customerName},\n${settings.shopName} તરફથી યાદ અપાવવાનું કે તમારી ફરિયાદ નં. ${complaint.complaintNumber} (${complaint.productName}) નું બાકી પેમેન્ટ ₹${due} છે.\nકુલ રકમ: ₹${total} | જમા: ₹${paid} | બાકી: ₹${due}.\nઆભાર.`
        : `Hello ${complaint.customerName},\nGentle reminder from ${settings.shopName} regarding Complaint ${complaint.complaintNumber} (${complaint.productName}).\nTotal: Rs.${total} | Paid: Rs.${paid} | Balance Due: Rs.${due}.\nThank you!`;
  } else {
    text =
      lang === 'gu'
        ? `નમસ્તે ${complaint.customerName},\n${settings.shopName}\nફરિયાદ નં: ${complaint.complaintNumber}\nપ્રોડક્ટ: ${complaint.productName}\nસ્થિતિ: ${complaint.status}\nકુલ રકમ: ₹${total} | જમા: ₹${paid} | બાકી: ₹${due}\nસંપર્ક: ${settings.shopPhone}`
        : `Hello ${complaint.customerName},\nUpdate from ${settings.shopName}:\nComplaint No: ${complaint.complaintNumber}\nProduct: ${complaint.productName}\nStatus: ${complaint.status}\nTotal: Rs.${total} | Paid: Rs.${paid} | Balance Due: Rs.${due}\nContact: ${settings.shopPhone}`;
  }

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function exportToExcelWorkbook(
  complaints: Complaint[],
  customers: Customer[],
  shopName: string
) {
  const complaintRows = complaints.map((c) => {
    const total = getComplaintTotalBill(c);
    const paid = getComplaintPaidAmount(c);
    const pending = getComplaintPendingAmount(c);
    return {
      'Complaint No': c.complaintNumber,
      'Complaint Date': c.complaintDate,
      'Customer Name': c.customerName,
      'Mobile Number': c.mobileNumber,
      Address: c.address,
      'Product / Machine': c.productName,
      'Model No': c.modelNumber,
      'Serial No': c.serialNumber,
      'Complaint Details': c.complaintDetails,
      'Received Accessories': c.receivedAccessories,
      'Initial Condition': c.initialCondition,
      'Problem Found': c.problemFound,
      'Repair Work Details': c.repairWorkDetails,
      'Spare Parts': (c.spareParts || []).map((p) => `${p.name} (${p.quantity}x${p.unitCost})`).join('; '),
      'Parts Cost (INR)': c.sparePartsCost,
      'Labour Charges (INR)': c.labourCharges,
      'Total Bill (INR)': total,
      'Paid Amount (INR)': paid,
      'Pending Amount (INR)': pending,
      Technician: c.technicianName,
      Status: c.status,
      'Delivery Date': c.deliveryDate || '-',
    };
  });

  const customerRows = customers.map((cust) => {
    const custComplaints = complaints.filter(
      (c) => c.customerId === cust.id || c.mobileNumber === cust.mobileNumber
    );
    const pendingTotal = custComplaints.reduce((s, c) => s + getComplaintPendingAmount(c), 0);
    return {
      Name: cust.name,
      'Mobile Number': cust.mobileNumber,
      Address: cust.address,
      'Total Complaints': custComplaints.length,
      'Pending Balance (INR)': pendingTotal,
      Notes: cust.notes || '',
    };
  });

  const paymentRows = complaints.flatMap((c) =>
    (c.payments || []).map((p) => ({
      'Complaint No': c.complaintNumber,
      'Customer Name': c.customerName,
      'Mobile Number': c.mobileNumber,
      'Payment Date': p.date,
      'Amount (INR)': p.amount,
      Method: p.method,
      Note: p.note || '',
    }))
  );

  const wb = XLSX.utils.book_new();
  const wsComplaints = XLSX.utils.json_to_sheet(complaintRows);
  const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
  const wsPayments = XLSX.utils.json_to_sheet(paymentRows);

  XLSX.utils.book_append_sheet(wb, wsComplaints, 'Complaints');
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');

  const safeName = (shopName || 'RepairLog').replace(/[^a-zA-Z0-9]/g, '_');
  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${safeName}_Report_${today}.xlsx`);
}

function asciiSafe(text: string): string {
  if (!text) return '-';
  // Built-in jsPDF Helvetica supports Latin-1; keep ASCII/Latin readable
  return text.replace(/[^\x20-\x7E\n]/g, '').trim() || text;
}

export async function generateAndShareComplaintPDF(
  complaint: Complaint,
  settings: BusinessSettings
): Promise<'shared' | 'downloaded'> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const total = getComplaintTotalBill(complaint);
  const paid = getComplaintPaidAmount(complaint);
  const pending = getComplaintPendingAmount(complaint);

  let y = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(asciiSafe(settings.shopName || 'Smart Complaint & Repairing Manager'), 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${asciiSafe(settings.shopAddress)}  |  Ph: ${asciiSafe(settings.shopPhone)}`, 14, y);
  y += 5;

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.7);
  doc.line(14, y, 196, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('COMPLAINT & REPAIRING JOB RECEIPT', 14, y);
  doc.setFont('courier', 'bold');
  doc.text(complaint.complaintNumber, 196, y, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date: ${formatDateDisplay(complaint.complaintDate)}`, 14, y);
  doc.text(`Status: ${complaint.status}`, 196, y, { align: 'right' });
  y += 8;

  // Customer & Product Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(14, y, 182, 34);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Details:', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${asciiSafe(complaint.customerName)}`, 18, y + 12);
  doc.text(`Mobile: ${asciiSafe(complaint.mobileNumber)}`, 18, y + 18);
  doc.text(`Address: ${asciiSafe(complaint.address).slice(0, 42)}`, 18, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.text('Product / Machine:', 108, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Item: ${asciiSafe(complaint.productName)}`, 108, y + 12);
  doc.text(`Model: ${asciiSafe(complaint.modelNumber || '-')}`, 108, y + 18);
  doc.text(`Serial: ${asciiSafe(complaint.serialNumber || '-')}`, 108, y + 24);
  doc.text(`Technician: ${asciiSafe(complaint.technicianName || '-')}`, 108, y + 30);
  y += 42;

  const addSection = (title: string, body: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(asciiSafe(body || '-'), 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.8 + 4;
  };

  addSection('Complaint Details & Initial Condition:', `${complaint.complaintDetails || '-'}\nCondition: ${complaint.initialCondition || '-'}`);
  if (complaint.problemFound || complaint.repairWorkDetails) {
    addSection('Diagnosis & Repairing Work:', `Fault: ${complaint.problemFound || '-'}\nWork Done: ${complaint.repairWorkDetails || '-'}`);
  }

  if (complaint.spareParts && complaint.spareParts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Spare Parts Used:', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const part of complaint.spareParts) {
      doc.text(`- ${asciiSafe(part.name)} (${part.quantity} x Rs.${part.unitCost})`, 16, y);
      doc.text(`Rs.${part.quantity * part.unitCost}`, 194, y, { align: 'right' });
      y += 5;
    }
    y += 3;
  }

  // Cost Summary
  doc.setDrawColor(15, 23, 42);
  doc.rect(14, y, 182, 26);
  doc.setFont('helvetica', 'normal');
  doc.text(`Estimated Cost: Rs.${complaint.estimatedCost || 0}`, 18, y + 7);
  doc.text(`Parts: Rs.${complaint.sparePartsCost || 0}  |  Labour: Rs.${complaint.labourCharges || 0}`, 18, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Bill: Rs.${total}`, 192, y + 7, { align: 'right' });
  doc.text(`Paid Amount: Rs.${paid}`, 192, y + 13, { align: 'right' });
  doc.setFontSize(11);
  doc.text(`Balance Due: Rs.${pending}`, 192, y + 21, { align: 'right' });
  y += 34;

  if (settings.receiptTerms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Terms & Conditions:', 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    const termLines = doc.splitTextToSize(asciiSafe(settings.receiptTerms), 182);
    doc.text(termLines, 14, y);
    y += termLines.length * 4.2 + 10;
  }

  doc.setFontSize(9.5);
  doc.text('Customer Signature: ___________________', 14, Math.min(275, y + 8));
  doc.text('Authorized Signature: ___________________', 196, Math.min(275, y + 8), { align: 'right' });

  const fileName = `${complaint.complaintNumber}.pdf`;
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${complaint.complaintNumber} - ${settings.shopName}`,
        text: `Complaint Receipt ${complaint.complaintNumber} for ${complaint.productName}`,
        files: [file],
      });
      return 'shared';
    } catch {
      // Fall back to direct download if user cancels share sheet or share fails
    }
  }

  doc.save(fileName);
  return 'downloaded';
}
