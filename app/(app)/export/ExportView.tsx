'use client';
import { useMemo, useState } from 'react';
import { cn, fmtEUR, monthRange } from '@/lib/utils';

type Tx = {
  id: string; date: string; description: string; amount: number;
  type: string | null; vat_rate: number | null; vat_amount: number | null;
  net_amount: number | null; re_number: string | null; beleg_checked: boolean;
  erstellt_checked: boolean; bezahlt_checked: boolean; note: string | null;
  category_id: string | null; status: string;
};
type GB = { id: string; date: string; description: string; amount: number; beleg_checked: boolean; status: string; note: string | null };
type Cat = { id: string; name: string };

type ExportType = 'privat' | 'ustva' | 'euer' | 'getbacks' | 'einnahmen';

const TABLES: { type: ExportType; label: string }[] = [
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

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  function filterByMonth<T extends { date: string }>(arr: T[]): T[] {
    return arr.filter((t) => t.date >= month.start && t.date <= month.end);
  }

  function getDataForType(type: ExportType) {
    const mtx = filterByMonth(transactions);
    switch (type) {
      case 'privat': return mtx.filter((t) => t.type === 'PRIVAT');
      case 'ustva': return mtx.filter((t) => t.type === 'EU_VST' || t.type === 'INCOME_EU');
      case 'euer': return mtx.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT' || t.type === 'INCOME_EU');
      case 'einnahmen': return mtx.filter((t) => t.type?.startsWith('INCOME_'));
      case 'getbacks': return []; // special
    }
  }

  function downloadCSV(type: ExportType) {
    let rows: string[][] = [];
    let header: string[] = [];

    if (type === 'getbacks') {
      header = ['Datum', 'Beschreibung', 'Betrag', 'Beleg', 'Status', 'Notiz'];
      rows = filterByMonth(getbacks).map((g) => [
        g.date, g.description, String(g.amount), g.beleg_checked ? 'Ja' : 'Nein', g.status, g.note ?? '',
      ]);
    } else {
      const data = getDataForType(type) ?? [];
      if (type === 'privat') {
        header = ['Datum', 'Beschreibung', 'Betrag', 'Kategorie', 'Notiz'];
        rows = data.map((t) => [
          t.date, t.description, String(t.amount), t.category_id ? (catMap[t.category_id] ?? '') : '', t.note ?? '',
        ]);
      } else {
        header = ['Datum', 'Beschreibung', 'RE-Nr', 'Netto', 'USt', 'USt%', 'Brutto', 'Typ', 'Notiz'];
        rows = data.map((t) => [
          t.date, t.description, t.re_number ?? '', String(t.net_amount ?? ''),
          String(t.vat_amount ?? ''), String(t.vat_rate ?? ''), String(t.amount), t.type ?? '', t.note ?? '',
        ]);
      }
    }

    const csvContent = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clearbook_${type}_${month.start}_${month.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => setMonthOffset((o) => o - 1)} className="text-muted hover:text-primary-900 dark:hover:text-white p-1">&lt;</button>
        <span className="text-sm font-semibold dark:text-white min-w-[140px] text-center">{month.label}</span>
        <button onClick={() => setMonthOffset((o) => o + 1)} className="text-muted hover:text-primary-900 dark:hover:text-white p-1" disabled={monthOffset >= 0}>&gt;</button>
      </div>

      {/* Export Cards */}
      <div className="grid gap-3">
        {TABLES.map(({ type, label }) => {
          const count = type === 'getbacks'
            ? filterByMonth(getbacks).length
            : (getDataForType(type) ?? []).length;

          return (
            <div key={type} className="card flex items-center justify-between">
              <div>
                <h3 className="font-semibold dark:text-white">{label}</h3>
                <p className="text-xs text-muted">{count} Eintraege in {month.label}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCSV(type)}
                  disabled={count === 0}
                  className="btn-outline text-sm !px-4 !py-2"
                >
                  CSV
                </button>
                <button
                  disabled
                  className="btn-outline text-sm !px-4 !py-2 opacity-40"
                  title="PDF Export kommt bald"
                >
                  PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted mt-6 text-center">PDF Export wird in einem zukuenftigen Update verfuegbar sein.</p>
    </div>
  );
}
