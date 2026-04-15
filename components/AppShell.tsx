'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, BottomNav } from './Nav';
import { QuickInput } from './QuickInput';

export function AppShell({
  children,
  botttSeed,
  botttName,
  anrede,
}: {
  children: React.ReactNode;
  botttSeed?: string;
  botttName?: string;
  anrede?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-dvh">
      <Sidebar botttSeed={botttSeed} botttName={botttName} anrede={anrede} />
      <div className="md:pl-64">
        <main className="pb-24 md:pb-8">{children}</main>
      </div>
      <BottomNav onQuickAdd={() => setOpen(true)} />
      <button
        onClick={() => setOpen(true)}
        aria-label="Schnelleingabe"
        className="hidden md:flex fixed bottom-6 right-6 bg-primary-900 text-white rounded-full w-14 h-14 shadow-lifted items-center justify-center text-2xl z-30 hover:bg-primary-500"
      >
        ＋
      </button>
      <QuickInput open={open} onClose={() => setOpen(false)} onSaved={() => router.refresh()} />
    </div>
  );
}
