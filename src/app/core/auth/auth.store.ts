import { Injectable, computed, signal } from '@angular/core';
import { satisfies } from '../authorization/permission-evaluator';
import { PermissionRequirement } from '../authorization/permissions';
import { CurrentUser } from './auth.models';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

/**
 * In-memory session state. The access token lives ONLY here (never in
 * localStorage/sessionStorage/cookies readable by JS).
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private _accessToken: string | null = null;
  private readonly _user = signal<CurrentUser | null>(null);
  private readonly _status = signal<AuthStatus>('unknown');

  readonly user = this._user.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');
  readonly permissionSet = computed<ReadonlySet<string>>(
    () => new Set(this._user()?.permissions ?? []),
  );

  get accessToken(): string | null {
    return this._accessToken;
  }

  setToken(token: string): void {
    this._accessToken = token;
  }

  setSession(user: CurrentUser): void {
    this._user.set(user);
    this._status.set('authenticated');
  }

  /** Wipes token, user and status. Callers also clear other personal caches. */
  clear(): void {
    this._accessToken = null;
    this._user.set(null);
    this._status.set('anonymous');
  }

  can(req: PermissionRequirement | undefined): boolean {
    return satisfies(this.permissionSet(), req);
  }
}
