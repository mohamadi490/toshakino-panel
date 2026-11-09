import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from './api-types';

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

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly fieldErrors: Record<string, string[]> = {},
    readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (!(err instanceof HttpErrorResponse)) {
      return new ApiError('unknown', 0, 'خطای ناشناخته رخ داد.');
    }
    const problem = (
      typeof err.error === 'object' && err.error !== null ? err.error : {}
    ) as ProblemDetails;
    const kind = kindOf(err.status);
    const message = problem.detail ?? problem.title ?? defaultMessage(kind);
    return new ApiError(
      kind,
      err.status,
      message,
      problem.code,
      problem.fieldErrors ?? {},
      problem.traceId,
    );
  }
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

function defaultMessage(kind: ApiErrorKind): string {
  switch (kind) {
    case 'network':
      return 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.';
    case 'unauthenticated':
      return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    case 'forbidden':
      return 'اجازه انجام این عملیات را ندارید.';
    case 'not-found':
      return 'مورد درخواستی پیدا نشد.';
    case 'conflict':
      return 'این عملیات با وضعیت فعلی داده‌ها تداخل دارد.';
    case 'validation':
      return 'اطلاعات واردشده معتبر نیست.';
    case 'rate-limited':
      return 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.';
    case 'server':
      return 'خطایی در سرور رخ داد. لطفاً بعداً تلاش کنید.';
    default:
      return 'خطای ناشناخته رخ داد.';
  }
}
