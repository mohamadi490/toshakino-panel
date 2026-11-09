import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './api-error';

describe('ApiError.from', () => {
  it('maps problem+json with fieldErrors, code and traceId', () => {
    const e = ApiError.from(
      new HttpErrorResponse({
        status: 422,
        error: {
          title: 'x',
          detail: 'نام الزامی است',
          code: 'validation_error',
          fieldErrors: { name: ['الزامی'] },
          traceId: 't-1',
        },
      }),
    );
    expect(e.kind).toBe('validation');
    expect(e.message).toBe('نام الزامی است');
    expect(e.fieldErrors['name']).toEqual(['الزامی']);
    expect(e.traceId).toBe('t-1');
  });

  it.each([
    [0, 'network'],
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [429, 'rate-limited'],
    [500, 'server'],
    [503, 'server'],
  ])('maps status %s to %s', (status, kind) => {
    expect(ApiError.from(new HttpErrorResponse({ status })).kind).toBe(kind);
  });

  it('falls back to a Persian default message for non-problem bodies', () => {
    expect(ApiError.from(new HttpErrorResponse({ status: 500, error: '<html>' })).message).toMatch(
      /سرور/,
    );
  });
});
