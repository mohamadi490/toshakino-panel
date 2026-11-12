import { newIdempotencyKey } from './idempotency';

describe('newIdempotencyKey', () => {
  it('returns distinct, URL/header-safe keys', () => {
    const keys = new Set(Array.from({ length: 50 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(50);
    for (const k of keys) expect(k).toMatch(/^[0-9a-f-]{32,36}$/);
  });
});
