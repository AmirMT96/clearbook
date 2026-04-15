'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BotttAvatar } from './BotttAvatar';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/explorer', label: 'Explorer', icon: '🔍' },
  { href: '/review', label: 'Review', icon: '⚠️' },
  { href: '/export', label: 'Export', icon: '📤' },
];

export function Sidebar({ botttSeed, botttName, anrede }: { botttSeed?: string; botttName?: string; anrede?: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 bg-surface border-r border-border px-5 py-6 gap-2">
      <Link href="/dashboard" className="mb-6">
        <img src="/logo.svg" alt="Clearbook" className="h-8" />
      </Link>
      <nav className="flex flex-col gap-1 flex-1">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active ? 'bg-primary-900 text-white' : 'text-primary-900 hover:bg-primary-50'
              )}
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            pathname.startsWith('/settings') ? 'bg-primary-900 text-white' : 'text-primary-900 hover:bg-primary-50'
          )}
        >
          <span>⚙️</span>
          <span>Einstellungen</span>
        </Link>
      </nav>
      {botttSeed && (
        <div className="mt-auto flex items-center gap-3 rounded-xl p-3 bg-bg">
          <BotttAvatar seed={botttSeed} anrede={anrede} size={40} />
          <div className="text-sm">
            <div className="font-semibold">{botttName ?? 'Bottt'}</div>
            <div className="text-xs text-muted">dein Clearbooker</div>
          </div>
        </div>
      )}
    </aside>
  );
}

export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border z-40 flex items-center justify-around"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {items.slice(0, 2).map((it) => {
        const active = pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href}
            className={cn('flex flex-col items-center gap-0.5 py-2 px-4 text-xs', active ? 'text-primary-900' : 'text-muted')}>
            <span className="text-lg">{it.icon}</span>
            <span>{it.label}</span>
          </Link>
        );
      })}
      <button
        onClick={onQuickAdd}
        aria-label="Schnelleingabe"
        className="bg-primary-900 text-white rounded-full w-14 h-14 -mt-6 shadow-lifted flex items-center justify-center text-2xl font-bold"
      >
        ＋
      </button>
      {items.slice(2).map((it) => {
        const active = pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href}
            className={cn('flex flex-col items-center gap-0.5 py-2 px-4 text-xs', active ? 'text-primary-900' : 'text-muted')}>
            <span className="text-lg">{it.icon}</span>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
