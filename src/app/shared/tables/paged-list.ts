import { signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

export interface PagedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

/**
 * Signal-based holder for a server-paginated list. A new `load()` cancels the previous
 * request (no stale responses overwriting newer ones).
 */
export class PagedList<T, Q> {
  readonly items = signal<T[]>([]);
  readonly meta = signal<PagedResponse<T>['meta'] | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private sub: Subscription | null = null;

  constructor(
    private readonly fetch: (query: Q) => Observable<PagedResponse<T>>,
    private readonly toMessage: (err: unknown) => string,
  ) {}

  load(query: Q): void {
    this.sub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.sub = this.fetch(query).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(this.toMessage(err));
        this.loading.set(false);
      },
    });
  }

  destroy(): void {
    this.sub?.unsubscribe();
  }
}
