'use client';
import { useMemo, useState } from 'react';
import { fmtEUR, cn } from '@/lib/utils';
import { DashboardCharts } from './charts';

type Tx = {
  id: string; amount: number; type: string | null; vat_rate: number | null;
  vat_amount: number | null; net_amount: number | null; status: string;
  date: string; description: string; category_id: string | null;
};
type GB = { id: string; amount: number; status: string; date: string };
type Cat = { id: string; name: string; type: string };

type Scope = 'ALL' | 'PRIVAT' | 'USTVA' | 'EUER' | 'GETBACKS' | 'EINNAHMEN';
type Period = 'month' | 'quarter' | 'year';

export function DashboardFilters({ transactions, getbacks, categories }: {
  transactions: Tx[]; getbacks: GB[]; categories: Cat[];
}) {
  const [scope, setScope] = useState<Scope>('ALL');
  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0); // 0 = current, -1 = previous, etc.

  const { start, end, label } = useMemo(() => {
    const now = new Date();
    if (period === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {
        start: iso(d), end: iso(e),
        label: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      };
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3) + offset;
      const qStart = new Date(now.getFullYear(), q * 3, 1);
      const qEnd = new Date(now.getFullYear(), q * 3 + 3, 0);
      return {
        start: iso(qStart), end: iso(qEnd),
        label: `Q${Math.floor(qStart.getMonth() / 3) + 1} ${qStart.getFullYear()}`,
      };
    } else {
      const y = now.getFullYear() + offset;
      return {
        start: `${y}-01-01`, end: `${y}-12-31`,
        label: `${y}`,
      };
    }
  }, [period, offset]);

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => {
      if (t.date < start || t.date > end) return false;
      if (scope === 'PRIVAT') return t.type === 'PRIVAT';
      if (scope === 'USTVA') return t.type === 'EU_VST' || t.type === 'INCOME_EU';
      if (scope === 'EUER') return t.type === 'EU_VST' || t.type === 'EU_NOVAT' || t.type === 'INCOME_EU';
      if (scope === 'EINNAHMEN') return t.type?.startsWith('INCOME_');
      if (scope === 'GETBACKS') return false; // separate table
      return true;
    });
  }, [transactions, scope, start, end]);

  const filteredGB = useMemo(() => {
    return getbacks.filter((g) => g.date >= start && g.date <= end);
  }, [getbacks, start, end]);

  // KPIs
  const einnahmen = filteredTx.filter((t) => t.type?.startsWith('INCOME_')).reduce((s, t) => s + Number(t.amount), 0);
  const privatAusgaben = filteredTx.filter((t) => t.type === 'PRIVAT').reduce((s, t) => s + Number(t.amount), 0);
  const euerAusgaben = filteredTx.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT').reduce((s, t) => s + Number(t.net_amount ?? t.amount), 0);
  const euerEinnahmen = filteredTx.filter((t) => t.type === 'INCOME_EU').reduce((s, t) => s + Number(t.net_amount ?? t.amount), 0);
  const ustSchuld = filteredTx.filter((t) => t.type === 'INCOME_EU').reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const vorsteuer = filteredTx.filter((t) => t.type === 'EU_VST').reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const zahllast = ustSchuld - vorsteuer;
  const gewinn = euerEinnahmen - euerAusgaben;
  const gbOffen = filteredGB.filter((g) => g.status === 'AUSSTEHEND');
  const gbSum = gbOffen.reduce((s, g) => s + Number(g.amount), 0);
  const saldo = einnahmen - privatAusgaben - euerAusgaben - Math.max(zahllast, 0);

  const scopes: { v: Scope; l: string }[] = [
    { v: 'ALL', l: 'Alles' },
    { v: 'PRIVAT', l: 'Privat' },
    { v: 'USTVA', l: 'UStVA' },
    { v: 'EUER', l: 'EUeR' },
    { v: 'GETBACKS', l: 'GetBacks' },
    { v: 'EINNAHMEN', l: 'Einnahmen' },
  ];

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 bg-bg dark:bg-dark-surface rounded-xl p-1">
          {scopes.map((s) => (
            <button key={s.v} onClick={() => setScope(s.v)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition',
                scope === s.v ? 'bg-primary-900 text-white dark:bg-accent dark:text-primary-900' : 'text-muted hover:text-primary-900')}>
              {s.l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-bg dark:bg-dark-surface rounded-xl p-1 ml-auto">
          {(['month', 'quarter', 'year'] as Period[]).map((p) => (
            <button key={p} onClick={() => { setPeriod(p); setOffset(0); }}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition',
                period === p ? 'bg-primary-900 text-white dark:bg-accent dark:text-primary-900' : 'text-muted hover:text-primary-900')}>
              {p === 'month' ? 'Monat' : p === 'quarter' ? 'Quartal' : 'Jahr'}
            </button>
          ))}
        </div>
      </div>

      {/* Period nav */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button onClick={() => setOffset((o) => o - 1)} className="text-muted hover:text-primary-900 dark:hover:text-dark-text p-1">&lt;</button>
        <span className="text-sm font-semibold dark:text-dark-text min-w-[140px] text-center">{label}</span>
        <button onClick={() => setOffset((o) => o + 1)} className="text-muted hover:text-primary-900 dark:hover:text-dark-text p-1" disabled={offset >= 0}>&gt;</button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="Einnahmen" value={fmtEUR(einnahmen)} positive />
        <KPI label="Privat Ausgaben" value={fmtEUR(privatAusgaben)} />
        <KPI label="EUeR Ausgaben" value={fmtEUR(euerAusgaben)} />
        <KPI label="USt Zahllast" value={fmtEUR(zahllast)} warn={zahllast > 0} />
        <KPI label="Gewinn (EUeR)" value={fmtEUR(gewinn)} positive={gewinn > 0} />
        <KPI label="GetBacks offen" value={`${gbOffen.length} / ${fmtEUR(gbSum)}`} warn={gbOffen.length > 0} />
        <KPI label="Saldo" value={fmtEUR(saldo)} positive={saldo > 0} className="md:col-span-2" />
      </div>

      <DashboardCharts transactions={filteredTx} categories={categories} />
    </div>
  );
}

function KPI({ label, value, positive, warn, className }: {
  label: string; value: string; positive?: boolean; warn?: boolean; className?: string;
}) {
  return (
    <div className={cn('card dark:bg-dark-surface', className)}>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('text-lg md:text-xl font-bold mt-1 font-display',
        positive ? 'text-accent-600 dark:text-accent' : warn ? 'text-amber-600' : 'dark:text-dark-text')}>
        {value}
      </p>
    </div>
  );
}

function iso(d: Date) { return d.toISOString().slice(0, 10); }
