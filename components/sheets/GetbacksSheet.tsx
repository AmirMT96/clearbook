'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { monthRange, fmtEUR, cn } from '@/lib/utils';
import { SheetTable, type ColumnDef } from './SheetTable';

type Row = {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  beleg_checked: boolean;
  status: string;
  note: string | null;
};

const STATUS_OPTIONS = [
  { value: 'AUSSTEHEND', label: 'Ausstehend' },
  { value: 'ERHALTEN', label: 'Erhalten' },
  { value: 'ABGELEHNT', label: 'Abgelehnt' },
];

export function GetbacksSheet({ userId }: { userId: string }) {
  const supabase = createClient();
  const [monthOffset, setMonthOffset] = useState(0);
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const { label } = monthRange(monthOffset);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const r = monthRange(monthOffset);
    const { data: rows } = await supabase
      .from('getbacks')
      .select('id, date, description, amount, beleg_checked, status, note')
      .eq('user_id', userId)
      .gte('date', r.start)
      .lte('date', r.end)
      .order('date');
    setData(rows ?? []);
    setLoading(false);
  }, [monthOffset, userId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date();
  const isLateMonth = today.getDate() > 20;

  const columns: ColumnDef<Row>[] = [
    { key: 'date', header: 'Datum', type: 'date', width: 'w-24' },
    { key: 'description', header: 'Beschreibung', type: 'text', width: 'min-w-[180px]' },
    { key: 'amount', header: 'Betrag', type: 'currency', width: 'w-28' },
    { key: 'beleg_checked', header: 'Beleg', type: 'checkbox', width: 'w-14' },
    {
      key: 'status',
      header: 'Status',
      type: 'select',
      width: 'w-32',
      options: STATUS_OPTIONS,
      formatDisplay: (row) => {
        const opt = STATUS_OPTIONS.find((o) => o.value === row.status);
        return opt?.label ?? row.status;
      },
    },
    { key: 'note', header: 'Notiz', type: 'text', width: 'min-w-[120px]' },
  ];

  const handleUpdate = async (id: string, field: string, value: string | number | boolean) => {
    const update: Record<string, any> = { [field]: value };
    await supabase.from('getbacks').update(update).eq('id', id);
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('getbacks').delete().eq('id', id);
    setData((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAdd = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: row } = await supabase
      .from('getbacks')
      .insert({
        user_id: userId,
        date: todayStr,
        amount: 0,
        status: 'AUSSTEHEND',
      })
      .select('id, date, description, amount, beleg_checked, status, note')
      .single();
    if (row) setData((prev) => [...prev, row]);
  };

  /* ── Summary ─────────────────────── */
  const openCount = data.filter((r) => r.status === 'AUSSTEHEND').length;
  const openSum = data
    .filter((r) => r.status === 'AUSSTEHEND')
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  /* ── Custom table with reminder highlights ── */
  /* We wrap SheetTable and apply row-level highlight via CSS override */
  /* SheetTable already highlights ungefasst; for getbacks we want
     late-month + AUSSTEHEND highlight. We'll map status to a virtual
     'ungefasst' status for that purpose. */
  const mappedData = data.map((r) => ({
    ...r,
    // Use the status field to trigger SheetTable's amber highlight
    // when it's late month and ausstehend
    status: isLateMonth && r.status === 'AUSSTEHEND' ? 'ungefasst' : undefined,
    _realStatus: r.status,
  }));

  /* Because we need the real status for display, we'll use original data
     and handle highlight differently. Let's just use the original data
     and add a caption with the reminder. */

  return (
    <div>
      {isLateMonth && openCount > 0 && (
        <div className="card mb-4 border-l-4 border-amber-400 bg-amber-50/60 dark:bg-amber-900/20 dark:border-amber-600">
          <p className="text-sm text-primary-900 dark:text-dark-text">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2" />
            {openCount} offene Rueckforderung{openCount !== 1 ? 'en' : ''} ({fmtEUR(openSum)}) -- Monatsende naht.
          </p>
        </div>
      )}

      <SheetTable
        columns={columns}
        data={data}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        monthOffset={monthOffset}
        onMonthChange={setMonthOffset}
        monthLabel={label}
        loading={loading}
        caption={
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted">Offen</span>
              <span className="ml-2 font-semibold">{openCount}</span>
            </div>
            <div>
              <span className="text-muted">Summe offen</span>
              <span className="ml-2 font-bold text-accent">{fmtEUR(openSum)}</span>
            </div>
          </div>
        }
      />
    </div>
  );
}
