'use client';
import { useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid,
} from 'recharts';
import { fmtEUR } from '@/lib/utils';

const COLORS = ['#001e40', '#4ECBA0', '#1a3558', '#3eab86', '#6b7280', '#93c5fd', '#c084fc'];

type Tx = {
  id: string; amount: number; type: string | null; vat_rate: number | null;
  vat_amount: number | null; net_amount: number | null; date: string;
  description: string; category_id: string | null;
};
type Cat = { id: string; name: string; type: string };

export function DashboardCharts({ transactions, categories }: { transactions: Tx[]; categories: Cat[] }) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  // Bar chart: monthly income vs expense
  const barData = useMemo(() => {
    const months: Record<string, { key: string; label: string; income: number; expense: number }> = {};
    for (const t of transactions) {
      const key = t.date.slice(0, 7);
      if (!months[key]) {
        const d = new Date(key + '-01');
        months[key] = {
          key,
          label: d.toLocaleDateString('de-DE', { month: 'short' }),
          income: 0, expense: 0,
        };
      }
      if (t.type?.startsWith('INCOME_')) months[key].income += Number(t.amount);
      else months[key].expense += Number(t.amount);
    }
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [transactions]);

  // Pie chart: expenses by category
  const pieData = useMemo(() => {
    const bycat: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type?.startsWith('INCOME_')) continue;
      const name = t.category_id ? (catMap[t.category_id] ?? 'Sonstiges') : 'Ohne Kategorie';
      bycat[name] = (bycat[name] ?? 0) + Number(t.amount);
    }
    return Object.entries(bycat)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [transactions, catMap]);

  // Line chart: cumulative profit
  const lineData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    const byMonth: Record<string, number> = {};
    for (const t of sorted) {
      const key = t.date.slice(0, 7);
      if (t.type === 'INCOME_EU') cumulative += Number(t.net_amount ?? t.amount);
      else if (t.type === 'EU_VST' || t.type === 'EU_NOVAT') cumulative -= Number(t.net_amount ?? t.amount);
      byMonth[key] = cumulative;
    }
    return Object.entries(byMonth)
      .map(([key, gewinn]) => ({
        label: new Date(key + '-01').toLocaleDateString('de-DE', { month: 'short' }),
        gewinn: Math.round(gewinn * 100) / 100,
      }));
  }, [transactions]);

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      {/* Bar: Income vs Expense */}
      <div className="card dark:bg-dark-surface">
        <h3 className="font-semibold mb-2 text-sm dark:text-dark-text">Einnahmen vs. Ausgaben</h3>
        {barData.length === 0 ? (
          <p className="text-sm text-muted py-12 text-center">Keine Daten.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmtEUR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" name="Einnahmen" fill="#4ECBA0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Ausgaben" fill="#001e40" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie: Expenses by Category */}
      <div className="card dark:bg-dark-surface">
        <h3 className="font-semibold mb-2 text-sm dark:text-dark-text">Ausgaben nach Kategorie</h3>
        {pieData.length === 0 ? (
          <p className="text-sm text-muted py-12 text-center">Keine Daten.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtEUR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Line: Cumulative Profit */}
      <div className="card dark:bg-dark-surface md:col-span-2">
        <h3 className="font-semibold mb-2 text-sm dark:text-dark-text">Gewinn kumulativ</h3>
        {lineData.length === 0 ? (
          <p className="text-sm text-muted py-12 text-center">Keine Daten.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmtEUR(v)} />
              <Line type="monotone" dataKey="gewinn" name="Gewinn" stroke="#4ECBA0" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
