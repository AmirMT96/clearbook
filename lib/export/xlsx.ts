import * as XLSX from 'xlsx';
import type { Tx, GB, Cat } from './pdf';

/* NOTE: The open-source `xlsx` (SheetJS community) build does not support
   per-cell styling (fills/fonts/borders) — those are paid pro features.
   We therefore generate clean Euro-formatted XLSX files with proper
   column widths, number formats, and sheet structure. Per-cell colors
   are intentionally omitted; the files open well in Excel / Numbers /
   Google Sheets. */

const EUR_FMT = '#,##0.00 €';

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function check(b: boolean | null | undefined): string {
  return b ? 'Ja' : '';
}

type Column = {
  header: string;
  width?: number;
  numFmt?: string;
};

function buildSheet(columns: Column[], rows: any[][], totalRow?: (string | number)[]): XLSX.WorkSheet {
  const aoa: any[][] = [columns.map((c) => c.header), ...rows];
  if (totalRow) aoa.push(totalRow);
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = columns.map((c) => ({ wch: c.width ?? 14 }));

  const range = XLSX.utils.decode_range(ws['!ref']!);
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const col = columns[C];
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;
      if (col?.numFmt && typeof cell.v === 'number') {
        cell.z = col.numFmt;
        cell.t = 'n';
      }
    }
  }
  return ws;
}

function saveWorkbook(wb: XLSX.WorkBook): Blob {
  const arr = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([arr], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/* ─── PRIVAT ────────────────────────────────────── */

export function exportPrivatXlsx(data: Tx[], cats: Cat[], _periodLabel: string): Blob {
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((s, t) => s + Number(t.amount), 0);

  const cols: Column[] = [
    { header: '#', width: 6 },
    { header: 'Datum', width: 12 },
    { header: 'Beschreibung', width: 32 },
    { header: 'Betrag', width: 14, numFmt: EUR_FMT },
    { header: 'Kategorie', width: 18 },
    { header: 'Notiz', width: 30 },
  ];
  const rows = sorted.map((t, i) => [
    i + 1,
    formatDate(t.date),
    t.description ?? '',
    Number(t.amount),
    t.category_id ? (catMap[t.category_id] ?? '') : '',
    t.note ?? '',
  ]);
  const totalRow: (string | number)[] = ['', '', 'Gesamt', Number(total.toFixed(2)), '', ''];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(cols, rows, totalRow), 'Privat');
  return saveWorkbook(wb);
}

/* ─── UStVA (3 sheets) ──────────────────────────── */

export function exportUstvaXlsx(data: Tx[], _periodLabel: string): Blob {
  const left = data.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT').sort((a, b) => a.date.localeCompare(b.date));
  const right = data.filter((t) => t.type === 'INCOME_EU').sort((a, b) => a.date.localeCompare(b.date));

  const wb = XLSX.utils.book_new();

  const leftCols: Column[] = [
    { header: '#', width: 5 },
    { header: 'Datum', width: 12 },
    { header: 'Position', width: 30 },
    { header: 'Netto', width: 14, numFmt: EUR_FMT },
    { header: 'USt', width: 14, numFmt: EUR_FMT },
    { header: '%', width: 6 },
    { header: 'Brutto', width: 14, numFmt: EUR_FMT },
    { header: 'Beleg', width: 8 },
    { header: 'Notiz', width: 25 },
  ];
  const leftRows = left.map((t, i) => [
    i + 1, formatDate(t.date), t.description ?? '',
    Number(t.net_amount ?? 0), Number(t.vat_amount ?? 0),
    t.vat_rate ?? '', Number(t.amount),
    check(t.beleg_checked), t.note ?? '',
  ]);
  const leftVatSum = left.reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const leftTotal: (string | number)[] = ['', '', 'Vorsteuer gesamt', '', Number(leftVatSum.toFixed(2)), '', '', '', ''];
  XLSX.utils.book_append_sheet(wb, buildSheet(leftCols, leftRows, leftTotal), 'Ausgaben');

  const rightCols: Column[] = [
    { header: '#', width: 5 },
    { header: 'Datum', width: 12 },
    { header: 'RE-Nr', width: 14 },
    { header: 'Netto', width: 14, numFmt: EUR_FMT },
    { header: 'USt', width: 14, numFmt: EUR_FMT },
    { header: 'Brutto', width: 14, numFmt: EUR_FMT },
    { header: 'Erstellt', width: 10 },
    { header: 'Bezahlt', width: 10 },
    { header: 'Notiz', width: 25 },
  ];
  const rightRows = right.map((t, i) => [
    i + 1, formatDate(t.date), t.re_number ?? '',
    Number(t.net_amount ?? 0), Number(t.vat_amount ?? 0), Number(t.amount),
    check(t.erstellt_checked), check(t.bezahlt_checked), t.note ?? '',
  ]);
  const rightVatSum = right.reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const rightTotal: (string | number)[] = ['', '', 'USt Schuld', '', Number(rightVatSum.toFixed(2)), '', '', '', ''];
  XLSX.utils.book_append_sheet(wb, buildSheet(rightCols, rightRows, rightTotal), 'Einnahmen');

  const zahllast = rightVatSum - leftVatSum;
  const summaryCols: Column[] = [
    { header: 'Position', width: 28 },
    { header: 'Betrag', width: 16, numFmt: EUR_FMT },
  ];
  const summaryRows: any[][] = [
    ['USt Schuld (Einnahmen)', Number(rightVatSum.toFixed(2))],
    ['Vorsteuer (Ausgaben)', Number(leftVatSum.toFixed(2))],
    ['Zahllast', Number(zahllast.toFixed(2))],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summaryCols, summaryRows), 'Zusammenfassung');

  return saveWorkbook(wb);
}

