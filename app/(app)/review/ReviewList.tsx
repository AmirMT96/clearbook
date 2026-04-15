'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fmtEUR, fmtDate, calcVat } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Tx = {
  id: string; date: string; description: string; amount: number;
  type: string | null; vat_rate: number | null; category_id: string | null; is_auto_booked: boolean;
};
type Cat = { id: string; name: string; emoji: string | null; type: 'PRIVAT' | 'EU' };

export function ReviewList({ txs, categories }: { txs: Tx[]; categories: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmOne(t: Tx, patch?: Partial<Tx>) {
    const supabase = createClient();
    const next = { ...t, ...patch };
    const rate = next.vat_rate ?? 19;
    const { net, vat } = calcVat(Number(next.amount), rate);

    await supabase
      .from('transactions')
      .update({
        status: 'gebucht',
        type: next.type ?? 'PRIVAT',
        vat_rate: rate,
        vat_amount: vat,
        net_amount: net,
        category_id: next.category_id,
      })
      .eq('id', t.id);
  }

  async function confirmAll() {
    setBusy(true);
    for (const t of txs) await confirmOne(t);
    router.refresh();
    setBusy(false);
  }

  return (
    <div>
      <ul className="space-y-2 mb-6">
        {txs.map((t) => (
          <li key={t.id} className="card">
            <ReviewRow
              t={t}
              cats={categories}
              isEditing={editing === t.id}
              onEdit={() => setEditing(editing === t.id ? null : t.id)}
              onConfirm={async (patch) => {
                await confirmOne(t, patch);
                setEditing(null);
                router.refresh();
              }}
            />
          </li>
        ))}
      </ul>

      <button onClick={confirmAll} disabled={busy} className="btn-primary w-full py-4 text-base">
        {busy ? '…' : `✅ Alle bestätigen (${txs.length})`}
      </button>
    </div>
  );
}

function ReviewRow({
  t, cats, isEditing, onEdit, onConfirm,
}: {
  t: Tx; cats: Cat[]; isEditing: boolean;
  onEdit: () => void; onConfirm: (patch?: Partial<Tx>) => Promise<void>;
}) {
  const [type, setType] = useState<string>(t.type ?? 'PRIVAT');
  const [catId, setCatId] = useState<string | null>(t.category_id);
  const [vatRate, setVatRate] = useState<number>(t.vat_rate ?? 19);

  const relevantCats = cats.filter((c) => type?.startsWith('EU') ? c.type === 'EU' : c.type === 'PRIVAT');

  if (!isEditing) {
    const cat = cats.find((c) => c.id === t.category_id);
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">📅 {fmtDate(t.date)}</p>
          <p className="font-semibold truncate">{t.description}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
            <span className="pill bg-bg">{cat ? `${cat.emoji ?? ''} ${cat.name}` : '❓ Unbekannt'}</span>
            <span className="pill bg-bg">{typeLabel(t.type)}</span>
            {t.is_auto_booked && <span className="pill bg-accent-50 text-accent-600">Auto</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-lg">{fmtEUR(Number(t.amount))}</p>
          <div className="flex gap-1 mt-1">
            <button onClick={onEdit} className="btn-ghost !px-3 !py-1.5 text-xs">✏️</button>
            <button onClick={() => onConfirm()} className="btn-accent !px-3 !py-1.5 text-xs">✅</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-muted">{fmtDate(t.date)}</p>
          <p className="font-semibold">{t.description}</p>
        </div>
        <p className="font-bold">{fmtEUR(Number(t.amount))}</p>
      </div>

      <label className="label">Typ</label>
      <select value={type} onChange={(e) => { setType(e.target.value); setCatId(null); }} className="input mb-3">
        <option value="PRIVAT">Privat</option>
        <option value="EU_VST">EU + Vorsteuer</option>
        <option value="EU_NOVAT">EU ohne VSt</option>
        <option value="INCOME_MAA">Einnahme M&A</option>
        <option value="INCOME_EU">Einnahme EU</option>
        <option value="REFUND_MAA">M&A Erstattung (ausgelegt)</option>
      </select>

      <label className="label">Kategorie</label>
      <select value={catId ?? ''} onChange={(e) => setCatId(e.target.value || null)} className="input mb-3">
        <option value="">— keine —</option>
        {relevantCats.map((c) => (
          <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
        ))}
      </select>

      <label className="label">USt-Satz</label>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 7, 19].map((r) => (
          <button key={r} onClick={() => setVatRate(r)}
            className={cn('btn-outline !py-2 text-sm', vatRate === r && 'bg-primary-900 text-white border-primary-900')}>
            {r}%
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onEdit} className="btn-ghost flex-1">Abbrechen</button>
        <button onClick={() => onConfirm({ type, category_id: catId, vat_rate: vatRate })} className="btn-primary flex-1">
          Speichern
        </button>
      </div>
    </div>
  );
}

function typeLabel(t: string | null) {
  switch (t) {
    case 'PRIVAT': return 'Privat';
    case 'EU_VST': return 'EU + VSt';
    case 'EU_NOVAT': return 'EU o. VSt';
    case 'INCOME_MAA': return 'Einnahme M&A';
    case 'INCOME_EU': return 'Einnahme EU';
    case 'REFUND_MAA': return 'M&A ausgelegt';
    default: return '—';
  }
}
