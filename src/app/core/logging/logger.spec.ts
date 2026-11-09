import { redact } from './logger';

describe('redact', () => {
  it('masks credential-looking keys at any depth', () => {
    const out = redact({
      user: 'a',
      accessToken: 'x',
      nested: { Password: 'p', ok: 1 },
      list: [{ authorization: 'Bearer z' }],
    }) as Record<string, any>;
    expect(out['accessToken']).toBe('[REDACTED]');
    expect(out['nested'].Password).toBe('[REDACTED]');
    expect(out['nested'].ok).toBe(1);
    expect(out['list'][0].authorization).toBe('[REDACTED]');
    expect(out['user']).toBe('a');
  });
});
