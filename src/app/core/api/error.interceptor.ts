import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Logger } from '../logging/logger';
import { ApiError } from './api-error';

/** Normalises every HTTP failure into ApiError so components never parse raw responses. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(Logger);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const apiError = ApiError.from(err);
      logger.warn(`HTTP ${apiError.status} ${req.method} ${req.url.split('?')[0]}`, {
        code: apiError.code,
        traceId: apiError.traceId,
      });
      return throwError(() => apiError);
    }),
  );
};
