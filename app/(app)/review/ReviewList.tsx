'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fmtEUR, fmtDate, calcVat, cn } from '@/lib/utils';
import { TransactionEditor, type TxForEdit, type Cat } from '@/components/TransactionEditor';

type Tx = {
  id: string; date: string; description: string; amount: number;
  type: string | null; vat_rate: number | null; category_id: string | null; is_auto_booked: boolean;
};

export function ReviewList({ txs, categories }: { txs: Tx[]; categories: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TxForEdit | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmOne(t: Tx) {
    const supabase = createClient();
    const rate = t.vat_rate ?? 19;
    const { net, vat } = calcVat(Number(t.amount), rate);
    await supabase
      .from('transactions')
      .update({
        status: 'gebucht',
        type: t.type ?? 'PRIVAT',
        vat_rate: rate,
        vat_amount: vat,
        net_amount: net,
        category_id: t.category_id,
      })
      .eq('id', t.id);
  }

  async function confirmAll() {
    setBusy(true);
    for (const t of txs) await confirmOne(t);
    router.refresh();
    setBusy(false);
  }

  async function confirmSingle(t: Tx) {
    setBusy(true);
    await confirmOne(t);
    router.refresh();
    setBusy(false);
  }

  return (
    <div>
      <ul className="space-y-2 mb-6">
        {txs.map((t) => {
          const cat = categories.find((c) => c.id === t.category_id);
          return (
            <li key={t.id} className="card">
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
                    <button onClick={() => setEditing(t as TxForEdit)} className="btn-ghost !px-3 !py-1.5 text-xs" aria-label="Bearbeiten">✏️</button>
                    <button onClick={() => confirmSingle(t)} disabled={busy} className="btn-accent !px-3 !py-1.5 text-xs" aria-label="Bestätigen">✅</button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {txs.length > 0 && (
        <button onClick={confirmAll} disabled={busy} className="btn-primary w-full py-4 text-base">
          {busy ? '…' : `✅ Alle bestätigen (${txs.length})`}
        </button>
      )}

      {editing && (
        <TransactionEditor
          tx={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          confirmOnSave
        />
      )}
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