/* ─── EUeR (3 sheets) ───────────────────────────── */

export function exportEuerXlsx(data: Tx[], _periodLabel: string): Blob {
  const left = data.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT').sort((a, b) => a.date.localeCompare(b.date));
  const right = data.filter((t) => t.type === 'INCOME_EU').sort((a, b) => a.date.localeCompare(b.date));

  const wb = XLSX.utils.book_new();

  const leftCols: Column[] = [
    { header: '#', width: 5 },
    { header: 'Datum', width: 12 },
    { header: 'Position', width: 30 },
    { header: 'Netto', width: 14, numFmt: EUR_FMT },
    { header: 'USt', width: 14, numFmt: EUR_FMT },
    { header: '%', width: 6 },
    { header: 'Brutto', width: 14, numFmt: EUR_FMT },
    { header: 'Beleg', width: 8 },
    { header: 'Notiz', width: 25 },
  ];
  const leftRows = left.map((t, i) => [
    i + 1, formatDate(t.date), t.description ?? '',
    Number(t.net_amount ?? 0), Number(t.vat_amount ?? 0),
    t.vat_rate ?? '', Number(t.amount),
    check(t.beleg_checked), t.note ?? '',
  ]);
  const ausgabenNetto = left.reduce((s, t) => s + Number(t.net_amount ?? t.amount), 0);
  XLSX.utils.book_append_sheet(wb,
    buildSheet(leftCols, leftRows, ['', '', 'Ausgaben Netto', Number(ausgabenNetto.toFixed(2)), '', '', '', '', '']),
    'Ausgaben',
  );

  const rightCols: Column[] = [
    { header: '#', width: 5 },
    { header: 'Datum', width: 12 },
    { header: 'RE-Nr', width: 14 },
    { header: 'Netto', width: 14, numFmt: EUR_FMT },
    { header: 'USt', width: 14, numFmt: EUR_FMT },
    { header: 'Brutto', width: 14, numFmt: EUR_FMT },
    { header: 'Erstellt', width: 10 },
    { header: 'Bezahlt', width: 10 },
    { header: 'Notiz', width: 25 },
  ];
  const rightRows = right.map((t, i) => [
    i + 1, formatDate(t.date), t.re_number ?? '',
    Number(t.net_amount ?? 0), Number(t.vat_amount ?? 0), Number(t.amount),
    check(t.erstellt_checked), check(t.bezahlt_checked), t.note ?? '',
  ]);
  const einnahmenNetto = right.reduce((s, t) => s + Number(t.net_amount ?? t.amount), 0);
  XLSX.utils.book_append_sheet(wb,
    buildSheet(rightCols, rightRows, ['', '', 'Einnahmen Netto', Number(einnahmenNetto.toFixed(2)), '', '', '', '', '']),
    'Einnahmen',
  );

  const gewinn = einnahmenNetto - ausgabenNetto;
  const summaryCols: Column[] = [
    { header: 'Position', width: 28 },
    { header: 'Betrag', width: 16, numFmt: EUR_FMT },
  ];
  const summaryRows: any[][] = [
    ['Einnahmen Netto', Number(einnahmenNetto.toFixed(2))],
    ['Ausgaben Netto', Number(ausgabenNetto.toFixed(2))],
    ['Gewinn', Number(gewinn.toFixed(2))],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summaryCols, summaryRows), 'Zusammenfassung');

  return saveWorkbook(wb);
}

