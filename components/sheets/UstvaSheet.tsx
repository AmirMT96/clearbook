'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { monthRange, fmtEUR, calcVat, round } from '@/lib/utils';
import { SheetTable, type ColumnDef } from './SheetTable';

type ExpenseRow = {
  id: string;
  date: string;
  description: string | null;
  net_amount: number;
  vat_amount: number;
  vat_rate: number;
  amount: number;
  beleg_checked: boolean;
  note: string | null;
  status?: string;
  type?: string;
};

type IncomeRow = {
  id: string;
  date: string;
  re_number: string | null;
  net_amount: number;
  vat_amount: number;
  amount: number;
  erstellt_checked: boolean;
  bezahlt_checked: boolean;
  note: string | null;
  status?: string;
};

export function UstvaSheet({ userId }: { userId: string }) {
  const supabase = createClient();
  const [monthOffset, setMonthOffset] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { label } = monthRange(monthOffset);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const r = monthRange(monthOffset);
    const [expRes, incRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, date, description, net_amount, vat_amount, vat_rate, amount, beleg_checked, note, status, type')
        .eq('user_id', userId)
        .in('type', ['EU_VST', 'EU_NOVAT'])
        .gte('date', r.start)
        .lte('date', r.end)
        .order('date'),
      supabase
        .from('transactions')
        .select('id, date, re_number, net_amount, vat_amount, amount, erstellt_checked, bezahlt_checked, note, status')
        .eq('user_id', userId)
        .eq('type', 'INCOME_EU')
        .gte('date', r.start)
        .lte('date', r.end)
        .order('date'),
    ]);
    setExpenses(expRes.data ?? []);
    setIncome(incRes.data ?? []);
    setLoading(false);
  }, [monthOffset, userId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Expense columns ─────────────── */
  const expColumns: ColumnDef<ExpenseRow>[] = [
    { key: 'date', header: 'Datum', type: 'date', width: 'w-24' },
    { key: 'description', header: 'Position', type: 'text', width: 'min-w-[140px]' },
    { key: 'net_amount', header: 'Netto', type: 'currency', width: 'w-24' },
    { key: 'vat_amount', header: 'USt', type: 'currency', width: 'w-20' },
    {
      key: 'vat_rate',
      header: '%',
      type: 'select',
      width: 'w-16',
      options: [
        { value: '0', label: '0%' },
        { value: '7', label: '7%' },
        { value: '19', label: '19%' },
      ],
      formatDisplay: (row) => `${row.vat_rate ?? 0}%`,
    },
    {
      key: 'amount',
      header: 'Brutto',
      type: 'computed',
      editable: false,
      width: 'w-24',
      formatDisplay: (row) => fmtEUR(row.amount),
    },
    { key: 'beleg_checked', header: 'Beleg', type: 'checkbox', width: 'w-14' },
    { key: 'note', header: 'Notiz', type: 'text', width: 'min-w-[100px]' },
  ];

  /* ── Income columns ──────────────── */
  const incColumns: ColumnDef<IncomeRow>[] = [
    { key: 'date', header: 'Datum', type: 'date', width: 'w-24' },
    { key: 're_number', header: 'RE-Nr.', type: 'text', width: 'w-24' },
    { key: 'net_amount', header: 'Netto', type: 'currency', width: 'w-24' },
    { key: 'vat_amount', header: 'USt', type: 'currency', width: 'w-20' },
    {
      key: 'amount',
      header: 'Brutto',
      type: 'computed',
      editable: false,
      width: 'w-24',
      formatDisplay: (row) => fmtEUR(row.amount),
    },
    { key: 'erstellt_checked', header: 'Erstellt', type: 'checkbox', width: 'w-16' },
    { key: 'bezahlt_checked', header: 'Bezahlt', type: 'checkbox', width: 'w-16' },
    { key: 'note', header: 'Notiz', type: 'text', width: 'min-w-[100px]' },
  ];

  /* ── Handlers ────────────────────── */
  const handleExpenseUpdate = async (id: string, field: string, value: string | number | boolean) => {
    const update: Record<string, any> = { [field]: value };

    // Recalc VAT when net or rate changes
    if (field === 'net_amount' || field === 'vat_rate') {
      const row = expenses.find((r) => r.id === id);
      if (row) {
        const net = field === 'net_amount' ? Number(value) : row.net_amount;
        const rate = field === 'vat_rate' ? Number(value) : row.vat_rate;
        const vat = round(net * (rate / 100));
        update.net_amount = net;
        update.vat_rate = rate;
        update.vat_amount = vat;
        update.amount = round(net + vat);
      }
    }

    await supabase.from('transactions').update(update).eq('id', id);
    setExpenses((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  };

  const handleIncomeUpdate = async (id: string, field: string, value: string | number | boolean) => {
    const update: Record<string, any> = { [field]: value };

    if (field === 'net_amount') {
      const row = income.find((r) => r.id === id);
      if (row) {
        const net = Number(value);
        const vat = round(net * 0.19);
        update.net_amount = net;
        update.vat_amount = vat;
        update.amount = round(net + vat);
      }
    }

    await supabase.from('transactions').update(update).eq('id', id);
    setIncome((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  };

  const handleExpenseDelete = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setExpenses((prev) => prev.filter((r) => r.id !== id));
  };

  const handleIncomeDelete = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setIncome((prev) => prev.filter((r) => r.id !== id));
  };

  const handleExpenseAdd = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: row } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        date: today,
        amount: 0,
        type: 'EU_VST',
        vat_rate: 19,
        vat_amount: 0,
        net_amount: 0,
        status: 'ungefasst',
      })
      .select('id, date, description, net_amount, vat_amount, vat_rate, amount, beleg_checked, note, status, type')
      .single();
    if (row) setExpenses((prev) => [...prev, row]);
  };

  const handleIncomeAdd = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: row } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        date: today,
        amount: 0,
        type: 'INCOME_EU',
        vat_rate: 19,
        vat_amount: 0,
        net_amount: 0,
        status: 'ungefasst',
      })
      .select('id, date, re_number, net_amount, vat_amount, amount, erstellt_checked, bezahlt_checked, note, status')
      .single();
    if (row) setIncome((prev) => [...prev, row]);
  };

  /* ── Summary ─────────────────────── */
  const totalVorsteuer = expenses.reduce((s, r) => s + (r.vat_amount ?? 0), 0);
  const totalUstSchuld = income.reduce((s, r) => s + (r.vat_amount ?? 0), 0);
  const zahllast = round(totalUstSchuld - totalVorsteuer);

  const summaryRow = (
    <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 dark:bg-dark-surface">
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted">USt Schuld</span>
          <span className="ml-2 font-semibold">{fmtEUR(totalUstSchuld)}</span>
        </div>
        <span className="text-muted">-</span>
        <div>
          <span className="text-muted">Vorsteuer</span>
          <span className="ml-2 font-semibold">{fmtEUR(totalVorsteuer)}</span>
        </div>
        <span className="text-muted">=</span>
        <div>
          <span className="text-muted">Zahllast</span>
          <span className={`ml-2 font-bold text-base ${zahllast >= 0 ? 'text-red-600' : 'text-accent'}`}>
            {fmtEUR(zahllast)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Eingangsrechnungen */}
        <div>
          <h2 className="text-base font-bold mb-3 text-primary-900 dark:text-dark-text">
            Eingangsrechnungen (Ausgaben)
          </h2>
          <SheetTable
            columns={expColumns}
            data={expenses}
            onUpdate={handleExpenseUpdate}
            onDelete={handleExpenseDelete}
            onAdd={handleExpenseAdd}
            monthOffset={monthOffset}
            onMonthChange={setMonthOffset}
            monthLabel={label}
            loading={loading}
          />
        </div>

        {/* Right: Ausgangsrechnungen */}
        <div>
          <h2 className="text-base font-bold mb-3 text-primary-900 dark:text-dark-text">
            Ausgangsrechnungen (Einnahmen)
          </h2>
          <SheetTable
            columns={incColumns}
            data={income}
            onUpdate={handleIncomeUpdate}
            onDelete={handleIncomeDelete}
            onAdd={handleIncomeAdd}
            monthOffset={monthOffset}
            onMonthChange={setMonthOffset}
            monthLabel={label}
            loading={loading}
          />
        </div>
      </div>

      {summaryRow}
    </div>
  );
}
