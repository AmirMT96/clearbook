'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BotttAvatar } from './BotttAvatar';

/* ── SVG Icons (no emoji) ─────────────────────────── */

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="8" rx="1.5" />
      <rect x="11" y="2" width="7" height="5" rx="1.5" />
      <rect x="2" y="12" width="7" height="6" rx="1.5" />
      <rect x="11" y="9" width="7" height="9" rx="1.5" />
    </svg>
  );
}

function IconSheets({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="16" height="16" rx="2" />
      <line x1="2" y1="7" x2="18" y2="7" />
      <line x1="2" y1="12" x2="18" y2="12" />
      <line x1="8" y1="7" x2="8" y2="18" />
    </svg>
  );
}

function IconExport({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10l4 -5 4 5" />
      <line x1="10" y1="5" x2="10" y2="15" />
      <path d="M3 15v1a2 2 0 002 2h10a2 2 0 002-2v-1" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 1.5v2M10 16.5v2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M1.5 10h2M16.5 10h2M3.4 16.6l1.4-1.4M15.2 4.8l1.4-1.4" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ── Nav Items ───────────────────────────────────── */

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/sheets', label: 'Sheets', Icon: IconSheets },
  // FAB is between these
  { href: '/export', label: 'Export', Icon: IconExport },
  { href: '/settings', label: 'Settings', Icon: IconSettings },
];

/* ── Desktop Sidebar ─────────────────────────────── */

export function Sidebar({ botttSeed, botttName, anrede }: { botttSeed?: string; botttName?: string; anrede?: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 bg-surface dark:bg-dark-surface border-r border-border dark:border-dark-border px-5 py-6 gap-2">
      <Link href="/dashboard" className="mb-6 inline-block">
        <img src="/logo.png?v=3" alt="Clearbook" width={203} height={60} className="h-9 w-auto dark:brightness-0 dark:invert" />
      </Link>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-primary-900 text-white dark:bg-accent dark:text-primary-900'
                  : 'text-primary-900 dark:text-dark-text hover:bg-primary-50 dark:hover:bg-dark-border/40'
              )}
            >
              <it.Icon className="shrink-0" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      {botttSeed && (
        <div className="mt-auto flex items-center gap-3 rounded-xl p-3 bg-bg dark:bg-dark-surface">
          <BotttAvatar seed={botttSeed} anrede={anrede} size={40} />
          <div className="text-sm">
            <div className="font-semibold dark:text-dark-text">{botttName ?? 'Bottt'}</div>
            <div className="text-xs text-muted">dein Clearbooker</div>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ── Mobile Top Bar ──────────────────────────────── */

export function MobileTopBar({ botttSeed, anrede }: { botttSeed?: string; anrede?: string }) {
  return (
    <header className="md:hidden sticky top-0 z-30 bg-surface/80 dark:bg-dark-surface/80 backdrop-blur border-b border-border dark:border-dark-border px-4 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="inline-block">
        <img src="/logo.png?v=3" alt="Clearbook" width={108} height={32} className="h-8 w-auto dark:brightness-0 dark:invert" />
      </Link>
      {botttSeed && (
        <Link href="/settings"><BotttAvatar seed={botttSeed} anrede={anrede} size={32} /></Link>
      )}
    </header>
  );
}

/* ── Mobile Bottom Nav ───────────────────────────── */

export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const pathname = usePathname();
  const left = navItems.slice(0, 2);
  const right = navItems.slice(2);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-surface dark:bg-dark-surface border-t border-border dark:border-dark-border z-40 flex items-center justify-around"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {left.map((it) => {
        const active = pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href}
            className={cn('flex flex-col items-center gap-0.5 py-2 px-4 text-xs', active ? 'text-primary-900 dark:text-accent' : 'text-muted')}>
            <it.Icon />
            <span>{it.label}</span>
          </Link>
        );
      })}

      <button
        onClick={onQuickAdd}
        aria-label="Hinzufuegen"
        className="bg-primary-900 dark:bg-accent text-white dark:text-primary-900 rounded-full w-14 h-14 -mt-6 shadow-lifted flex items-center justify-center"
      >
        <IconPlus />
      </button>

      {right.map((it) => {
        const active = pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href}
            className={cn('flex flex-col items-center gap-0.5 py-2 px-4 text-xs', active ? 'text-primary-900 dark:text-accent' : 'text-muted')}>
            <it.Icon />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