/* ─── GetBacks ──────────────────────────────────── */

export function exportGetbacksXlsx(data: GB[], _periodLabel: string): Blob {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const ausstehend = sorted.filter((g) => g.status === 'AUSSTEHEND').reduce((s, g) => s + Number(g.amount), 0);
  const erhalten = sorted.filter((g) => g.status === 'ERHALTEN').reduce((s, g) => s + Number(g.amount), 0);

  const cols: Column[] = [
    { header: '#', width: 6 },
    { header: 'Datum', width: 12 },
    { header: 'Beschreibung', width: 28 },
    { header: 'Betrag', width: 14, numFmt: EUR_FMT },
    { header: 'Beleg', width: 8 },
    { header: 'Status', width: 14 },
    { header: 'Notiz', width: 25 },
  ];
  const rows = sorted.map((g, i) => [
    i + 1, formatDate(g.date), g.description ?? '',
    Number(g.amount), check(g.beleg_checked), g.status ?? '', g.note ?? '',
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(cols, rows), 'GetBacks');

  const summaryCols: Column[] = [
    { header: 'Status', width: 18 },
    { header: 'Betrag', width: 16, numFmt: EUR_FMT },
  ];
  const summaryRows: any[][] = [
    ['Ausstehend', Number(ausstehend.toFixed(2))],
    ['Erhalten', Number(erhalten.toFixed(2))],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summaryCols, summaryRows), 'Zusammenfassung');

  return saveWorkbook(wb);
}

/* ─── Einnahmen ─────────────────────────────────── */

export function exportEinnahmenXlsx(data: Tx[], _periodLabel: string): Blob {
  const left = data.filter((t) => t.type === 'INCOME_MAA').sort((a, b) => a.date.localeCompare(b.date));
  const right = data.filter((t) => t.type === 'INCOME_EU').sort((a, b) => a.date.localeCompare(b.date));

  const wb = XLSX.utils.book_new();

  const leftCols: Column[] = [
    { header: '#', width: 5 },
    { header: 'Datum', width: 12 },
    { header: 'Beschreibung', width: 30 },
    { header: 'Netto', width: 14, numFmt: EUR_FMT },
    { header: 'Notiz', width: 25 },
  ];
  const leftRows = left.map((t, i) => [
    i + 1, formatDate(t.date), t.description ?? '',
    Number(t.net_amount ?? t.amount), t.note ?? '',
  ]);
  const gehalt = left.reduce((s, t) => s + Number(t.net_amount ?? t.amount), 0);
  XLSX.utils.book_append_sheet(wb,
    buildSheet(leftCols, leftRows, ['', '', 'Gehalt Gesamt', Number(gehalt.toFixed(2)), '']),
    'Gehalt',
  );

  const rightCols: Column[] = [
    { header: '#', width: 5 },
    { header: 'Datum', width: 12 },
    { header: 'RE-Nr', width: 14 },
    { header: 'Netto', width: 14, numFmt: EUR_FMT },
    { header: 'USt', width: 14, numFmt: EUR_FMT },
    { header: 'Brutto', width: 14, numFmt: EUR_FMT },
    { header: 'Erstellt', width: 10 },
    { header: 'Bezahlt', width: 10 },
    { header: 'Notiz', width: 25 },
  ];
  const rightRows = right.map((t, i) => [
    i + 1, formatDate(t.date), t.re_number ?? '',
    Number(t.net_amount ?? 0), Number(t.vat_amount ?? 0), Number(t.amount),
    check(t.erstellt_checked), check(t.bezahlt_checked), t.note ?? '',
  ]);
  const honorar = right.reduce((s, t) => s + Number(t.amount), 0);
  XLSX.utils.book_append_sheet(wb,
    buildSheet(rightCols, rightRows, ['', '', 'Honorar Brutto', '', '', Number(honorar.toFixed(2)), '', '', '']),
    'Honorar',
  );

  const summaryCols: Column[] = [
    { header: 'Position', width: 22 },
    { header: 'Betrag', width: 16, numFmt: EUR_FMT },
  ];
  const summaryRows: any[][] = [
    ['Gehalt (M&A, Netto)', Number(gehalt.toFixed(2))],
    ['Honorar (EU, Brutto)', Number(honorar.toFixed(2))],
    ['Gesamt', Number((gehalt + honorar).toFixed(2))],
  ];
  XLSX.utils.book_append_sheet(wb, buildSheet(summaryCols, summaryRows), 'Zusammenfassung');

  return saveWorkbook(wb);
}
