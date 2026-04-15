'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }
    router.push('/dashboard');
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-bg">
      <img src="/logo.svg" alt="Clearbook" width={194} height={70} className="h-10 md:h-12 w-auto mb-8" />
      <form onSubmit={submit} className="card max-w-sm w-full">
        <h1 className="text-xl mb-4">Anmelden</h1>
        <label className="label">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input mb-4" />
        <label className="label">Passwort</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input mb-4" />
        {err && <p className="text-xs text-red-600 mb-3">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? '…' : 'Anmelden'}</button>
        <p className="text-sm text-muted text-center mt-4">
          Noch kein Konto? <Link href="/auth/register" className="text-primary-900 font-semibold">Registrieren</Link>
        </p>
      </form>
    </main>
  );
}
