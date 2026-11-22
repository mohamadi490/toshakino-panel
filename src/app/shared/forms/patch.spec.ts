import { blankToNull, changedFields, parseBoundedInt } from './patch';

describe('blankToNull', () => {
  it('trims and maps empty to null', () => {
    expect(blankToNull('  x ')).toBe('x');
    expect(blankToNull('   ')).toBeNull();
    expect(blankToNull(null)).toBeNull();
  });
});

describe('parseBoundedInt', () => {
  it.each([
    ['5', 0, 10, 5],
    ['۱۲', 0, 100, 12],
    ['0', 0, 10, 0],
    [' 7 ', 0, 10, 7],
  ])('parses %s', (v, min, max, out) => expect(parseBoundedInt(v, min, max)).toBe(out));
  it.each([
    ['', 0, 10],
    ['-1', 0, 10],
    ['1.5', 0, 10],
    ['11', 0, 10],
    ['abc', 0, 10],
    [null, 0, 10],
  ])('rejects %s', (v, min, max) => expect(parseBoundedInt(v, min, max)).toBeNull());
});

describe('changedFields', () => {
  it('returns only changed fields, treating undefined and null as equal', () => {
    const initial = { a: 'x', b: null, c: 1, d: undefined as string | undefined };
    expect(changedFields(initial, { a: 'x', b: null, c: 2, d: undefined })).toEqual({ c: 2 });
  });
  it('keeps an explicit null to clear a value', () => {
    expect(changedFields({ a: 'x' as string | null }, { a: null })).toEqual({ a: null });
  });
  it('returns null when nothing changed', () => {
    expect(changedFields({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBeNull();
  });
});
