const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC = '٠١٢٣٤٥٦٧٨٩';

/** Converts Persian/Arabic-Indic digits to ASCII so phone numbers etc. validate and post correctly. */
export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = PERSIAN.indexOf(d);
    return String(i >= 0 ? i : ARABIC.indexOf(d));
  });
}
