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
import { CurrentUser, LoginRequest, TokenResponse } from './auth.models';
import { AuthStore } from './auth.store';

/** Custom header the backend can require on cookie-based endpoints (CSRF defence in depth). */
export const CSRF_HEADER = 'X-Requested-With';
export const CSRF_VALUE = 'toshakino-admin';

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
      .post<ApiEnvelope<TokenResponse>>(
        this.api.url('/auth/admin/login'),
        req,
        this.cookieOptions(),
      )
      .pipe(
        tap((r) => this.store.setToken(r.data.accessToken)),
        switchMap(() => this.loadCurrentUser()),
      );
  }

  /** GET /auth/me - revalidates identity, roles and effective permissions from the backend. */
  loadCurrentUser(): Observable<CurrentUser> {
    return this.api.get<CurrentUser>('/auth/me').pipe(tap((u) => this.store.setSession(u)));
  }

  /**
   * Single-flight refresh: concurrent callers (e.g. several 401s at once)
   * share one request. Emits the new access token.
   */
  refresh(): Observable<string> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<ApiEnvelope<TokenResponse>>(this.api.url('/auth/refresh'), {}, this.cookieOptions())
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
    return this.http.post<void>(this.api.url('/auth/logout'), {}, this.cookieOptions()).pipe(
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
    return {
      withCredentials: true,
      headers: { [CSRF_HEADER]: CSRF_VALUE },
      context: new HttpContext().set(SKIP_AUTH, true),
    };
  }
}
