import jsPDF from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';

/* ─── Types ─────────────────────────────────────── */

export type Tx = {
  id: string; date: string; description: string; amount: number;
  type: string | null; vat_rate: number | null; vat_amount: number | null;
  net_amount: number | null; re_number: string | null;
  beleg_checked: boolean; erstellt_checked: boolean; bezahlt_checked: boolean;
  note: string | null; category_id: string | null; status: string;
};
export type GB = {
  id: string; date: string; description: string; amount: number;
  beleg_checked: boolean; status: string; note: string | null;
};
export type Cat = { id: string; name: string };

/* ─── Design constants ──────────────────────────── */

const NAVY = '#001E40';
const MINT = '#4ECBA0';
const WHITE = '#FFFFFF';
const ALT_ROW = '#F8F9FA';
const LINE = '#CCCCCC';
const TEXT = '#1f2937';

const HEAD_STYLES = {
  fillColor: NAVY,
  textColor: WHITE,
  fontStyle: 'bold' as const,
  fontSize: 9,
};

const BODY_STYLES = {
  fontSize: 9,
  textColor: TEXT,
  lineColor: LINE,
  lineWidth: 0.1,
};

const ALT_STYLES = { fillColor: ALT_ROW };

const FOOT_STYLES = {
  fillColor: MINT,
  textColor: WHITE,
  fontStyle: 'bold' as const,
  fontSize: 9,
};

/* ─── Helpers ───────────────────────────────────── */

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function check(b: boolean | null | undefined): string {
  return b ? 'X' : '';
}

function euros(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
}

function drawHeader(doc: jsPDF, title: string, periodLabel: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(NAVY);
  doc.text('Clearbook', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#6b7280');
  const dateText = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(dateText, pw - 14, 15, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(TEXT);
  doc.text(`${title} — ${periodLabel}`, 14, 24);
}

function drawFooter(doc: jsPDF) {
  const totalPages = (doc as any).internal.getNumberOfPages?.() ?? 1;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#9ca3af');
    doc.text(`${i} / ${totalPages}`, pw - 14, ph - 8, { align: 'right' });
  }
}

function baseTableOptions(startY: number): Partial<UserOptions> {
  return {
    startY,
    theme: 'plain',
    headStyles: HEAD_STYLES,
    bodyStyles: BODY_STYLES,
    alternateRowStyles: ALT_STYLES,
    footStyles: FOOT_STYLES,
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 2.5, font: 'helvetica' },
  };
}

/* ─── PRIVAT ────────────────────────────────────── */

export function exportPrivatPdf(data: Tx[], cats: Cat[], periodLabel: string): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawHeader(doc, 'Privat', periodLabel);

  const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  const body = sorted.map((t, i) => [
    String(i + 1),
    formatDate(t.date),
    t.description ?? '',
    euros(t.amount),
    t.category_id ? (catMap[t.category_id] ?? '') : '',
    t.note ?? '',
  ]);
  const total = sorted.reduce((s, t) => s + Number(t.amount), 0);

  autoTable(doc, {
    ...baseTableOptions(30),
    head: [['#', 'Datum', 'Beschreibung', 'Betrag', 'Kategorie', 'Notiz']],
    body,
    foot: [['', '', 'Gesamt', euros(total), '', '']],
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      3: { halign: 'right' },
    },
  });

  drawFooter(doc);
  return doc.output('blob');
}

/* ─── UStVA ─────────────────────────────────────── */

