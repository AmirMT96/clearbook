'use client';
import { useMemo, useState } from 'react';
import {
  exportPrivatPdf, exportUstvaPdf, exportEuerPdf,
  exportGetbacksPdf, exportEinnahmenPdf,
  type Tx, type GB, type Cat,
} from '@/lib/export/pdf';
import {
  exportPrivatXlsx, exportUstvaXlsx, exportEuerXlsx,
  exportGetbacksXlsx, exportEinnahmenXlsx,
} from '@/lib/export/xlsx';
import { monthRange } from '@/lib/utils';

type SheetType = 'privat' | 'ustva' | 'euer' | 'getbacks' | 'einnahmen';

const SHEETS: { type: SheetType; label: string }[] = [
  { type: 'privat', label: 'Privat' },
  { type: 'ustva', label: 'UStVA' },
  { type: 'euer', label: 'EUeR' },
  { type: 'getbacks', label: 'GetBacks' },
  { type: 'einnahmen', label: 'Einnahmen' },
];

export function ExportView({ transactions, getbacks, categories }: {
  transactions: Tx[]; getbacks: GB[]; categories: Cat[];
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const month = monthRange(monthOffset);

  const filteredTx = useMemo(
    () => transactions.filter((t) => t.date >= month.start && t.date <= month.end),
    [transactions, month.start, month.end],
  );
  const filteredGB = useMemo(
    () => getbacks.filter((g) => g.date >= month.start && g.date <= month.end),
    [getbacks, month.start, month.end],
  );

  function counts(type: SheetType): number {
    switch (type) {
      case 'privat': return filteredTx.filter((t) => t.type === 'PRIVAT').length;
      case 'ustva': return filteredTx.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT' || t.type === 'INCOME_EU').length;
      case 'euer': return filteredTx.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT' || t.type === 'INCOME_EU').length;
      case 'getbacks': return filteredGB.length;
      case 'einnahmen': return filteredTx.filter((t) => t.type?.startsWith('INCOME_')).length;
    }
  }

  function makeFileName(type: SheetType, ext: 'pdf' | 'xlsx'): string {
    const d = new Date(month.start);
    const monthName = d.toLocaleDateString('de-DE', { month: 'long' });
    const monYear = `${monthName[0].toUpperCase()}${monthName.slice(1)}${d.getFullYear()}`;
    const label = SHEETS.find((s) => s.type === type)!.label;
    return `Clearbook_${label}_${monYear}.${ext}`;
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handlePdf(type: SheetType) {
    let blob: Blob;
    switch (type) {
      case 'privat':
        blob = exportPrivatPdf(filteredTx.filter((t) => t.type === 'PRIVAT'), categories, month.label);
        break;
      case 'ustva':
        blob = exportUstvaPdf(filteredTx, month.label);
        break;
      case 'euer':
        blob = exportEuerPdf(filteredTx, month.label);
        break;
      case 'getbacks':
        blob = exportGetbacksPdf(filteredGB, month.label);
        break;
      case 'einnahmen':
        blob = exportEinnahmenPdf(filteredTx, month.label);
        break;
    }
    triggerDownload(blob, makeFileName(type, 'pdf'));
  }

  function handleXlsx(type: SheetType) {
    let blob: Blob;
    switch (type) {
      case 'privat':
        blob = exportPrivatXlsx(filteredTx.filter((t) => t.type === 'PRIVAT'), categories, month.label);
        break;
      case 'ustva':
        blob = exportUstvaXlsx(filteredTx, month.label);
        break;
      case 'euer':
        blob = exportEuerXlsx(filteredTx, month.label);
        break;
      case 'getbacks':
        blob = exportGetbacksXlsx(filteredGB, month.label);
        break;
      case 'einnahmen':
        blob = exportEinnahmenXlsx(filteredTx, month.label);
        break;
    }
    triggerDownload(blob, makeFileName(type, 'xlsx'));
  }

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => setMonthOffset((o) => o - 1)}
          className="text-muted hover:text-primary-900 dark:hover:text-dark-text p-1"
          aria-label="Vorheriger Monat"
        >&lt;</button>
        <span className="text-sm font-semibold dark:text-dark-text min-w-[160px] text-center">
          {month.label}
        </span>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          className="text-muted hover:text-primary-900 dark:hover:text-dark-text p-1 disabled:opacity-30"
          disabled={monthOffset >= 0}
          aria-label="Naechster Monat"
        >&gt;</button>
      </div>

      {/* Export cards */}
      <div className="grid gap-3">
        {SHEETS.map(({ type, label }) => {
          const n = counts(type);
          return (
            <div key={type} className="card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold dark:text-dark-text">{label}</h3>
                <p className="text-xs text-muted dark:text-dark-muted">
                  {n} Eintraege in {month.label}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handlePdf(type)}
                  disabled={n === 0}
                  className="btn-outline text-sm !px-4 !py-2"
                >
                  PDF
                </button>
                <button
                  onClick={() => handleXlsx(type)}
                  disabled={n === 0}
                  className="btn-primary text-sm !px-4 !py-2"
                >
                  XLSX
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted dark:text-dark-muted mt-6 text-center">
        PDF: Helvetica, Navy Header, Mint Summenzeile. XLSX: Mehrere Sheets bei Split-Tabellen.
      </p>
    </div>
  );
}
