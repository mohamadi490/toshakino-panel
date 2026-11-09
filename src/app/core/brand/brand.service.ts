import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { AuthStore } from '../auth/auth.store';
import { Permissions } from '../authorization/permissions';

/** GET /admin/brand/admin response `data` (assumed contract). */
export interface AdminBrand {
  version?: number;
  primaryColor?: string;
  secondaryColor?: string;
  primaryColorDark?: string;
  secondaryColorDark?: string;
  logoUrl?: string | null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isValidHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);

/** Applies the admin-panel brand palette as CSS variables. Never touches the storefront brand. */
@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly api = inject(ApiClient);
  private readonly store = inject(AuthStore);
  private readonly doc = inject(DOCUMENT);
  readonly logoUrl = signal<string | null>(null);

  load() {
    if (!this.store.can({ all: [Permissions.BrandAdminRead] })) return of(null);
    return this.api.get<AdminBrand>('/admin/brand/admin').pipe(
      tap((b) => this.apply(b)),
      // Brand failure must never block the panel: defaults stay in place.
      catchError(() => of(null)),
    );
  }

  apply(brand: AdminBrand): void {
    const style = this.doc.documentElement.style;
    const set = (name: string, value: unknown) =>
      isValidHex(value) ? style.setProperty(name, value) : style.removeProperty(name);
    set('--brand-primary', brand.primaryColor);
    set('--brand-secondary', brand.secondaryColor);
    set('--brand-primary-dark', brand.primaryColorDark);
    set('--brand-secondary-dark', brand.secondaryColorDark);
    this.logoUrl.set(
      typeof brand.logoUrl === 'string' && brand.logoUrl.startsWith('https://')
        ? brand.logoUrl
        : null,
    );
  }

  reset(): void {
    [
      '--brand-primary',
      '--brand-secondary',
      '--brand-primary-dark',
      '--brand-secondary-dark',
    ].forEach((n) => this.doc.documentElement.style.removeProperty(n));
    this.logoUrl.set(null);
  }
}
