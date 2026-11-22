/** Normalised text from an input: trimmed; empty means "no value". */
export function blankToNull(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  return v === '' ? null : v;
}

/** Integer in [min, max] from a typed value (Persian digits allowed), or null when invalid/empty. */
export function parseBoundedInt(value: unknown, min: number, max: number): number | null {
  const v = String(value ?? '').trim().replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  if (!/^\d{1,9}$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

/**
 * Builds a PATCH body with only the fields that changed (backend: omitted = unchanged,
 * explicit null = clear; see docs/open-questions.md Q12). Returns null when nothing changed.
 */
export function changedFields<T extends object>(initial: T, next: T): Partial<T> | null {
  const body: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    const a = initial[key] ?? null;
    const b = next[key] ?? null;
    if (!Object.is(a, b)) body[key] = next[key];
  }
  return Object.keys(body).length > 0 ? body : null;
}
