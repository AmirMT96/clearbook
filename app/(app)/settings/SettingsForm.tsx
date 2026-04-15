'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BotttAvatar } from '@/components/BotttAvatar';
import { generateBotttOptions } from '@/lib/dicebear';
import { cn } from '@/lib/utils';

export function SettingsForm({ initial, email }: { initial: any; email: string }) {
  const router = useRouter();
  const [vorname, setVorname] = useState(initial?.vorname ?? '');
  const [nachname, setNachname] = useState(initial?.nachname ?? '');
  const [botttSeed, setBotttSeed] = useState(initial?.bottt_seed ?? '');
  const [botttName, setBotttName] = useState(initial?.bottt_name ?? '');
  const [options, setOptions] = useState(() => generateBotttOptions(initial?.anrede ?? 'Divers'));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({
      vorname, nachname, bottt_seed: botttSeed, bottt_name: botttName,
    }).eq('id', initial.id);
    setSaving(false);
    setMsg(error ? 'Fehler: ' + error.message : 'Gespeichert ✅');
    if (!error) router.refresh();
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth');
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold mb-4">Profil</h3>
        <label className="label">Email</label>
        <input className="input mb-3" value={email} disabled />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Vorname</label>
            <input className="input" value={vorname} onChange={(e) => setVorname(e.target.value)} />
          </div>
          <div>
            <label className="label">Nachname</label>
            <input className="input" value={nachname} onChange={(e) => setNachname(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Dein Bottt</h3>
        <div className="flex items-center gap-4 mb-4">
          <BotttAvatar seed={botttSeed} anrede={initial?.anrede} size={72} />
          <input className="input" placeholder="Name" value={botttName} onChange={(e) => setBotttName(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {options.map((b) => (
            <button key={b.seed} onClick={() => setBotttSeed(b.seed)}
              className={cn('rounded-xl border-2 p-1', botttSeed === b.seed ? 'border-primary-900' : 'border-transparent hover:border-border')}>
              <BotttAvatar seed={b.seed} anrede={initial?.anrede} size={64} />
            </button>
          ))}
        </div>
        <button onClick={() => setOptions(generateBotttOptions(initial?.anrede ?? 'Divers'))} className="btn-ghost w-full">
          🔄 Neue generieren
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? '…' : 'Speichern'}</button>
        <button onClick={logout} className="btn-outline">Logout</button>
      </div>
      {msg && <p className="text-sm text-muted text-center">{msg}</p>}
    </div>
  );
}
