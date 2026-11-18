import { HttpErrorResponse } from '@angular/common/http';
import {
  CODE_TO_FIELD,
  ERROR_MESSAGES,
  FIELD_ERROR_MESSAGES,
  GENERIC_FIELD_MESSAGE,
} from './error-messages';
import { ProblemDetails } from './schemas';

export type ApiErrorKind =
  | 'network'
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'rate-limited'
  | 'server'
  | 'unknown';

const KIND_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.',
  unauthenticated: 'نشست شما منقضی شده است. دوباره وارد شوید.',
  forbidden: 'اجازه انجام این عملیات را ندارید.',
  'not-found': 'مورد درخواستی پیدا نشد.',
  conflict: 'این عملیات با وضعیت فعلی داده‌ها تداخل دارد.',
  validation: 'اطلاعات واردشده معتبر نیست.',
  'rate-limited': 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
  server: 'خطایی در سرور رخ داد. لطفاً بعداً تلاش کنید.',
  unknown: 'خطای ناشناخته رخ داد.',
};

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    /** Persian, safe to show to the user. */
    message: string,
    /** Stable machine code from the contract; the only thing UI logic may branch on. */
    readonly code?: string,
    /** field -> Persian messages (already mapped from `fieldErrors[].code`). */
    readonly fieldErrors: Record<string, string[]> = {},
    readonly traceId?: string,
    /** English server text for logs only. */
    readonly detail?: string,
    /** Seconds from the `Retry-After` header (429). */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (!(err instanceof HttpErrorResponse))
      return new ApiError('unknown', 0, KIND_MESSAGES.unknown);

    const problem = (
      typeof err.error === 'object' && err.error !== null ? err.error : {}
    ) as Partial<ProblemDetails>;
    const kind = kindOf(err.status);
    const code = typeof problem.code === 'string' ? problem.code : undefined;
    const fieldErrors = mapFieldErrors(problem, code);

    let message = (code && ERROR_MESSAGES[code]) || KIND_MESSAGES[kind];
    // A support code only helps for server-side failures the user cannot fix.
    if (kind === 'server' && problem.traceId) message += ` (کد پیگیری: ${problem.traceId})`;

    const retry = Number(err.headers?.get('Retry-After'));
    return new ApiError(
      kind,
      err.status,
      message,
      code,
      fieldErrors,
      problem.traceId ?? undefined,
      problem.detail,
      Number.isFinite(retry) && retry > 0 ? retry : undefined,
    );
  }
}

function mapFieldErrors(
  problem: Partial<ProblemDetails>,
  code: string | undefined,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const list = Array.isArray(problem.fieldErrors) ? problem.fieldErrors : [];
  for (const fe of list) {
    if (!fe || typeof fe.field !== 'string') continue;
    const msg = FIELD_ERROR_MESSAGES[fe.code] ?? ERROR_MESSAGES[fe.code] ?? GENERIC_FIELD_MESSAGE;
    (out[fe.field] ??= []).push(msg);
  }
  // e.g. 409 slug_taken has no fieldErrors but belongs on the `slug` input.
  const field = code ? CODE_TO_FIELD[code] : undefined;
  if (field && !out[field] && code) out[field] = [ERROR_MESSAGES[code] ?? GENERIC_FIELD_MESSAGE];
  return out;
}

function kindOf(status: number): ApiErrorKind {
  if (status === 0) return 'network';
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status === 429) return 'rate-limited';
  if (status >= 500) return 'server';
  return 'unknown';
}
