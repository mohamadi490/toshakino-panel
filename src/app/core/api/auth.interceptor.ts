import { HttpContext, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthStore } from '../auth/auth.store';
import { AppConfig } from '../config/app-config';
import { RETRIED, SKIP_AUTH } from './http-context';

function isApiRequest(url: string, origin: string): boolean {
  try {
    return new URL(url, origin).origin === origin;
  } catch {
    return false;
  }
}

/**
 * - Adds the bearer token ONLY to requests going to the configured API origin.
 * - On 401: one controlled refresh (shared across concurrent requests), then one retry.
 * - On failed refresh: ends the session and redirects to login.
 * - 403 passes through untouched (it is "forbidden", never a logout).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const origin = inject(AppConfig).apiOrigin;

  if (req.context.get(SKIP_AUTH) || !isApiRequest(req.url, origin)) return next(req);

  const token = store.accessToken;
  const first = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(first).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || req.context.get(RETRIED)) {
        return throwError(() => err);
      }
      return auth.refresh().pipe(
        switchMap((fresh) =>
          next(
            req.clone({
              context: new HttpContext().set(RETRIED, true),
              setHeaders: { Authorization: `Bearer ${fresh}` },
            }),
          ),
        ),
        catchError((refreshErr: unknown) => {
          auth.endSession();
          void router.navigate(['/login'], { queryParams: { reason: 'expired' } });
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
