import { jsPDF } from 'jspdf';
import { money } from './format';

const MGMT_EMAIL = 'management@waves.com.ng';

export function generateInvoicePDF(inv) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const pad = 52;
  const right = W - pad;

  // ---------- header band ----------
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, W, 128, 'F');
  doc.setDrawColor(198, 160, 75);
  doc.setLineWidth(1.4);
  doc.line(pad, 112, right, 112);

  doc.setFont('times', 'italic');
  doc.setFontSize(34);
  doc.setTextColor(237, 233, 222);
  doc.text('WAVES', pad, 66);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(198, 160, 75);
  doc.text('E X P L O R E   W O R K S   O F   A R T   I N   W A V S   F O R M', pad, 86);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(237, 233, 222);
  doc.text('INVOICE', right, 64, { align: 'right' });
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text(String(inv.invoiceNumber || ''), right, 84, { align: 'right' });

  // ---------- meta ----------
  let y = 168;
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('INVOICE NUMBER', pad, y);
  doc.text('ISSUE DATE', 240, y);
  doc.text('STATUS', 400, y);
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(String(inv.invoiceNumber || ''), pad, y);
  doc.text(String(inv.date || ''), 240, y);
  doc.setTextColor(184, 69, 42);
  doc.text('PAYMENT DUE', 400, y);

  // ---------- from / to ----------
  y += 42;
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('FROM', pad, y);
  doc.text('BILLED TO', 320, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text('WAVES — Fuhad Adebambo', pad, y);
  doc.text(String(inv.clientName || 'Client'), 320, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  doc.text('Producer / Sound Architect', pad, y);
  doc.text(String(inv.clientEmail || ''), 320, y);
  y += 13;
  doc.text(MGMT_EMAIL, pad, y);

  // ---------- line items ----------
  y += 46;
  doc.setFillColor(10, 10, 11);
  doc.rect(pad, y - 14, W - pad * 2, 26, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(237, 233, 222);
  doc.text('DESCRIPTION', pad + 10, y + 3);
  doc.text('QTY', 380, y + 3);
  doc.text('AMOUNT', right - 10, y + 3, { align: 'right' });

  y += 34;
  doc.setDrawColor(220, 220, 215);
  doc.setLineWidth(0.8);
  doc.line(pad, y + 10, right, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`Beat licence — "${String(inv.beatTitle || '')}"`, pad + 10, y);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(String(inv.license || '') + ' — produced by WAVES', pad + 10, y - 12);
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text('1', 385, y);
  doc.text(money(inv.price), right - 10, y, { align: 'right' });

  // ---------- total ----------
  y += 42;
  doc.setDrawColor(198, 160, 75);
  doc.setLineWidth(1.4);
  doc.line(320, y, right, y);
  y += 22;
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('TOTAL DUE', 320, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(money(inv.price), right, y + 2, { align: 'right' });

  // ---------- payment instructions ----------
  y += 50;
  doc.setFillColor(245, 244, 240);
  doc.rect(pad, y, W - pad * 2, 118, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(184, 69, 42);
  doc.text('PAYMENT INSTRUCTIONS', pad + 14, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);
  const instr =
    'This invoice is a reservation of the licence above. Payment is completed directly with management —\n' +
    `bank transfer and PayPal details are shared on acceptance. Always reference ${inv.invoiceNumber}.\n\n` +
    `Contact management: ${MGMT_EMAIL}. Files (MP3 / WAV / stems) are delivered after payment clears.\n` +
    'Invoices are valid for 14 days from the issue date.';
  doc.text(doc.splitTextToSize(instr, W - pad * 2 - 28), pad + 14, y + 40);

  // ---------- footer ----------
  const H = doc.internal.pageSize.getHeight();
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 145);
  doc.text('WAVES — the producer identity of Fuhad Adebambo · Afrobeats / R&B / Amapiano', pad, H - 44);
  doc.text('Thank you for recording on a WAVES record.', pad, H - 32);

  doc.save(`WAVES-Invoice-${inv.invoiceNumber}.pdf`);
}
