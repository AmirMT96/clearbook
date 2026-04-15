import { createClient } from '@/lib/supabase/server';
import { fmtEUR, monthRange } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ExportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const month = monthRange(0);
  const { data: txs } = await supabase
    .from('transactions')
    .select('type, amount, vat_rate, vat_amount, net_amount, date')
    .eq('user_id', user.id)
    .gte('date', month.start).lte('date', month.end);

  const all = txs ?? [];
  const incomeEuBrutto = all.filter((t) => t.type === 'INCOME_EU').reduce((s, t) => s + Number(t.amount), 0);
  const incomeEuVat = all.filter((t) => t.type === 'INCOME_EU').reduce((s, t) => s + Number(t.vat_amount ?? 0), 0);
  const vst19 = all.filter((t) => t.type === 'EU_VST' && t.vat_rate === 19);
  const vst7  = all.filter((t) => t.type === 'EU_VST' && t.vat_rate === 7);
  const sum = (arr: any[], field: string) => arr.reduce((s, t) => s + Number(t[field] ?? 0), 0);

  const vorsteuer = sum([...vst19, ...vst7], 'vat_amount');
  const zahllast = incomeEuVat - vorsteuer;

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl mb-4">📤 Export · {month.label}</h1>

      <div className="card mb-4 font-mono text-sm whitespace-pre-line leading-relaxed">
        <p className="font-bold mb-2">UMSATZSTEUERVORANMELDUNG</p>
        <p>Zeitraum: {month.label}</p>
        <hr className="my-3 border-border" />
        <p className="font-bold">EINNAHMEN (Umsatzsteuer)</p>
        <p>Honorare EU brutto: {fmtEUR(incomeEuBrutto)}</p>
        <p>davon USt: {fmtEUR(incomeEuVat)}</p>
        <hr className="my-3 border-border" />
        <p className="font-bold">AUSGABEN (Vorsteuer)</p>
        <p>EU+VSt 19% ({vst19.length}): {fmtEUR(sum(vst19, 'amount'))}</p>
        <p>&nbsp;&nbsp;davon VSt: {fmtEUR(sum(vst19, 'vat_amount'))}</p>
        <p>EU+VSt 7% ({vst7.length}): {fmtEUR(sum(vst7, 'amount'))}</p>
        <p>&nbsp;&nbsp;davon VSt: {fmtEUR(sum(vst7, 'vat_amount'))}</p>
        <p>Vorsteuer gesamt: {fmtEUR(vorsteuer)}</p>
        <hr className="my-3 border-border" />
        <p className="font-bold">ZAHLLAST ANS FINANZAMT: {fmtEUR(zahllast)}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button disabled className="btn-outline">📄 UStVA als PDF (bald)</button>
        <button disabled className="btn-outline">📊 EÜR als PDF (bald)</button>
        <button disabled className="btn-outline">📋 CSV Export (bald)</button>
      </div>

      <p className="text-xs text-muted">PDF- und CSV-Export folgen im nächsten Durchgang.</p>
    </div>
  );
}
