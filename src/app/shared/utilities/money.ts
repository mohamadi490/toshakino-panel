import { normalizeDigits } from './digits';

/** The API sends money as integer **Toman**; the UI shows and edits Toman directly (no conversion). */
export function formatMoney(toman: number | null | undefined): string {
  if (toman === null || toman === undefined || !Number.isFinite(toman)) return '—';
  const digits = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
    Math.trunc(toman),
  );
  return `${digits} تومان`;
}

/**
 * Parses a user-typed Toman amount (Persian/Latin digits, optional thousand separators)
 * into a non-negative integer, or null when it is not a plain whole number.
 */
export function parseTomanInput(value: string): number | null {
  const cleaned = normalizeDigits(value).replace(/[,٬\s]/g, '');
  if (!/^\d{1,13}$/.test(cleaned)) return null;
  return Number(cleaned);
}
