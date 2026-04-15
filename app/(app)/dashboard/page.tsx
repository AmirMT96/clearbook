import { createClient } from '@/lib/supabase/server';
import { fmtEUR, monthRange } from '@/lib/utils';
import { BotttAvatar } from '@/components/BotttAvatar';
import { DashboardCharts } from './charts';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const month = monthRange(0);

  const { data: txs } = await supabase
    .from('transactions')
    .select('id, amount, type, vat_rate, vat_amount, net_amount, status, date, description, category_id, is_auto_booked')
    .eq('user_id', user.id);

  const all = txs ?? [];
  const monthTxs = all.filter((t) => t.date >= month.start && t.date <= month.end);

  // USt-Zahllast (dieser Monat): Einnahmen EU USt - Vorsteuer
  const ustOut = monthTxs.filter((t) => t.type === 'INCOME_EU').reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const ustIn  = monthTxs.filter((t) => t.type === 'EU_VST').reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const zahllast = ustOut - ustIn;

  // Gewinn YTD (EU Einnahmen - EU Ausgaben, netto)
  const ytdEuIncome = all.filter((t) => t.type === 'INCOME_EU').reduce((s, t) => s + Number(t.net_amount ?? 0), 0);
  const ytdEuCost   = all.filter((t) => t.type === 'EU_VST' || t.type === 'EU_NOVAT').reduce((s, t) => s + Number(t.net_amount ?? 0), 0);
  const gewinn = ytdEuIncome - ytdEuCost;

  // Liquidität (brutto Einnahmen - brutto Ausgaben - USt Rücklage)
  const bruttoIn  = all.filter((t) => t.type?.startsWith('INCOME_')).reduce((s, t) => s + Number(t.amount), 0);
  const bruttoOut = all.filter((t) => !t.type?.startsWith('INCOME_') && t.type !== 'REFUND_MAA').reduce((s, t) => s + Number(t.amount), 0);
  const liquiditaet = bruttoIn - bruttoOut - Math.max(zahllast, 0);

  // Offene Erstattungen M&A
  const { data: refunds } = await supabase
    .from('refunds_maa')
    .select('id, status, transaction_id, transactions(amount)')
    .eq('user_id', user.id)
    .eq('status', 'OFFEN');
  const offenCount = refunds?.length ?? 0;
  const offenSum = (refunds ?? []).reduce((s: number, r: any) => s + Number(r.transactions?.amount ?? 0), 0);

  // Ungeprüfte Transaktionen
  const reviewCount = all.filter((t) => t.status === 'ungefasst').length;

  const greeting = greetByHour();
  const fullName = `${profile?.anrede ?? ''} ${profile?.nachname ?? ''}`.trim();

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <header className="flex items-center gap-4 mb-6">
        {profile?.bottt_seed && (
          <BotttAvatar seed={profile.bottt_seed} anrede={profile.anrede} size={64} />
        )}
        <div>
          <h1 className="text-2xl">{greeting}, {fullName || 'willkommen'}!</h1>
          <p className="text-sm text-muted">{profile?.bottt_name ?? 'Dein Bottt'} hat alles im Blick. 🤖</p>
        </div>
      </header>

      {reviewCount > 0 && (
        <Link href="/review" className="card flex items-center justify-between mb-6 hover:shadow-lifted transition">
          <div>
            <p className="font-semibold">⚠️ {reviewCount} Einträge warten</p>
            <p className="text-xs text-muted">Kurz drüber schauen — ich habe schon vorgearbeitet!</p>
          </div>
          <span className="text-muted">→</span>
        </Link>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <KPI label="💰 USt-Zahllast" value={fmtEUR(zahllast)} hint={month.label} />
        <KPI label="📈 Gewinn (YTD)" value={fmtEUR(gewinn)} hint="netto, EU" />
        <KPI label="💳 Liquidität" value={fmtEUR(liquiditaet)} hint="nach USt-Rücklage" />
        <KPI label="🔄 Offene M&A" value={`${offenCount}`} hint={fmtEUR(offenSum)} />
      </div>

      <DashboardCharts transactions={all} />

      {all.length === 0 && (
        <div className="card text-center mt-6">
          <p className="font-semibold mb-1">Noch keine Buchungen</p>
          <p className="text-sm text-muted">Tippe unten auf ＋ und wir legen los!</p>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl md:text-2xl font-bold mt-1 font-display">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

function greetByHour() {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Hallo';
  return 'Guten Abend';
}
