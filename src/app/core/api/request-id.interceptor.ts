import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { newIdempotencyKey } from '../../shared/utilities/idempotency';
import { AppConfig } from '../config/app-config';

/**
 * Sends `X-Request-Id` (8-64 chars of A-Za-z0-9._-) to the API only. The server echoes it as
 * `traceId`, so a failing request can be matched with backend logs by support.
 */
export const requestIdInterceptor: HttpInterceptorFn = (req, next) => {
  const origin = inject(AppConfig).apiOrigin;
  let sameOrigin = false;
  try {
    sameOrigin = new URL(req.url, origin).origin === origin;
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin || req.headers.has('X-Request-Id')) return next(req);
  return next(req.clone({ setHeaders: { 'X-Request-Id': newIdempotencyKey() } }));
};
