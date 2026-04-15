'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BotttAvatar } from '@/components/BotttAvatar';
import { generateBotttOptions, type Anrede } from '@/lib/dicebear';
import { cn } from '@/lib/utils';

type ProfilType = 'ANGESTELLT' | 'EINZELUNTERNEHMEN' | 'BEIDES' | 'GMBH';
type Land = 'DE' | 'AT' | 'CH';

export default function RegisterWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [anrede, setAnrede] = useState<Anrede>('Herr');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');

  const [profilType, setProfilType] = useState<ProfilType>('BEIDES');
  const [land, setLand] = useState<Land>('DE');
  const [ustPflichtig, setUstPflichtig] = useState(true);

  const [botttOptions, setBotttOptions] = useState(() => generateBotttOptions('Herr'));
  const [botttSeed, setBotttSeed] = useState(botttOptions[0].seed);
  const [botttName, setBotttName] = useState('');

  const [waitingEmail, setWaitingEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canStep2 = vorname && nachname && email && password && password === passwordRepeat && password.length >= 8;
  const canSubmit = botttSeed && botttName.trim().length > 0;

  function regenerateBottts() {
    const opts = generateBotttOptions(anrede);
    setBotttOptions(opts);
    setBotttSeed(opts[0].seed);
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          anrede, vorname, nachname,
          profil_type: profilType, land, ust_pflichtig: ustPflichtig,
          bottt_seed: botttSeed, bottt_name: botttName.trim(),
        },
      },
    });

    if (error) { setErr(error.message); setBusy(false); return; }

    // Create profile row (RLS requires authenticated user — this works if signUp returned a session,
    // otherwise the callback will create it after email confirmation)
    if (data.user && data.session) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        vorname, nachname, anrede,
        profil_type: profilType,
        land, ust_pflichtig: ustPflichtig,
        bottt_seed: botttSeed, bottt_name: botttName.trim(),
      });
      await supabase.rpc('insert_default_categories', {
        p_user_id: data.user.id,
        p_profil_type: profilType,
      });
    }

    setWaitingEmail(email);
    setStep(5);
    setBusy(false);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-bg">
      <Link href="/auth" className="mb-6 inline-block"><img src="/logo.png" alt="Clearbook" width={237} height={70} className="h-11 md:h-14 w-auto" /></Link>
      <div className="card max-w-md w-full">
        {/* progress */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={cn('h-1 flex-1 rounded-full', s <= step ? 'bg-primary-900' : 'bg-border')} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-xl mb-1">Dein Konto</h2>
            <p className="text-sm text-muted mb-5">Wie dürfen wir dich ansprechen?</p>

            <label className="label">Anrede</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['Herr', 'Frau', 'Divers'] as Anrede[]).map((a) => (
                <button key={a} type="button"
                  onClick={() => { setAnrede(a); setBotttOptions(generateBotttOptions(a)); }}
                  className={cn('btn-outline', anrede === a && 'bg-primary-900 text-white border-primary-900')}>
                  {a}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Vorname</label>
                <input className="input" value={vorname} onChange={(e) => setVorname(e.target.value)} />
              </div>
              <div>
                <label className="label">Nachname</label>
                <input className="input" value={nachname} onChange={(e) => setNachname(e.target.value)} />
              </div>
            </div>

            <label className="label">Email</label>
            <input type="email" className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="label">Passwort (min. 8 Zeichen)</label>
            <input type="password" className="input mb-3" value={password} onChange={(e) => setPassword(e.target.value)} />

            <label className="label">Passwort wiederholen</label>
            <input type="password" className="input mb-5" value={passwordRepeat} onChange={(e) => setPasswordRepeat(e.target.value)} />

            <button onClick={() => setStep(2)} disabled={!canStep2} className="btn-primary w-full">Weiter</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl mb-1">Ich bin…</h2>
            <p className="text-sm text-muted mb-5">So stellen wir dir die passenden Kategorien bereit.</p>

            <div className="flex flex-col gap-2 mb-5">
              {[
                { v: 'ANGESTELLT', l: 'Nur Angestellter' },
                { v: 'EINZELUNTERNEHMEN', l: 'Nur Einzelunternehmer' },
                { v: 'BEIDES', l: 'Angestellter + Einzelunternehmer' },
                { v: 'GMBH', l: 'GmbH / Andere' },
              ].map((opt) => (
                <button key={opt.v} type="button"
                  onClick={() => setProfilType(opt.v as ProfilType)}
                  className={cn('text-left rounded-xl border px-4 py-3 text-sm font-medium transition',
                    profilType === opt.v ? 'bg-primary-900 text-white border-primary-900' : 'border-border hover:bg-primary-50')}>
                  {opt.l}
                </button>
              ))}
            </div>

            {profilType === 'GMBH' && (
              <div className="rounded-xl bg-accent-50 p-4 text-sm mb-5">
                Coming Soon 🚀 — GmbH Unterstützung ist noch in Arbeit. Du kannst dich gerne trotzdem registrieren und wir benachrichtigen dich.
              </div>
            )}

            <label className="label">Land</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['DE', 'AT', 'CH'] as Land[]).map((l) => (
                <button key={l} type="button"
                  onClick={() => setLand(l)}
                  className={cn('btn-outline', land === l && 'bg-primary-900 text-white border-primary-900')}>
                  {l === 'DE' ? '🇩🇪 DE' : l === 'AT' ? '🇦🇹 AT' : '🇨🇭 CH'}
                </button>
              ))}
            </div>

            <label className="label">USt-pflichtig?</label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button type="button" onClick={() => setUstPflichtig(true)}
                className={cn('btn-outline', ustPflichtig && 'bg-primary-900 text-white border-primary-900')}>Ja</button>
              <button type="button" onClick={() => setUstPflichtig(false)}
                className={cn('btn-outline', !ustPflichtig && 'bg-primary-900 text-white border-primary-900')}>Nein (Kleinunternehmer)</button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">Zurück</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">Weiter</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl mb-1">Wähle deinen Clearbooker!</h2>
            <p className="text-sm text-muted mb-5">Jeder braucht einen guten Buchhalter — deiner ist aus Stahl. 🤖</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {botttOptions.map((b) => (
                <button key={b.seed} type="button" onClick={() => setBotttSeed(b.seed)}
                  className={cn('rounded-2xl border-2 p-1 transition',
                    botttSeed === b.seed ? 'border-primary-900' : 'border-transparent hover:border-border')}>
                  <BotttAvatar seed={b.seed} anrede={anrede} size={80} />
                </button>
              ))}
            </div>
            <button type="button" onClick={regenerateBottts} className="btn-ghost w-full mb-5">🔄 Neue generieren</button>

            <label className="label">Name deines Bottt</label>
            <input className="input mb-6" placeholder="z.B. Karl" value={botttName} onChange={(e) => setBotttName(e.target.value)} />

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="btn-ghost flex-1">Zurück</button>
              <button onClick={() => setStep(4)} disabled={!canSubmit} className="btn-primary flex-1">Weiter</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl mb-1">Bereit?</h2>
            <p className="text-sm text-muted mb-5">Wir legen für dich die wichtigsten Kategorien automatisch an. Wiederkehrende Buchungen kannst du später in den Einstellungen verwalten.</p>

            <div className="rounded-xl bg-bg p-4 mb-5 flex items-center gap-4">
              <BotttAvatar seed={botttSeed} anrede={anrede} size={64} />
              <div className="text-sm">
                <div className="font-semibold">{botttName || 'Dein Bottt'}</div>
                <div className="text-muted">freut sich darauf, mit dir zu arbeiten.</div>
              </div>
            </div>

            {err && <p className="text-xs text-red-600 mb-3">{err}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep(3)} className="btn-ghost flex-1">Zurück</button>
              <button onClick={submit} disabled={busy} className="btn-primary flex-1">{busy ? '…' : 'Registrieren'}</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-5">
              <BotttAvatar seed={botttSeed} anrede={anrede} size={112} />
            </div>
            <h2 className="text-xl mb-2">Fast geschafft, {anrede} {nachname}!</h2>
            <p className="text-sm text-muted mb-4">Wir haben dir eine Email an <span className="font-medium">{waitingEmail}</span> geschickt.</p>
            <p className="text-sm text-muted mb-6">{botttName || 'Dein Bottt'} wartet auf dich — bitte bestätige deine Adresse.</p>
            <button onClick={() => router.push('/auth/login')} className="btn-outline w-full">Zurück zum Login</button>
          </div>
        )}
      </div>
    </main>
  );
}
