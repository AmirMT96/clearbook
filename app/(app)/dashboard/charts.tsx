'use client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmtEUR } from '@/lib/utils';

const COLORS = ['#001e40', '#4ECBA0', '#1a3558', '#9fdfc7', '#6b7280', '#d1d4f9', '#b6e3f4'];

export function DashboardCharts({ transactions }: { transactions: any[] }) {
  // Privat-Ausgaben by description (simple grouping)
  const privat = transactions.filter((t) => t.type === 'PRIVAT');
  const byDesc: Record<string, number> = {};
  for (const t of privat) {
    const key = (t.description ?? 'Sonstiges').split(' ')[0] || 'Sonstiges';
    byDesc[key] = (byDesc[key] ?? 0) + Number(t.amount);
  }
  const donutData = Object.entries(byDesc)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Monthly income vs expense (last 6 months)
  const now = new Date();
  const months: { key: string; label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(d),
      income: 0,
      expense: 0,
    });
  }
  for (const t of transactions) {
    const key = (t.date ?? '').slice(0, 7);
    const m = months.find((x) => x.key === key);
    if (!m) continue;
    if (t.type?.startsWith('INCOME_')) m.income += Number(t.amount);
    else if (t.type !== 'REFUND_MAA') m.expense += Number(t.amount);
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold mb-2">🍩 Privat-Ausgaben</h3>
        {donutData.length === 0 ? (
          <p className="text-sm text-muted py-12 text-center">Noch keine Privat-Ausgaben.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtEUR(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">📊 Einnahmen vs. Ausgaben</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={months}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => fmtEUR(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Einnahmen" fill="#4ECBA0" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" name="Ausgaben" fill="#001e40" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