export function exportUstvaPdf(data: Tx[], periodLabel: string): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawHeader(doc, 'UStVA', periodLabel);

  const left = data.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT').sort((a, b) => a.date.localeCompare(b.date));
  const right = data.filter((t) => t.type === 'INCOME_EU').sort((a, b) => a.date.localeCompare(b.date));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text('Eingangsrechnungen (Ausgaben)', 14, 32);

  autoTable(doc, {
    ...baseTableOptions(36),
    head: [['#', 'Datum', 'Position', 'Netto', 'USt', '%', 'Brutto', 'Beleg', 'Notiz']],
    body: left.map((t, i) => [
      String(i + 1), formatDate(t.date), t.description ?? '',
      euros(t.net_amount), euros(t.vat_amount),
      t.vat_rate != null ? `${t.vat_rate}%` : '',
      euros(t.amount), check(t.beleg_checked), t.note ?? '',
    ]),
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20 },
      3: { halign: 'right' }, 4: { halign: 'right' },
      5: { halign: 'center', cellWidth: 10 }, 6: { halign: 'right' },
      7: { halign: 'center', cellWidth: 12 },
    },
  });

  const y2 = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text('Ausgangsrechnungen (Einnahmen)', 14, y2);

  autoTable(doc, {
    ...baseTableOptions(y2 + 4),
    head: [['#', 'Datum', 'RE-Nr', 'Netto', 'USt', 'Brutto', 'Erstellt', 'Bezahlt', 'Notiz']],
    body: right.map((t, i) => [
      String(i + 1), formatDate(t.date), t.re_number ?? '',
      euros(t.net_amount), euros(t.vat_amount), euros(t.amount),
      check(t.erstellt_checked), check(t.bezahlt_checked), t.note ?? '',
    ]),
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20 },
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
      6: { halign: 'center', cellWidth: 14 }, 7: { halign: 'center', cellWidth: 14 },
    },
  });

  const leftVatSum = left.reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const rightVatSum = right.reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const zahllast = rightVatSum - leftVatSum;

  const y3 = (doc as any).lastAutoTable.finalY + 6;
  autoTable(doc, {
    ...baseTableOptions(y3),
    body: [[{
      content: `USt Schuld: ${euros(rightVatSum)}  −  Vorsteuer: ${euros(leftVatSum)}  =  Zahllast: ${euros(zahllast)}`,
      colSpan: 9, styles: FOOT_STYLES as any,
    }]],
  });

  drawFooter(doc);
  return doc.output('blob');
}

/* ─── EUeR ──────────────────────────────────────── */

export function exportEuerPdf(data: Tx[], periodLabel: string): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawHeader(doc, 'EUeR', periodLabel);

  const left = data.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT').sort((a, b) => a.date.localeCompare(b.date));
  const right = data.filter((t) => t.type === 'INCOME_EU').sort((a, b) => a.date.localeCompare(b.date));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text('Eingangsrechnungen (Ausgaben)', 14, 32);

  autoTable(doc, {
    ...baseTableOptions(36),
    head: [['#', 'Datum', 'Position', 'Netto', 'USt', '%', 'Brutto', 'Beleg', 'Notiz']],
    body: left.map((t, i) => [
      String(i + 1), formatDate(t.date), t.description ?? '',
      euros(t.net_amount), euros(t.vat_amount),
      t.vat_rate != null ? `${t.vat_rate}%` : '',
      euros(t.amount), check(t.beleg_checked), t.note ?? '',
    ]),
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20 },
      3: { halign: 'right' }, 4: { halign: 'right' },
      5: { halign: 'center', cellWidth: 10 }, 6: { halign: 'right' },
      7: { halign: 'center', cellWidth: 12 },
    },
  });

  const y2 = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text('Ausgangsrechnungen (Einnahmen)', 14, y2);

  autoTable(doc, {
    ...baseTableOptions(y2 + 4),
    head: [['#', 'Datum', 'RE-Nr', 'Netto', 'USt', 'Brutto', 'Erstellt', 'Bezahlt', 'Notiz']],
    body: right.map((t, i) => [
      String(i + 1), formatDate(t.date), t.re_number ?? '',
      euros(t.net_amount), euros(t.vat_amount), euros(t.amount),
      check(t.erstellt_checked), check(t.bezahlt_checked), t.note ?? '',
    ]),
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20 },
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
      6: { halign: 'center', cellWidth: 14 }, 7: { halign: 'center', cellWidth: 14 },
    },
  });

  const ausgabenNetto = left.reduce((s, t) => s + Number(t.net_amount ?? t.amount), 0);
  const einnahmenNetto = right.reduce((s, t) => s + Number(t.net_amount ?? t.amount), 0);
  const gewinn = einnahmenNetto - ausgabenNetto;

  const y3 = (doc as any).lastAutoTable.finalY + 6;
  autoTable(doc, {
    ...baseTableOptions(y3),
    body: [[{
      content: `Einnahmen Netto: ${euros(einnahmenNetto)}  −  Ausgaben Netto: ${euros(ausgabenNetto)}  =  Gewinn: ${euros(gewinn)}`,
      colSpan: 9, styles: FOOT_STYLES as any,
    }]],
  });

  drawFooter(doc);
  return doc.output('blob');
}

