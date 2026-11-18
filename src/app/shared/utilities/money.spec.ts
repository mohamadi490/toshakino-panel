import { formatMoney, parseTomanInput } from './money';

describe('money (contract: integer Toman)', () => {
  it('formats Toman as-is with Persian digits and the unit', () => {
    const out = formatMoney(1_250_000);
    expect(out).toContain('تومان');
    expect(out).toMatch(/^[۰-۹٬\s]+تومان$/u);
    expect(out).toContain('۱٬۲۵۰٬۰۰۰');
  });

  it('does not rescale the amount', () => {
    expect(formatMoney(10)).toContain('۱۰');
    expect(formatMoney(0)).toContain('۰');
  });

  it('renders a dash for missing values', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(NaN)).toBe('—');
  });
});

describe('parseTomanInput', () => {
  it.each([
    ['1500000', 1500000],
    ['۱٬۵۰۰٬۰۰۰', 1500000],
    ['1,500,000', 1500000],
    [' ۲۵۰ ', 250],
    ['0', 0],
  ])('parses %s', (input, expected) => expect(parseTomanInput(input)).toBe(expected));
  it.each(['', 'abc', '12.5', '-5', '1e6', '12 تومان'])('rejects %s', (input) =>
    expect(parseTomanInput(input)).toBeNull(),
  );
});
