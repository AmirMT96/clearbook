'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { calcVat, cn, fmtEUR } from '@/lib/utils';

export type TxForEdit = {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  type: string | null;
  vat_rate: number | null;
  category_id: string | null;
  status?: string;
};
export type Cat = { id: string; name: string; emoji: string | null; type: 'PRIVAT' | 'EU' };

const TYPE_OPTIONS = [
  { v: 'PRIVAT', l: 'Privat' },
  { v: 'EU_VST', l: 'EU + Vorsteuer' },
  { v: 'EU_NOVAT', l: 'EU ohne VSt' },
  { v: 'INCOME_MAA', l: 'Einnahme M&A' },
  { v: 'INCOME_EU', l: 'Einnahme EU' },
  { v: 'REFUND_MAA', l: 'M&A ausgelegt' },
];

export function TransactionEditor({
  tx, categories, onClose, confirmOnSave = false,
}: {
  tx: TxForEdit;
  categories: Cat[];
  onClose: () => void;
  confirmOnSave?: boolean;  // true in Review: status → gebucht on save
}) {
  const router = useRouter();
  const [date, setDate] = useState(tx.date);
  const [description, setDescription] = useState(tx.description ?? '');
  const [amount, setAmount] = useState(String(tx.amount));
  const [type, setType] = useState(tx.type ?? 'PRIVAT');
  const [categoryId, setCategoryId] = useState<string | null>(tx.category_id);
  const [vatRate, setVatRate] = useState<number>(tx.vat_rate ?? 19);

  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const relevantCats = categories.filter((c) =>
    type?.startsWith('EU') || type === 'INCOME_EU' ? c.type === 'EU' : c.type === 'PRIVAT'
  );

  async function save() {
    setBusy(true);
    setErr(null);
    const amt = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(amt) || amt <= 0) {
      setErr('Ungültiger Betrag');
      setBusy(false);
      return;
    }
    const { net, vat } = calcVat(amt, vatRate);
    const supabase = createClient();
    const { error } = await supabase
      .from('transactions')
      .update({
        date,
        description: description.trim(),
        amount: amt,
        type,
        category_id: categoryId,
        vat_rate: vatRate,
        net_amount: net,
        vat_amount: vat,
        ...(confirmOnSave ? { status: 'gebucht' } : {}),
      })
      .eq('id', tx.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
    onClose();
  }

  async function doDelete() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div className="bg-surface w-full md:max-w-lg rounded-t-2xl md:rounded-2xl shadow-lifted max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Transaktion bearbeiten</h3>
              <p className="text-xs text-muted mt-0.5">{fmtEUR(tx.amount)} · {tx.date}</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-primary-900 -mr-2 p-2" aria-label="Schließen">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Betrag (brutto €)</label>
              <input inputMode="decimal" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <label className="label">Beschreibung</label>
          <input className="input mb-3" value={description} onChange={(e) => setDescription(e.target.value)} />

          <label className="label">Typ</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setCategoryId(null); }} className="input mb-3">
            {TYPE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>

          <label className="label">Kategorie</label>
          <select value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value || null)} className="input mb-3">
            <option value="">— keine —</option>
            {relevantCats.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
            ))}
          </select>

          <label className="label">USt-Satz</label>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[0, 7, 19].map((r) => (
              <button key={r} onClick={() => setVatRate(r)} type="button"
                className={cn('btn-outline !py-2 text-sm', vatRate === r && 'bg-primary-900 text-white border-primary-900')}>
                {r}%
              </button>
            ))}
          </div>

          {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

          {confirmDelete ? (
            <div className="rounded-xl bg-red-50 p-4 border border-red-200 mb-3">
              <p className="text-sm font-semibold text-red-800 mb-2">Wirklich löschen?</p>
              <p className="text-xs text-red-700 mb-3">Diese Transaktion wird dauerhaft entfernt.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="btn-outline flex-1">Abbrechen</button>
                <button onClick={doDelete} disabled={busy} className="btn flex-1 bg-red-600 text-white hover:bg-red-700">
                  {busy ? '…' : 'Ja, löschen'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(true)} className="btn-outline text-red-600 border-red-200 hover:bg-red-50" type="button">
                🗑️
              </button>
              <button onClick={onClose} className="btn-ghost flex-1" type="button">Abbrechen</button>
              <button onClick={save} disabled={busy} className="btn-primary flex-1" type="button">
                {busy ? '…' : confirmOnSave ? 'Buchen' : 'Speichern'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
