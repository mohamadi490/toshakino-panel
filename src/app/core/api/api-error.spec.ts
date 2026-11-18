import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiError } from './api-error';

const problem = (status: number, body: Record<string, unknown>, headers?: Record<string, string>) =>
  new HttpErrorResponse({
    status,
    error: {
      type: 'about:blank',
      title: 'x',
      status,
      detail: 'English detail for logs',
      fieldErrors: [],
      ...body,
    },
    headers: new HttpHeaders(headers),
  });

describe('ApiError.from (contract: application/problem+json)', () => {
  it('shows a Persian message chosen by `code`, never the English detail', () => {
    const e = ApiError.from(problem(409, { code: 'sku_taken' }));
    expect(e.message).toBe('این SKU قبلاً استفاده شده است.');
    expect(e.message).not.toContain('English');
    expect(e.detail).toBe('English detail for logs');
    expect(e.code).toBe('sku_taken');
  });

  it('keeps the contract code usable for logic', () => {
    expect(ApiError.from(problem(409, { code: 'invalid_status_transition' })).code).toBe(
      'invalid_status_transition',
    );
  });

  it('falls back to a message by HTTP kind for unknown codes', () => {
    const e = ApiError.from(problem(409, { code: 'brand_new_code_from_next_release' }));
    expect(e.message).toBe('این عملیات با وضعیت فعلی داده‌ها تداخل دارد.');
    expect(e.kind).toBe('conflict');
  });

  it('maps fieldErrors[] to field -> Persian messages by field code (never the English message)', () => {
    const e = ApiError.from(
      problem(422, {
        code: 'validation_error',
        fieldErrors: [
          {
            field: 'name',
            code: 'string_too_short',
            message: 'String should have at least 2 characters',
          },
          { field: 'name', code: 'required', message: 'Field required' },
          { field: 'price', code: 'weird_new_code', message: 'English' },
        ],
      }),
    );
    expect(e.fieldErrors['name']).toEqual([
      'مقدار واردشده کوتاه‌تر از حد مجاز است.',
      'این فیلد الزامی است.',
    ]);
    expect(e.fieldErrors['price']).toEqual(['مقدار واردشده معتبر نیست.']);
    expect(JSON.stringify(e.fieldErrors)).not.toContain('English');
  });

  it.each([
    ['slug_taken', 'slug'],
    ['sku_taken', 'sku'],
    ['email_taken', 'email'],
    ['username_taken', 'username'],
    ['mobile_taken', 'mobile'],
    ['category_name_taken', 'name'],
    ['brand_name_taken', 'name'],
    ['role_name_taken', 'name'],
  ])('puts conflict %s on the %s field even though the API sends no fieldErrors', (code, field) => {
    const e = ApiError.from(problem(409, { code }));
    expect(e.fieldErrors[field]?.length).toBe(1);
  });

  it('does not overwrite explicit fieldErrors with the code-derived one', () => {
    const e = ApiError.from(
      problem(409, {
        code: 'slug_taken',
        fieldErrors: [{ field: 'slug', code: 'required', message: 'm' }],
      }),
    );
    expect(e.fieldErrors['slug']).toEqual(['این فیلد الزامی است.']);
  });

  it('adds the support trace code to server errors only', () => {
    const server = ApiError.from(problem(500, { code: 'internal_error', traceId: 'abc123' }));
    expect(server.message).toContain('abc123');
    expect(server.traceId).toBe('abc123');
    const client = ApiError.from(problem(404, { code: 'order_not_found', traceId: 'abc123' }));
    expect(client.message).not.toContain('abc123');
  });

  it('reads Retry-After for rate limiting', () => {
    const e = ApiError.from(problem(429, { code: 'rate_limited' }, { 'Retry-After': '42' }));
    expect(e.kind).toBe('rate-limited');
    expect(e.retryAfter).toBe(42);
  });

  it.each([
    [0, 'network'],
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rate-limited'],
    [500, 'server'],
    [502, 'server'],
    [503, 'server'],
  ])('maps status %s to %s', (status, kind) => {
    expect(ApiError.from(new HttpErrorResponse({ status })).kind).toBe(kind);
  });

  it('survives non-problem bodies (HTML error pages, proxies)', () => {
    const e = ApiError.from(
      new HttpErrorResponse({ status: 502, error: '<html>Bad gateway</html>' }),
    );
    expect(e.kind).toBe('server');
    expect(e.message).toContain('خطایی در سرور');
    expect(e.fieldErrors).toEqual({});
  });

  it('wraps non-HTTP errors', () => {
    expect(ApiError.from(new Error('boom')).kind).toBe('unknown');
  });
});
