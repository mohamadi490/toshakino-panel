/** API sends ISO-8601 UTC; UI shows the Jalali calendar in Tehran time. */
const TZ = 'Asia/Tehran';

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatJalaliDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    dateStyle: 'medium',
    timeZone: TZ,
  }).format(d);
}

export function formatJalaliDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TZ,
  }).format(d);
}
