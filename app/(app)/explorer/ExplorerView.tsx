'use client';
import { useMemo, useState } from 'react';
import { fmtEUR, fmtDate, cn } from '@/lib/utils';
import { TransactionEditor, type TxForEdit } from '@/components/TransactionEditor';

type Tx = {
  id: string; date: string; description: string; amount: number;
  type: string | null; vat_rate: number | null; vat_amount: number | null;
  net_amount: number | null; status: string; category_id: string | null;
  is_auto_booked: boolean; trip_id: string | null;
};
type Cat = { id: string; name: string; emoji: string | null; type: 'PRIVAT' | 'EU' };

type Scope = 'ALL' | 'PRIVAT' | 'EU' | 'PRIVAT_WITH_EU';

export function ExplorerView({ transactions, categories }: { transactions: Tx[]; categories: Cat[] }) {
  const [scope, setScope] = useState<Scope>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [catFilter, setCatFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [editing, setEditing] = useState<TxForEdit | null>(null);

  const months = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (scope === 'PRIVAT' && !(t.type === 'PRIVAT' || t.type === 'REFUND_MAA')) return false;
      if (scope === 'EU' && !(t.type?.startsWith('EU_') || t.type === 'INCOME_EU')) return false;
      if (scope === 'PRIVAT_WITH_EU' && t.type?.startsWith('INCOME_')) return false;
      if (monthFilter && !t.date.startsWith(monthFilter)) return false;
      if (catFilter && t.category_id !== catFilter) return false;
      if (typeFilter && t.type !== typeFilter) return false;
      return true;
    });
  }, [transactions, scope, monthFilter, catFilter, typeFilter]);

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div>
      {/* Scope tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {([
          ['ALL', 'Alles'],
          ['PRIVAT', 'Privat'],
          ['EU', 'EU'],
          ['PRIVAT_WITH_EU', 'Privat inkl. EU'],
        ] as [Scope, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setScope(v)}
            className={cn('pill', scope === v ? 'bg-primary-900 text-white' : 'bg-surface border border-border')}>
            {l}
          </button>
        ))}
      </div>

      {/* Dropdown filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="input !py-2 !w-auto text-sm">
          <option value="">Alle Monate</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input !py-2 !w-auto text-sm">
          <option value="">Alle Kategorien</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji ?? ''} {c.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input !py-2 !w-auto text-sm">
          <option value="">Alle Typen</option>
          <option value="PRIVAT">Privat</option>
          <option value="EU_VST">EU + VSt</option>
          <option value="EU_NOVAT">EU o. VSt</option>
          <option value="INCOME_MAA">Einnahme M&A</option>
          <option value="INCOME_EU">Einnahme EU</option>
          <option value="REFUND_MAA">M&A ausgelegt</option>
        </select>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Summary label="Anzahl" value={`${filtered.length}`} />
        <Summary label="Summe brutto" value={fmtEUR(filtered.reduce((s, t) => s + Number(t.amount), 0))} />
        <Summary label="Summe USt" value={fmtEUR(filtered.reduce((s, t) => s + Number(t.vat_amount ?? 0), 0))} />
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted uppercase">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3">Datum</th>
              <th className="text-left px-4 py-3">Beschreibung</th>
              <th className="text-right px-4 py-3">Betrag</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Typ</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Kategorie</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">USt</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted py-10">Keine Transaktionen.</td></tr>
            )}
            {filtered.map((t) => {
              const cat = t.category_id ? catMap[t.category_id] : null;
              return (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-bg cursor-pointer" onClick={() => setEditing(t as TxForEdit)}>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{t.description}</span>
                      {t.is_auto_booked && <span className="pill bg-accent-50 text-accent-600 !text-[10px]">Auto</span>}
                      {t.trip_id && <span className="pill bg-primary-50 !text-[10px]">Trip</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{fmtEUR(Number(t.amount))}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">{typeLabel(t.type)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">{cat ? `${cat.emoji ?? ''} ${cat.name}` : '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-right text-xs">
                    {t.vat_rate ? `${t.vat_rate}% · ${fmtEUR(Number(t.vat_amount ?? 0))}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('pill !text-[10px]',
                      t.status === 'gebucht' ? 'bg-accent-50 text-accent-600' :
                      t.status === 'vorgeschlagen' ? 'bg-primary-50' : 'bg-yellow-100 text-yellow-800')}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(t as TxForEdit); }}
                      className="text-muted hover:text-primary-900 p-1"
                      aria-label="Bearbeiten"
                    >✏️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <TransactionEditor
          tx={editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="card !p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function typeLabel(t: string | null) {
  switch (t) {
    case 'PRIVAT': return 'Privat';
    case 'EU_VST': return 'EU + VSt';
    case 'EU_NOVAT': return 'EU o. VSt';
    case 'INCOME_MAA': return 'Einnahme M&A';
    case 'INCOME_EU': return 'Einnahme EU';
    case 'REFUND_MAA': return 'M&A ausgelegt';
    default: return '—';
  }
}
