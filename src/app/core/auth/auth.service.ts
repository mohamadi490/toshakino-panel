import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { ApiClient } from '../api/api-client';
import { ApiEnvelope } from '../api/api-types';
import { SKIP_AUTH } from '../api/http-context';
import { SessionRead } from '../api/schemas';
import { CurrentUser, LoginRequest } from './auth.models';
import { AuthStore } from './auth.store';

/**
 * Admin session (contract: docs/contracts/backend-frontend-guide.md "احراز هویت").
 * - access token: memory only; refresh token: HttpOnly cookie (hence `withCredentials`).
 * - NO custom headers on these calls: CORS only allows Authorization, Content-Type,
 *   Idempotency-Key and X-Request-Id.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClient);
  private readonly store = inject(AuthStore);

  private refreshInFlight$: Observable<string> | null = null;
  private readonly cleanups: Array<() => void> = [];

  /** Register cleanup for personal caches (run on logout / failed refresh). */
  registerSessionCleanup(fn: () => void): void {
    this.cleanups.push(fn);
  }

  login(req: LoginRequest): Observable<CurrentUser> {
    return this.http
      .post<ApiEnvelope<SessionRead>>(this.api.url('/admin/auth/login'), req, this.cookieOptions())
      .pipe(
        tap((r) => this.store.setToken(r.data.accessToken)),
        switchMap(() => this.loadCurrentUser()),
      );
  }

  /** `GET /auth/me` - revalidates identity, role and effective permissions from the backend. */
  loadCurrentUser(): Observable<CurrentUser> {
    return this.api.get<CurrentUser>('/auth/me').pipe(tap((u) => this.store.setSession(u)));
  }

  /**
   * Single-flight refresh: every refresh rotates the token, so concurrent callers MUST share one
   * request (a parallel second refresh would invalidate the session). Emits the new access token.
   */
  refresh(): Observable<string> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<ApiEnvelope<SessionRead>>(
          this.api.url('/admin/auth/refresh'),
          {},
          this.cookieOptions(),
        )
        .pipe(
          map((r) => r.data.accessToken),
          tap((t) => this.store.setToken(t)),
          finalize(() => {
            this.refreshInFlight$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.refreshInFlight$;
  }

  /** App start: try to restore the session via the HttpOnly refresh cookie. */
  restoreSession(): Observable<boolean> {
    return this.refresh().pipe(
      switchMap(() => this.loadCurrentUser()),
      map(() => true),
      catchError(() => {
        this.endSession();
        return of(false);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.api.url('/admin/auth/logout'), {}, this.cookieOptions()).pipe(
      // Local state is wiped even when the network call fails.
      catchError((e: unknown) => {
        this.endSession();
        return throwError(() => e);
      }),
      tap(() => this.endSession()),
      map(() => undefined),
    );
  }

  /** Clears in-memory session + registered personal caches. */
  endSession(): void {
    this.refreshInFlight$ = null;
    this.store.clear();
    this.cleanups.forEach((fn) => fn());
  }

  private cookieOptions() {
    return { withCredentials: true, context: new HttpContext().set(SKIP_AUTH, true) };
  }
}
