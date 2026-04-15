'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function QuickInput({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error ?? 'Parse fehlgeschlagen');

      if (parsed.amount === null || parsed.date === null) {
        setErr('Betrag oder Datum nicht erkannt — bitte präziser schreiben (z.B. "Aldi 13,40 heute").');
        setBusy(false);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt');

      const vatRate = parsed.vat_rate ?? 19;
      const net = vatRate === 0 ? parsed.amount : parsed.amount / (1 + vatRate / 100);
      const vat = parsed.amount - net;

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        date: parsed.date,
        amount: parsed.amount,
        description: parsed.merchant,
        type: parsed.is_tankstelle ? 'REFUND_MAA' : parsed.type_hint === 'EU' ? 'EU_VST' : 'PRIVAT',
        vat_rate: vatRate,
        vat_amount: Math.round(vat * 100) / 100,
        net_amount: Math.round(net * 100) / 100,
        status: 'ungefasst',
        raw_input: input.trim(),
      });
      if (error) throw error;

      setInput('');
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-surface w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 shadow-lifted" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">Was hast du ausgegeben?</h3>
        <p className="text-sm text-muted mb-4">z.B. "Aldi 13,40 heute" oder "Notion 10 eu"</p>
        <form onSubmit={submit}>
          <div className="flex gap-2">
            <input
              autoFocus
              className="input flex-1"
              placeholder="Händler, Betrag, optional Datum…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
              {busy ? '…' : '📤'}
            </button>
          </div>
          {err && <p className="text-xs text-red-600 mt-3">{err}</p>}
          <button type="button" onClick={onClose} className="btn-ghost mt-4 w-full">Abbrechen</button>
        </form>
      </div>
    </div>
  );
}
