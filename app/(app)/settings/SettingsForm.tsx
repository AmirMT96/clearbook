'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BotttAvatar } from '@/components/BotttAvatar';
import { generateBotttOptions } from '@/lib/dicebear';
import { cn, fmtEUR } from '@/lib/utils';

export function SettingsForm({ initial, email }: { initial: any; email: string }) {
  const router = useRouter();
  const [vorname, setVorname] = useState(initial?.vorname ?? '');
  const [nachname, setNachname] = useState(initial?.nachname ?? '');
  const [botttSeed, setBotttSeed] = useState(initial?.bottt_seed ?? '');
  const [botttName, setBotttName] = useState(initial?.bottt_name ?? '');
  const [options, setOptions] = useState(() => generateBotttOptions(initial?.anrede ?? 'Divers'));
  const [darkMode, setDarkMode] = useState(initial?.dark_mode ?? false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // PIN change
  const [showPinChange, setShowPinChange] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  // Recurring templates
  const [recurring, setRecurring] = useState<any[]>([]);

  useEffect(() => {
    loadRecurring();
  }, []);

  async function loadRecurring() {
    const supabase = createClient();
    const { data } = await supabase
      .from('recurring_templates')
      .select('id, description, amount, day_of_month, is_active')
      .eq('user_id', initial.id)
      .order('day_of_month');
    setRecurring(data ?? []);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({
      vorname, nachname, bottt_seed: botttSeed, bottt_name: botttName, dark_mode: darkMode,
    }).eq('id', initial.id);
    setSaving(false);
    setMsg(error ? 'Fehler: ' + error.message : 'Gespeichert');
    if (!error) router.refresh();
  }

  async function changePin() {
    setPinMsg(null);
    const res = await fetch('/api/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change', pin: newPin, oldPin }),
    });
    const data = await res.json();
    if (data.error) { setPinMsg(data.error); return; }
    setPinMsg('PIN geaendert');
    setOldPin('');
    setNewPin('');
    setShowPinChange(false);
  }

  async function deleteRecurring(id: string) {
    const supabase = createClient();
    await supabase.from('recurring_templates').delete().eq('id', id);
    loadRecurring();
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    sessionStorage.removeItem('clearbook_pin_verified');
    router.push('/auth');
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="card">
        <h3 className="font-semibold mb-4 dark:text-white">Profil</h3>
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

      {/* Bottt */}
      <div className="card">
        <h3 className="font-semibold mb-4 dark:text-white">Dein Bottt</h3>
        <div className="flex items-center gap-4 mb-4">
          <BotttAvatar seed={botttSeed} anrede={initial?.anrede} size={72} />
          <input className="input" placeholder="Name" value={botttName} onChange={(e) => setBotttName(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {options.map((b) => (
            <button key={b.seed} onClick={() => setBotttSeed(b.seed)}
              className={cn('rounded-xl border-2 p-1', botttSeed === b.seed ? 'border-primary-900 dark:border-accent' : 'border-transparent hover:border-border')}>
              <BotttAvatar seed={b.seed} anrede={initial?.anrede} size={64} />
            </button>
          ))}
        </div>
        <button onClick={() => setOptions(generateBotttOptions(initial?.anrede ?? 'Divers'))} className="btn-ghost w-full text-sm">
          Neue generieren
        </button>
      </div>

      {/* PIN */}
      <div className="card">
        <h3 className="font-semibold mb-4 dark:text-white">PIN</h3>
        {!showPinChange ? (
          <button onClick={() => setShowPinChange(true)} className="btn-outline w-full">PIN aendern</button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Aktuelle PIN</label>
              <input type="password" inputMode="numeric" maxLength={4} className="input" value={oldPin} onChange={(e) => setOldPin(e.target.value)} />
            </div>
            <div>
              <label className="label">Neue PIN (4 Stellen)</label>
              <input type="password" inputMode="numeric" maxLength={4} className="input" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
            </div>
            {pinMsg && <p className="text-xs text-red-600 dark:text-red-400">{pinMsg}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowPinChange(false)} className="btn-ghost flex-1">Abbrechen</button>
              <button onClick={changePin} disabled={newPin.length !== 4 || oldPin.length !== 4} className="btn-primary flex-1">Speichern</button>
            </div>
          </div>
        )}
      </div>

      {/* Dark Mode */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold dark:text-white">Dark Mode</h3>
            <p className="text-xs text-muted mt-0.5">Dunkles Farbschema</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              'relative w-12 h-7 rounded-full transition',
              darkMode ? 'bg-accent' : 'bg-border'
            )}
          >
            <span className={cn(
              'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
              darkMode ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>
      </div>

      {/* Recurring */}
      <div className="card">
        <h3 className="font-semibold mb-4 dark:text-white">Wiederkehrende Eintraege</h3>
        {recurring.length === 0 ? (
          <p className="text-sm text-muted">Keine wiederkehrenden Eintraege. Nutze den Suffix "rec" beim Hinzufuegen.</p>
        ) : (
          <ul className="space-y-2">
            {recurring.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-bg dark:bg-gray-700">
                <div>
                  <p className="text-sm font-medium dark:text-white">{r.description}</p>
                  <p className="text-xs text-muted">{fmtEUR(Number(r.amount))} am {r.day_of_month}. des Monats</p>
                </div>
                <button onClick={() => deleteRecurring(r.id)} className="text-red-500 hover:text-red-700 text-sm p-1">x</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? '...' : 'Speichern'}</button>
        <button onClick={logout} className="btn-outline">Logout</button>
      </div>
      {msg && <p className="text-sm text-muted text-center">{msg}</p>}
    </div>
  );
}
