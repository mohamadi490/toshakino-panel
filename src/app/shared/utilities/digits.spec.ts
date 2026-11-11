import { normalizeDigits } from './digits';

describe('normalizeDigits', () => {
  it('converts Persian and Arabic-Indic digits', () => {
    expect(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(normalizeDigits('٠٩١٢٣٤٥٦٧٨٩')).toBe('09123456789');
  });
  it('leaves other characters untouched', () => expect(normalizeDigits('a-1۲')).toBe('a-12'));
});
