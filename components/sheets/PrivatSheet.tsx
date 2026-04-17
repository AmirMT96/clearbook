'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { monthRange } from '@/lib/utils';
import { SheetTable, type ColumnDef } from './SheetTable';

type Category = { id: string; name: string; emoji: string | null; type: string };

type Row = {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  category_id: string | null;
  note: string | null;
  status?: string;
};

export function PrivatSheet({
  userId,
  categories,
}: {
  userId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [monthOffset, setMonthOffset] = useState(0);
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end, label } = monthRange(monthOffset);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const r = monthRange(monthOffset);
    const { data: rows } = await supabase
      .from('transactions')
      .select('id, date, description, amount, category_id, note, status')
      .eq('user_id', userId)
      .eq('type', 'PRIVAT')
      .gte('date', r.start)
      .lte('date', r.end)
      .order('date', { ascending: true });
    setData(rows ?? []);
    setLoading(false);
  }, [monthOffset, userId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const columns: ColumnDef<Row>[] = [
    { key: 'date', header: 'Datum', type: 'date', width: 'w-24' },
    { key: 'description', header: 'Beschreibung', type: 'text', width: 'min-w-[180px]' },
    { key: 'amount', header: 'Betrag', type: 'currency', width: 'w-28' },
    {
      key: 'category_id',
      header: 'Kategorie',
      type: 'select',
      width: 'w-36',
      options: [{ value: '', label: '-- keine --' }, ...categoryOptions],
      formatDisplay: (row) => {
        const cat = categories.find((c) => c.id === row.category_id);
        return cat ? cat.name : '--';
      },
    },
    { key: 'note', header: 'Notiz', type: 'text', width: 'min-w-[120px]' },
  ];

  const handleUpdate = async (id: string, field: string, value: string | number | boolean) => {
    const update: Record<string, any> = { [field]: value };
    if (field === 'category_id' && value === '') update.category_id = null;
    await supabase.from('transactions').update(update).eq('id', id);
    setData((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...update } : r)),
    );
  };

  const handleDelete = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setData((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAdd = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: row } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        date: today,
        amount: 0,
        type: 'PRIVAT',
        vat_rate: 0,
        vat_amount: 0,
        net_amount: 0,
        status: 'ungefasst',
      })
      .select('id, date, description, amount, category_id, note, status')
      .single();
    if (row) {
      setData((prev) => [...prev, row]);
    }
  };

  return (
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
    />
  );
}
