'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calcVat } from '@/lib/utils';
import type { ParsedEntry } from '@/lib/claude';

export function QuickInput({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recMode, setRecMode] = useState(false);
  const [recDay, setRecDay] = useState('1');
  const [pendingParsed, setPendingParsed] = useState<ParsedEntry | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch('/api/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });
      const parsed: ParsedEntry = await res.json();
      if (!res.ok) throw new Error((parsed as any).error ?? 'Parse fehlgeschlagen');

      if (parsed.amount === null) {
        setErr('Betrag nicht erkannt. Beispiel: "Aldi 13,40 privat"');
        setBusy(false);
        return;
      }

      // Recurring mode — ask for day
      if (parsed.suffix === 'rec') {
        setPendingParsed(parsed);
        setRecMode(true);
        setBusy(false);
        return;
      }

      await insertEntry(parsed);
    } catch (e: any) {
      setErr(e?.message ?? 'Fehler');
      setBusy(false);
    }
  }

  async function confirmRecurring() {
    if (!pendingParsed) return;
    setBusy(true);
    try {
      await insertRecurring(pendingParsed, parseInt(recDay) || 1);
      done();
    } catch (e: any) {
      setErr(e?.message ?? 'Fehler');
      setBusy(false);
    }
  }

  async function insertEntry(p: ParsedEntry) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Nicht eingeloggt');

    const date = p.date ?? new Date().toISOString().slice(0, 10);
    const amt = p.amount!;
    const suffix = p.suffix;

    // Resolve category for "privat" entries
    let categoryId: string | null = null;
    if ((suffix === 'privat' || suffix === null) && p.category_hint) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .ilike('name', p.category_hint);
      if (cats?.[0]) categoryId = cats[0].id;
    }
    // For EU suffix, find "E.U." category
    if (suffix === 'ust' || suffix === 'ust7' || suffix === 'noust') {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .or('name.ilike.E.U.,name.ilike.%E.U.%');
      if (cats?.[0]) categoryId = cats[0].id;
    }

    const vatRate = suffix === 'ust' || suffix === 'plus_ust' ? 19
      : suffix === 'ust7' ? 7
      : suffix === 'noust' ? 0
      : (suffix === 'privat' || suffix === null) ? 0 // privat has no VSt to reclaim
      : 0;

    const { net, vat } = calcVat(amt, vatRate);

    // Determine what tables to insert into based on suffix
    if (suffix === 'gb') {
      // GetBacks table
      await supabase.from('getbacks').insert({
        user_id: user.id,
        date,
        description: p.merchant,
        amount: amt,
        note: p.note,
      });
    } else if (suffix === 'plus') {
      // Income M&A (Gehalt)
      await supabase.from('transactions').insert({
        user_id: user.id,
        date,
        amount: amt,
        description: p.merchant,
        type: 'INCOME_MAA',
        vat_rate: 0,
        vat_amount: 0,
        net_amount: amt,
        status: 'gebucht',
        note: p.note,
        raw_input: input.trim(),
      });
    } else if (suffix === 'plus_ust') {
      // Income EU (Honorar) → transactions (INCOME_EU)
      const { net: n19, vat: v19 } = calcVat(amt, 19);
      await supabase.from('transactions').insert({
        user_id: user.id,
        date,
        amount: amt,
        description: p.merchant,
        type: 'INCOME_EU',
        vat_rate: 19,
        vat_amount: v19,
        net_amount: n19,
        status: 'gebucht',
        note: p.note,
        raw_input: input.trim(),
      });
    } else if (suffix === 'ust' || suffix === 'ust7') {
      // EU expense with VAT → Privat (E.U.) + UStVA + EÜR
      // One transaction covers all three views via type=EU_VST
      await supabase.from('transactions').insert({
        user_id: user.id,
        date,
        amount: amt,
        description: p.merchant,
        type: 'EU_VST',
        category_id: categoryId,
        vat_rate: vatRate,
        vat_amount: vat,
        net_amount: net,
        status: 'gebucht',
        note: p.note,
        raw_input: input.trim(),
      });
      // Also add to Privat as "E.U." category spending
      await supabase.from('transactions').insert({
        user_id: user.id,
        date,
        amount: amt,
        description: p.merchant,
        type: 'PRIVAT',
        category_id: categoryId,
        vat_rate: 0,
        vat_amount: 0,
        net_amount: amt,
        status: 'gebucht',
        note: p.note,
        raw_input: input.trim(),
      });
    } else if (suffix === 'noust') {
      // EU expense no VAT → EÜR only (no UStVA)
      await supabase.from('transactions').insert({
        user_id: user.id,
        date,
        amount: amt,
        description: p.merchant,
        type: 'EU_NOVAT',
        category_id: categoryId,
        vat_rate: 0,
        vat_amount: 0,
        net_amount: amt,
        status: 'gebucht',
        note: p.note,
        raw_input: input.trim(),
      });
      // Also in Privat as E.U.
      await supabase.from('transactions').insert({
        user_id: user.id,
        date,
        amount: amt,
        description: p.merchant,
        type: 'PRIVAT',
        category_id: categoryId,
        vat_rate: 0,
        vat_amount: 0,
        net_amount: amt,
        status: 'gebucht',
        note: p.note,
        raw_input: input.trim(),
      });
    } else {
      // privat or null (no suffix → ungefasst for manual assignment)
      await supabase.from('transactions').insert({
        user_id: user.id,
        date,
        amount: amt,
        description: p.merchant,
        type: 'PRIVAT',
        category_id: categoryId,
        vat_rate: 0,
        vat_amount: 0,
        net_amount: amt,
        status: suffix === 'privat' ? 'gebucht' : 'ungefasst',
        note: p.note,
        raw_input: input.trim(),
      });
    }

    done();
  }

  async function insertRecurring(p: ParsedEntry, dayOfMonth: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Nicht eingeloggt');

    await supabase.from('recurring_templates').insert({
      user_id: user.id,
      amount: p.amount,
      description: p.merchant,
      type: p.suffix === 'rec' ? 'PRIVAT' : (p.suffix ?? 'PRIVAT'),
      vat_rate: p.vat_rate ?? 0,
      day_of_month: dayOfMonth,
      is_active: true,
    });
  }

  function done() {
    setInput('');
    setBusy(false);
    setRecMode(false);
    setPendingParsed(null);
    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-surface dark:bg-dark-surface w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 shadow-lifted" onClick={(e) => e.stopPropagation()}>
        {recMode ? (
          <div>
            <h3 className="text-lg font-bold dark:text-dark-text mb-1">Wiederkehrender Eintrag</h3>
            <p className="text-sm text-muted mb-4">{pendingParsed?.merchant} — {pendingParsed?.amount} EUR</p>
            <label className="label">Jeden welchen Tag des Monats?</label>
            <input
              type="number" min={1} max={31}
              className="input mb-4"
              value={recDay}
              onChange={(e) => setRecDay(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => { setRecMode(false); setBusy(false); }} className="btn-ghost flex-1">Abbrechen</button>
              <button onClick={confirmRecurring} disabled={busy} className="btn-primary flex-1">
                {busy ? '...' : 'Speichern'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold dark:text-dark-text mb-1">Neuer Eintrag</h3>
            <p className="text-sm text-muted mb-4">Suffix: privat, USt, USt7, noUSt, GB, +, +USt, rec</p>
            <form onSubmit={submit}>
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="input flex-1"
                  placeholder='z.B. "Aldi 13,40 privat"'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={busy}
                />
                <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
                  {busy ? '...' : 'OK'}
                </button>
              </div>
              {err && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{err}</p>}
              <button type="button" onClick={onClose} className="btn-ghost mt-4 w-full">Abbrechen</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
