import Link from 'next/link';

export default function AuthWelcome() {
  return (
    <main className="min-h-dvh flex flex-col bg-gradient-to-b from-bg to-accent-50">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <img
          src="/logo.png?v=3"
          alt="Clearbook"
          width={339}
          height={100}
          className="h-14 md:h-20 w-auto mb-10"
        />

        <div className="card max-w-sm w-full text-center shadow-lifted">
          <h1 className="text-2xl md:text-3xl mb-2">Willkommen bei Clearbook</h1>
          <p className="text-muted text-sm md:text-base mb-8">
            Dein persönlicher Finanz-Begleiter.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/auth/register" className="btn-primary w-full">Registrieren</Link>
            <Link href="/auth/login" className="btn-outline w-full">Anmelden</Link>
          </div>
        </div>

        <p className="text-xs text-muted mt-8 text-center">
          Für Einzelunternehmer & Angestellte in 🇩🇪 DE · 🇦🇹 AT · 🇨🇭 CH
        </p>
      </div>
    </main>
  );
}
