import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type AppearancePreference = 'light' | 'dark' | 'system';
export const APPEARANCE_STORAGE_KEY = 'toshakino.appearance';

/**
 * Light/Dark/System appearance. Independent from brand colours.
 * Only this UI preference is persisted in localStorage (never credentials).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly _preference = signal<AppearancePreference>(this.readStored());
  private readonly _systemDark = signal(this.mediaQuery()?.matches ?? false);

  readonly preference = this._preference.asReadonly();
  readonly resolved = computed<'light' | 'dark'>(() => {
    const p = this._preference();
    return p === 'system' ? (this._systemDark() ? 'dark' : 'light') : p;
  });

  constructor() {
    this.mediaQuery()?.addEventListener('change', (e) => {
      this._systemDark.set(e.matches);
      this.apply();
    });
    this.apply();
  }

  set(pref: AppearancePreference): void {
    this._preference.set(pref);
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, pref);
    } catch {
      /* storage unavailable: preference stays in memory only */
    }
    this.apply();
  }

  private apply(): void {
    this.doc.documentElement.setAttribute('data-theme', this.resolved());
  }

  private mediaQuery(): MediaQueryList | null {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  }

  private readStored(): AppearancePreference {
    try {
      const v = localStorage.getItem(APPEARANCE_STORAGE_KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }
}
