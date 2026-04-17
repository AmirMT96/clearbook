'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { monthRange, fmtEUR, round } from '@/lib/utils';
import { SheetTable, type ColumnDef } from './SheetTable';

type MaaRow = {
  id: string;
  date: string;
  description: string | null;
  net_amount: number;
  note: string | null;
  status?: string;
};

type EuRow = {
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

export function EinnahmenSheet({ userId }: { userId: string }) {
  const supabase = createClient();
  const [monthOffset, setMonthOffset] = useState(0);
  const [maaData, setMaaData] = useState<MaaRow[]>([]);
  const [euData, setEuData] = useState<EuRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { label } = monthRange(monthOffset);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const r = monthRange(monthOffset);
    const [maaRes, euRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, date, description, net_amount, note, status')
        .eq('user_id', userId)
        .eq('type', 'INCOME_MAA')
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
    setMaaData(maaRes.data ?? []);
    setEuData(euRes.data ?? []);
    setLoading(false);
  }, [monthOffset, userId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── MAA columns ─────────────────── */
  const maaColumns: ColumnDef<MaaRow>[] = [
    { key: 'date', header: 'Datum', type: 'date', width: 'w-24' },
    { key: 'description', header: 'Beschreibung', type: 'text', width: 'min-w-[180px]' },
    { key: 'net_amount', header: 'Netto', type: 'currency', width: 'w-28' },
    { key: 'note', header: 'Notiz', type: 'text', width: 'min-w-[120px]' },
  ];

  /* ── EU columns ──────────────────── */
  const euColumns: ColumnDef<EuRow>[] = [
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
  const handleMaaUpdate = async (id: string, field: string, value: string | number | boolean) => {
    const update: Record<string, any> = { [field]: value };
    // For MAA, amount = net_amount (no VAT)
    if (field === 'net_amount') {
      update.amount = Number(value);
      update.vat_amount = 0;
    }
    await supabase.from('transactions').update(update).eq('id', id);
    setMaaData((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  };

  const handleEuUpdate = async (id: string, field: string, value: string | number | boolean) => {
    const update: Record<string, any> = { [field]: value };
    if (field === 'net_amount') {
      const net = Number(value);
      const vat = round(net * 0.19);
      update.net_amount = net;
      update.vat_amount = vat;
      update.amount = round(net + vat);
    }
    await supabase.from('transactions').update(update).eq('id', id);
    setEuData((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  };

  const handleMaaDelete = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setMaaData((prev) => prev.filter((r) => r.id !== id));
  };

  const handleEuDelete = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setEuData((prev) => prev.filter((r) => r.id !== id));
  };

  const handleMaaAdd = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: row } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        date: today,
        amount: 0,
        type: 'INCOME_MAA',
        vat_rate: 0,
        vat_amount: 0,
        net_amount: 0,
        status: 'ungefasst',
      })
      .select('id, date, description, net_amount, note, status')
      .single();
    if (row) setMaaData((prev) => [...prev, row]);
  };

  const handleEuAdd = async () => {
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
    if (row) setEuData((prev) => [...prev, row]);
  };

  /* ── Summary ─────────────────────── */
  const totalMaa = maaData.reduce((s, r) => s + (r.net_amount ?? 0), 0);
  const totalEuNet = euData.reduce((s, r) => s + (r.net_amount ?? 0), 0);
  const totalEuBrutto = euData.reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-bold mb-3 text-primary-900 dark:text-dark-text">
            M&amp;A / Gehalt
          </h2>
          <SheetTable
            columns={maaColumns}
            data={maaData}
            onUpdate={handleMaaUpdate}
            onDelete={handleMaaDelete}
            onAdd={handleMaaAdd}
            monthOffset={monthOffset}
            onMonthChange={setMonthOffset}
            monthLabel={label}
            loading={loading}
          />
        </div>

        <div>
          <h2 className="text-base font-bold mb-3 text-primary-900 dark:text-dark-text">
            Einzelunternehmen / Honorare
          </h2>
          <SheetTable
            columns={euColumns}
            data={euData}
            onUpdate={handleEuUpdate}
            onDelete={handleEuDelete}
            onAdd={handleEuAdd}
            monthOffset={monthOffset}
            onMonthChange={setMonthOffset}
            monthLabel={label}
            loading={loading}
          />
        </div>
      </div>

      <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 dark:bg-dark-surface">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted">M&amp;A Netto</span>
            <span className="ml-2 font-semibold">{fmtEUR(totalMaa)}</span>
          </div>
          <span className="text-muted">+</span>
          <div>
            <span className="text-muted">EU Brutto</span>
            <span className="ml-2 font-semibold">{fmtEUR(totalEuBrutto)}</span>
          </div>
          <span className="text-muted">=</span>
          <div>
            <span className="text-muted">Gesamt</span>
            <span className="ml-2 font-bold text-base text-accent">
              {fmtEUR(round(totalMaa + totalEuBrutto))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
