'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PIN_LENGTH = 4;

type Stage = 'enter' | 'setup' | 'confirm';

export default function PinPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [stage, setStage] = useState<Stage>('enter');
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  // Check if user has a PIN set up
  useEffect(() => {
    async function checkPin() {
      try {
        // Try to verify with a dummy pin to see if PIN exists
        const res = await fetch('/api/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', pin: '0000' }),
        });
        const data = await res.json();
        if (res.status === 400 && data.error === 'Kein PIN eingerichtet') {
          setHasPin(false);
          setStage('setup');
        } else {
          setHasPin(true);
          setStage('enter');
        }
      } catch {
        setHasPin(true);
        setStage('enter');
      } finally {
        setLoading(false);
      }
    }
    checkPin();
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= PIN_LENGTH) return;
      const next = pin + digit;
      setPin(next);
      setError('');

      if (next.length === PIN_LENGTH) {
        // Auto-submit when 4 digits entered
        setTimeout(() => handleSubmit(next), 150);
      }
    },
    [pin, stage, firstPin]
  );

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
    setError('');
  }, []);

  const handleSubmit = async (currentPin: string) => {
    if (currentPin.length !== PIN_LENGTH) return;

    if (stage === 'setup') {
      // First entry during setup
      setFirstPin(currentPin);
      setPin('');
      setStage('confirm');
      return;
    }

    if (stage === 'confirm') {
      // Confirm step during setup
      if (currentPin !== firstPin) {
        setError('PINs stimmen nicht ueberein');
        triggerShake();
        setPin('');
        return;
      }
      // Save the PIN
      setLoading(true);
      try {
        const res = await fetch('/api/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'setup', pin: currentPin }),
        });
        if (res.ok) {
          sessionStorage.setItem('clearbook_pin_verified', 'true');
          router.replace('/dashboard');
        } else {
          setError('Fehler beim Speichern');
          setPin('');
        }
      } catch {
        setError('Verbindungsfehler');
        setPin('');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Stage === 'enter' — verify existing PIN
    setLoading(true);
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin: currentPin }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem('clearbook_pin_verified', 'true');
        router.replace('/dashboard');
      } else {
        setError('Falscher PIN');
        triggerShake();
        setPin('');
      }
    } catch {
      setError('Verbindungsfehler');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const title =
    stage === 'setup'
      ? 'PIN einrichten'
      : stage === 'confirm'
        ? 'PIN bestaetigen'
        : 'PIN eingeben';

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4" style={{ background: '#001e40' }}>
      {/* Logo */}
      <img
        src="/logo.png?v=3"
        alt="Clearbook"
        className="h-12 w-auto mb-10 opacity-90"
        draggable={false}
      />

      {/* Title */}
      <h1 className="text-white text-xl font-semibold tracking-wide mb-8">{title}</h1>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-3 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full border-2 border-white/50 transition-all duration-150"
            style={{
              backgroundColor: i < pin.length ? '#5de6c8' : 'transparent',
              borderColor: i < pin.length ? '#5de6c8' : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </div>

      {/* Error message */}
      <div className="h-6 mb-4">
        {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {digits.map((d, i) => {
          if (d === '') {
            return <div key={i} />;
          }
          if (d === 'back') {
            return (
              <button
                key={i}
                onClick={handleBackspace}
                disabled={loading}
                className="h-16 rounded-2xl flex items-center justify-center text-white/70 hover:bg-white/10 active:bg-white/15 transition-colors disabled:opacity-40"
                aria-label="Loeschen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                >
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={loading || pin.length >= PIN_LENGTH}
              className="h-16 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-2xl font-medium transition-colors disabled:opacity-40"
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Shake animation style */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
