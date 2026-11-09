/** Canonical money unit is integer Rial (IRR). Toman = Rial / 10 (integer division). */
export type CurrencyUnit = 'toman' | 'rial';

export function rialToToman(rial: number): number {
  return Math.trunc(rial / 10);
}

export function tomanToRial(toman: number): number {
  return Math.trunc(toman) * 10;
}

export function formatMoney(rial: number | null | undefined, unit: CurrencyUnit = 'toman'): string {
  if (rial === null || rial === undefined || !Number.isFinite(rial)) return '—';
  const value = unit === 'toman' ? rialToToman(rial) : Math.trunc(rial);
  const digits = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(value);
  return `${digits} ${unit === 'toman' ? 'تومان' : 'ریال'}`;
}
