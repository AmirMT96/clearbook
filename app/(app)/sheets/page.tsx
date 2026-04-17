import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmtEUR, monthRange } from '@/lib/utils';

type CardData = {
  title: string;
  subtitle: string;
  href: string;
  hasWarning: boolean;
};

export default async function SheetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { start, end, label } = monthRange(0);

  /* ── Parallel queries ─────────────────────────────────────── */
  const [
    { data: privatTx },
    { data: euExpenses },
    { data: euIncome },
    { data: getbacks },
    { data: incomeMAA },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, status')
      .eq('user_id', user.id)
      .eq('type', 'PRIVAT')
      .gte('date', start)
      .lte('date', end),
    supabase
      .from('transactions')
      .select('net_amount, vat_amount, status, type')
      .eq('user_id', user.id)
      .in('type', ['EU_VST', 'EU_NOVAT'])
      .gte('date', start)
      .lte('date', end),
    supabase
      .from('transactions')
      .select('net_amount, vat_amount, status')
      .eq('user_id', user.id)
      .eq('type', 'INCOME_EU')
      .gte('date', start)
      .lte('date', end),
    supabase
      .from('getbacks')
      .select('amount, status')
      .eq('user_id', user.id),
    supabase
      .from('transactions')
      .select('amount, status')
      .eq('user_id', user.id)
      .eq('type', 'INCOME_MAA')
      .gte('date', start)
      .lte('date', end),
  ]);

  /* ── Calculations ─────────────────────────────────────────── */
  const privatSum = (privatTx ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
  const privatWarning = (privatTx ?? []).some((t) => t.status === 'ungefasst');

  const expVat = (euExpenses ?? []).reduce((s, t) => s + (t.vat_amount ?? 0), 0);
  const incVat = (euIncome ?? []).reduce((s, t) => s + (t.vat_amount ?? 0), 0);
  const zahllast = incVat - expVat;
  const ustvaWarning =
    (euExpenses ?? []).some((t) => t.status === 'ungefasst') ||
    (euIncome ?? []).some((t) => t.status === 'ungefasst');

  const expNet = (euExpenses ?? []).reduce((s, t) => s + (t.net_amount ?? 0), 0);
  const incNet = (euIncome ?? []).reduce((s, t) => s + (t.net_amount ?? 0), 0);
  const gewinn = incNet - expNet;
  const euerWarning = ustvaWarning;

  const openGetbacks = (getbacks ?? []).filter((g) => g.status === 'AUSSTEHEND');
  const getbackSum = openGetbacks.reduce((s, g) => s + (g.amount ?? 0), 0);
  const getbackWarning = openGetbacks.length > 0;

  const maaSum = (incomeMAA ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
  const euIncSum = (euIncome ?? []).reduce((s, t) => s + ((t.net_amount ?? 0) + (t.vat_amount ?? 0)), 0);
  const einnahmenSum = maaSum + euIncSum;
  const einnahmenWarning =
    (incomeMAA ?? []).some((t) => t.status === 'ungefasst') ||
    (euIncome ?? []).some((t) => t.status === 'ungefasst');

  const cards: CardData[] = [
    {
      title: 'Privat',
      subtitle: fmtEUR(privatSum),
      href: '/sheets/privat',
      hasWarning: privatWarning,
    },
    {
      title: 'UStVA',
      subtitle: `Zahllast ${fmtEUR(zahllast)}`,
      href: '/sheets/ustva',
      hasWarning: ustvaWarning,
    },
    {
      title: 'EUeR',
      subtitle: `Gewinn ${fmtEUR(gewinn)}`,
      href: '/sheets/euer',
      hasWarning: euerWarning,
    },
    {
      title: 'GetBacks',
      subtitle: `${openGetbacks.length} offen / ${fmtEUR(getbackSum)}`,
      href: '/sheets/getbacks',
      hasWarning: getbackWarning,
    },
    {
      title: 'Einnahmen',
      subtitle: fmtEUR(einnahmenSum),
      href: '/sheets/einnahmen',
      hasWarning: einnahmenWarning,
    },
    {
      title: 'Dashboard',
      subtitle: 'Zur Uebersicht',
      href: '/dashboard',
      hasWarning: false,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl mb-1">Sheets</h1>
      <p className="text-sm text-muted mb-8">{label}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card group hover:shadow-lifted transition relative flex flex-col gap-2 dark:bg-dark-surface dark:border-dark-border"
          >
            {c.hasWarning && (
              <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-red-500" />
            )}
            <span className="text-lg font-bold text-primary-900 dark:text-dark-text">
              {c.title}
            </span>
            <span className="text-sm text-muted dark:text-dark-muted">
              {c.subtitle}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
