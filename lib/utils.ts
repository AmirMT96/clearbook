import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtEUR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

export function fmtDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(date);
}

export function calcVat(gross: number, rate: number): { net: number; vat: number } {
  if (rate === 0) return { net: gross, vat: 0 };
  const net = gross / (1 + rate / 100);
  return { net: round(net), vat: round(gross - net) };
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function monthRange(offset = 0): { start: string; end: string; label: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  const label = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(d);
  return { start: iso(d), end: iso(end), label };
}