/* ─── GetBacks ──────────────────────────────────── */

export function exportGetbacksPdf(data: GB[], periodLabel: string): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawHeader(doc, 'GetBacks', periodLabel);

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const ausstehend = sorted.filter((g) => g.status === 'AUSSTEHEND').reduce((s, g) => s + Number(g.amount), 0);
  const erhalten = sorted.filter((g) => g.status === 'ERHALTEN').reduce((s, g) => s + Number(g.amount), 0);

  autoTable(doc, {
    ...baseTableOptions(30),
    head: [['#', 'Datum', 'Beschreibung', 'Betrag', 'Beleg', 'Status', 'Notiz']],
    body: sorted.map((g, i) => [
      String(i + 1), formatDate(g.date), g.description ?? '',
      euros(g.amount), check(g.beleg_checked), g.status ?? '', g.note ?? '',
    ]),
    foot: [[{
      content: `Ausstehend: ${euros(ausstehend)}   Erhalten: ${euros(erhalten)}`,
      colSpan: 7, styles: FOOT_STYLES as any,
    }]],
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      3: { halign: 'right' },
      4: { halign: 'center', cellWidth: 14 },
    },
  });

  drawFooter(doc);
  return doc.output('blob');
}

/* ─── Einnahmen ─────────────────────────────────── */

export function exportEinnahmenPdf(data: Tx[], periodLabel: string): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawHeader(doc, 'Einnahmen', periodLabel);

  const left = data.filter((t) => t.type === 'INCOME_MAA').sort((a, b) => a.date.localeCompare(b.date));
  const right = data.filter((t) => t.type === 'INCOME_EU').sort((a, b) => a.date.localeCompare(b.date));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text('M&A Expert (Gehalt)', 14, 32);

  autoTable(doc, {
    ...baseTableOptions(36),
    head: [['#', 'Datum', 'Beschreibung', 'Netto', 'Notiz']],
    body: left.map((t, i) => [
      String(i + 1), formatDate(t.date), t.description ?? '',
      euros(t.net_amount ?? t.amount), t.note ?? '',
    ]),
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      3: { halign: 'right' },
    },
  });

  const y2 = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text('Einzelunternehmen (Honorare)', 14, y2);

  autoTable(doc, {
    ...baseTableOptions(y2 + 4),
    head: [['#', 'Datum', 'RE-Nr', 'Netto', 'USt', 'Brutto', 'Erstellt', 'Bezahlt', 'Notiz']],
    body: right.map((t, i) => [
      String(i + 1), formatDate(t.date), t.re_number ?? '',
      euros(t.net_amount), euros(t.vat_amount), euros(t.amount),
      check(t.erstellt_checked), check(t.bezahlt_checked), t.note ?? '',
    ]),
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20 },
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
      6: { halign: 'center', cellWidth: 14 }, 7: { halign: 'center', cellWidth: 14 },
    },
  });

  const gehalt = left.reduce((s, t) => s + Number(t.net_amount ?? t.amount), 0);
  const honorar = right.reduce((s, t) => s + Number(t.amount), 0);

  const y3 = (doc as any).lastAutoTable.finalY + 6;
  autoTable(doc, {
    ...baseTableOptions(y3),
    body: [[{
      content: `Gehalt: ${euros(gehalt)}  +  Honorar: ${euros(honorar)}  =  Gesamt: ${euros(gehalt + honorar)}`,
      colSpan: 9, styles: FOOT_STYLES as any,
    }]],
  });

  drawFooter(doc);
  return doc.output('blob');
}
