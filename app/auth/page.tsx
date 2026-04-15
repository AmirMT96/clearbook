import Link from 'next/link';

export default function AuthWelcome() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-bg">
      <img src="/logo.svg" alt="Clearbook" className="h-10 mb-8" />
      <div className="card max-w-sm w-full text-center">
        <h1 className="text-2xl mb-2">Willkommen bei Clearbook</h1>
        <p className="text-muted text-sm mb-8">Dein persönlicher Finanz-Begleiter.</p>
        <div className="flex flex-col gap-3">
          <Link href="/auth/register" className="btn-primary w-full">Registrieren</Link>
          <Link href="/auth/login" className="btn-outline w-full">Anmelden</Link>
        </div>
      </div>
      <p className="text-xs text-muted mt-6">Für Einzelunternehmer & Angestellte in DE · AT · CH</p>
    </main>
  );
}
