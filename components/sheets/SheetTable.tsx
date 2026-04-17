'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { cn, fmtEUR, monthRange } from '@/lib/utils';

/* ── Column definition ──────────────────────────────────────── */
export type ColumnDef<T> = {
  key: string;
  header: string;
  width?: string;            // tailwind width class, e.g. 'w-28'
  type?: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'computed' | 'currency';
  options?: { value: string; label: string }[];
  editable?: boolean;
  getValue?: (row: T) => string | number | boolean;
  formatDisplay?: (row: T) => string;
};

export type SheetTableProps<T extends { id: string; status?: string }> = {
  columns: ColumnDef<T>[];
  data: T[];
  onUpdate: (id: string, field: string, value: string | number | boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: () => Promise<void>;
  monthOffset: number;
  onMonthChange: (offset: number) => void;
  monthLabel: string;
  loading?: boolean;
  caption?: ReactNode;
};

/* ── Component ──────────────────────────────────────────────── */
export function SheetTable<T extends { id: string; status?: string }>({
  columns,
  data,
  onUpdate,
  onDelete,
  onAdd,
  monthOffset,
  onMonthChange,
  monthLabel,
  loading,
  caption,
}: SheetTableProps<T>) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editingCell]);

  const startEdit = useCallback((rowId: string, col: ColumnDef<T>, row: T) => {
    if (col.editable === false || col.type === 'computed') return;
    const val = col.getValue ? col.getValue(row) : (row as any)[col.key];
    setEditingCell({ rowId, colKey: col.key });
    setEditValue(String(val ?? ''));
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingCell) return;
    setBusy(true);
    const col = columns.find((c) => c.key === editingCell.colKey);
    let parsedValue: string | number | boolean = editValue;
    if (col?.type === 'number' || col?.type === 'currency') {
      parsedValue = parseFloat(editValue.replace(',', '.'));
      if (Number.isNaN(parsedValue)) { setBusy(false); return; }
    } else if (col?.type === 'checkbox') {
      parsedValue = editValue === 'true';
    }
    await onUpdate(editingCell.rowId, editingCell.colKey, parsedValue);
    setEditingCell(null);
    setEditValue('');
    setBusy(false);
  }, [editingCell, editValue, columns, onUpdate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        if (e.key === 'Tab' && editingCell) {
          const colIdx = columns.findIndex((c) => c.key === editingCell.colKey);
          const rowIdx = data.findIndex((r) => r.id === editingCell.rowId);
          // find next editable column
          let nextCol = colIdx + 1;
          let nextRow = rowIdx;
          while (nextCol < columns.length && (columns[nextCol].editable === false || columns[nextCol].type === 'computed')) nextCol++;
          if (nextCol >= columns.length) {
            nextCol = columns.findIndex((c) => c.editable !== false && c.type !== 'computed');
            nextRow = rowIdx + 1;
          }
          if (nextRow < data.length && nextCol >= 0) {
            const r = data[nextRow];
            const c = columns[nextCol];
            setTimeout(() => startEdit(r.id, c, r), 0);
          }
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
      }
    },
    [commitEdit, editingCell, columns, data, startEdit],
  );

  const renderCell = (row: T, col: ColumnDef<T>, rowIdx: number) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
    const rawVal = col.getValue ? col.getValue(row) : (row as any)[col.key];

    /* ── Checkbox ──────────────────────── */
    if (col.type === 'checkbox') {
      return (
        <td key={col.key} className={cn('px-2 py-1.5 text-center', col.width)}>
          <input
            type="checkbox"
            checked={!!rawVal}
            onChange={async (e) => {
              await onUpdate(row.id, col.key, e.target.checked);
            }}
            className="w-4 h-4 rounded border-border text-accent-500 focus:ring-accent-500 cursor-pointer"
          />
        </td>
      );
    }

    /* ── Editing mode ─────────────────── */
    if (isEditing) {
      if (col.type === 'select' && col.options) {
        return (
          <td key={col.key} className={cn('px-1 py-0.5', col.width)}>
            <select
              ref={(el) => { inputRef.current = el; }}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                // auto-commit for selects
                setTimeout(async () => {
                  await onUpdate(row.id, col.key, e.target.value);
                  setEditingCell(null);
                  setEditValue('');
                }, 0);
              }}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="w-full rounded border border-primary-100 bg-surface px-2 py-1 text-xs outline-none focus:border-primary-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            >
              {col.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </td>
        );
      }
      return (
        <td key={col.key} className={cn('px-1 py-0.5', col.width)}>
          <input
            ref={(el) => { inputRef.current = el; }}
            type={col.type === 'date' ? 'date' : col.type === 'number' || col.type === 'currency' ? 'text' : 'text'}
            inputMode={col.type === 'number' || col.type === 'currency' ? 'decimal' : undefined}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-primary-100 bg-surface px-2 py-1 text-xs outline-none focus:border-primary-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          />
        </td>
      );
    }

    /* ── Display mode ─────────────────── */
    const display = col.formatDisplay
      ? col.formatDisplay(row)
      : col.type === 'currency'
        ? fmtEUR(rawVal as number)
        : col.type === 'date' && rawVal
          ? new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(rawVal as string))
          : String(rawVal ?? '');

    const isClickable = col.editable !== false && col.type !== 'computed';

    return (
      <td
        key={col.key}
        className={cn(
          'px-2 py-1.5 text-xs whitespace-nowrap',
          col.width,
          col.type === 'currency' || col.type === 'number' ? 'text-right tabular-nums' : '',
          isClickable && 'cursor-pointer hover:bg-primary-50/50 dark:hover:bg-gray-700/50',
        )}
        onClick={() => isClickable && startEdit(row.id, col, row)}
      >
        {display}
      </td>
    );
  };

  return (
    <div>
      {/* ── Month nav ──────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onMonthChange(monthOffset - 1)}
            className="btn-ghost !px-3 !py-1.5 text-sm"
            aria-label="Vorheriger Monat"
          >
            &larr;
          </button>
          <span className="text-sm font-semibold text-primary-900 dark:text-gray-100 min-w-[140px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => onMonthChange(monthOffset + 1)}
            className="btn-ghost !px-3 !py-1.5 text-sm"
            aria-label="Naechster Monat"
          >
            &rarr;
          </button>
        </div>
        <button
          onClick={onAdd}
          disabled={busy || loading}
          className="btn-primary !px-4 !py-1.5 text-sm"
        >
          + Neu
        </button>
      </div>

      {/* ── Table ──────────────────────── */}
      <div className="card !p-0 overflow-x-auto dark:bg-gray-800">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border dark:border-gray-700">
              <th className="px-2 py-2 text-xs font-semibold text-muted w-8">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-2 py-2 text-xs font-semibold text-muted uppercase tracking-wide',
                    col.width,
                    (col.type === 'currency' || col.type === 'number') && 'text-right',
                  )}
                >
                  {col.header}
                </th>
              ))}
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-muted">
                  Laden...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-muted">
                  Keine Eintraege
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border/50 dark:border-gray-700/50 hover:bg-bg/50 dark:hover:bg-gray-700/30 transition-colors',
                    row.status === 'ungefasst' && 'bg-amber-50/40 dark:bg-amber-900/10',
                  )}
                >
                  <td className="px-2 py-1.5 text-xs text-muted relative">
                    {row.status === 'ungefasst' && (
                      <span className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                    <span className="pl-2">{idx + 1}</span>
                  </td>
                  {columns.map((col) => renderCell(row, col, idx))}
                  <td className="px-1 py-1.5">
                    <button
                      onClick={() => onDelete(row.id)}
                      className="text-muted hover:text-red-600 transition p-1 rounded"
                      aria-label="Loeschen"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Caption / summary ──────────── */}
      {caption && <div className="mt-4">{caption}</div>}
    </div>
  );
}
