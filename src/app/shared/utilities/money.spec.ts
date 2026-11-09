import { formatMoney, rialToToman, tomanToRial } from './money';

describe('money', () => {
  it('converts Rial to Toman with integer division', () => {
    expect(rialToToman(12_500_000)).toBe(1_250_000);
    expect(rialToToman(15)).toBe(1);
  });
  it('converts Toman to Rial', () => expect(tomanToRial(1_250_000)).toBe(12_500_000));
  it('formats Toman by default with Persian digits', () => {
    expect(formatMoney(12_500_000)).toContain('تومان');
    expect(formatMoney(12_500_000)).toMatch(/[۰-۹]/);
  });
  it('formats Rial when requested', () =>
    expect(formatMoney(12_500_000, 'rial')).toContain('ریال'));
  it('renders a dash for missing values', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(NaN)).toBe('—');
  });
});
