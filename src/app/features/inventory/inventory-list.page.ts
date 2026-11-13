import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { PagedList } from '../../shared/tables/paged-list';
import { PaginationComponent } from '../../shared/tables/pagination';
import { ButtonComponent } from '../../shared/ui/button';
import { AdjustStockDialogComponent } from './adjust-stock.dialog';
import { InventoryApi } from './inventory.api';
import { InventoryItem, InventoryListQuery } from './inventory.models';

const fa = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

@Component({
  selector: 'app-inventory-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    PaginationComponent,
    ButtonComponent,
    AdjustStockDialogComponent,
  ],
  template: `
    <header class="mb-4"><h1 class="m-0">موجودی انبار</h1></header>

    <div class="mb-3 flex flex-wrap items-center gap-3">
      <input
        type="search"
        [formControl]="searchControl"
        placeholder="جستجو بر اساس نام محصول یا SKU"
        aria-label="جستجو"
        class="h-10 min-w-64 grow rounded-md border border-border bg-surface px-3 text-sm"
      />
      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          [checked]="lowStock()"
          (change)="setLowStock($any($event.target).checked)"
        />
        فقط کم‌موجود / ناموجود
      </label>
    </div>

    <app-data-table
      [columns]="columns"
      [rows]="list.items()"
      [rowKey]="rowKey"
      [loading]="list.loading()"
      [error]="list.error()"
      caption="موجودی SKUها"
      emptyText="موردی یافت نشد."
      (retry)="reload()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('product') {
            <span class="font-medium">{{ row.productTitle }}</span>
            @if (row.variantLabel) {
              <span class="block text-xs text-muted">{{ row.variantLabel }}</span>
            }
          }
          @case ('sku') {
            <span class="ltr-field">{{ row.sku }}</span>
          }
          @case ('state') {
            @if (row.available <= 0) {
              <span class="rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger"
                >ناموجود</span
              >
            } @else if (isLow(row)) {
              <span class="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning"
                >کم‌موجود</span
              >
            } @else {
              <span class="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success"
                >موجود</span
              >
            }
          }
          @case ('actions') {
            @if (canAdjust()) {
              <button app-button variant="ghost" type="button" (click)="adjusting.set(row)">
                تعدیل
              </button>
            }
          }
          @default {
            {{ col.cell ? col.cell(row) : '' }}
          }
        }
      </ng-template>
    </app-data-table>

    @if (list.meta(); as m) {
      <app-pagination
        [page]="m.page"
        [totalPages]="m.totalPages"
        [totalItems]="m.totalItems"
        (pageChange)="page.set($event)"
      />
    }

    @if (adjusting(); as item) {
      <app-adjust-stock-dialog
        [item]="item"
        (closed)="adjusting.set(null)"
        (adjusted)="onAdjusted($event)"
      />
    }
  `,
})
export class InventoryListPage {
  private readonly api = inject(InventoryApi);
  private readonly store = inject(AuthStore);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);
  protected readonly lowStock = signal(false);
  private readonly search = signal('');
  protected readonly adjusting = signal<InventoryItem | null>(null);

  protected readonly list = new PagedList<InventoryItem, InventoryListQuery>(
    (q) => this.api.list(q),
    (e) => ApiError.from(e).message,
  );

  protected readonly columns: TableColumn<InventoryItem>[] = [
    { key: 'product', header: 'محصول' },
    { key: 'sku', header: 'SKU' },
    { key: 'onHand', header: 'موجودی انبار', cell: (i) => fa(i.onHand) },
    { key: 'reserved', header: 'رزرو‌شده', cell: (i) => fa(i.reserved) },
    { key: 'available', header: 'قابل فروش', cell: (i) => fa(i.available) },
    { key: 'state', header: 'وضعیت' },
    { key: 'actions', header: '' },
  ];
  protected readonly rowKey = (i: InventoryItem) => i.variantId;

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((v) => {
        this.search.set(v.trim());
        this.page.set(1);
      });
    effect(() => {
      const q = this.query();
      untracked(() => this.list.load(q));
    });
    inject(DestroyRef).onDestroy(() => this.list.destroy());
  }

  private query(): InventoryListQuery {
    return {
      page: this.page(),
      pageSize: 20,
      search: this.search() || undefined,
      lowStock: this.lowStock() || undefined,
    };
  }

  protected isLow(i: InventoryItem): boolean {
    return typeof i.lowStockThreshold === 'number' && i.available <= i.lowStockThreshold;
  }

  protected setLowStock(v: boolean): void {
    this.lowStock.set(v);
    this.page.set(1);
  }
  protected reload(): void {
    this.list.load(this.query());
  }
  protected canAdjust(): boolean {
    return this.store.can({ all: [Permissions.InventoryAdjust] });
  }

  /** Replace the row with the server's updated figures (no client-side stock arithmetic). */
  protected onAdjusted(updated: InventoryItem): void {
    this.list.items.update((items) =>
      items.map((i) => (i.variantId === updated.variantId ? updated : i)),
    );
    this.adjusting.set(null);
  }
}
