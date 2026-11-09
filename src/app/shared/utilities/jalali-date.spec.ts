import { formatJalaliDate, formatJalaliDateTime } from './jalali-date';

describe('jalali date', () => {
  it('renders ISO UTC as a Persian-calendar date in Tehran time', () => {
    // 2026-03-21T12:00Z is 1 Farvardin 1405
    const out = formatJalaliDate('2026-03-21T12:00:00Z');
    expect(out).toContain('۱۴۰۵');
    expect(out).toContain('فروردین');
  });
  it('includes time for the date-time formatter', () => {
    expect(formatJalaliDateTime('2026-03-21T12:00:00Z')).toMatch(/[۰-۹]{1,2}:[۰-۹]{2}/);
  });
  it('handles empty and invalid input', () => {
    expect(formatJalaliDate(null)).toBe('—');
    expect(formatJalaliDate('not-a-date')).toBe('—');
  });
});
