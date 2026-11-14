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
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { PagedList } from '../../shared/tables/paged-list';
import { PaginationComponent } from '../../shared/tables/pagination';
import { formatJalaliDateTime } from '../../shared/utilities/jalali-date';
import { formatMoney } from '../../shared/utilities/money';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_STATUS_LABELS,
  TONE_CLASSES,
  labelOf,
  toneOf,
} from '../../shared/domain/status-labels';
import { OrderListQuery, OrderSummary } from './orders.models';
import { OrdersApi } from './orders.api';

const SORTS = [
  { value: '-createdAt', label: 'جدیدترین' },
  { value: 'createdAt', label: 'قدیمی‌ترین' },
  { value: '-total', label: 'بیشترین مبلغ' },
  { value: 'total', label: 'کمترین مبلغ' },
];

@Component({
  selector: 'app-orders-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DataTableComponent, PaginationComponent],
  template: `
    <header class="mb-4"><h1 class="m-0">سفارش‌ها</h1></header>

    <div class="mb-3 flex flex-wrap gap-3">
      <input
        type="search"
        [formControl]="searchControl"
        placeholder="جستجو بر اساس شماره سفارش یا نام مشتری"
        aria-label="جستجو"
        class="h-10 min-w-64 grow rounded-md border border-border bg-surface px-3 text-sm"
      />
      <select
        aria-label="وضعیت سفارش"
        class="h-10 rounded-md border border-border bg-surface px-3 text-sm"
        [value]="status()"
        (change)="setStatus($any($event.target).value)"
      >
        <option value="">همه وضعیت‌ها</option>
        @for (s of orderStatuses; track s.value) {
          <option [value]="s.value">{{ s.label }}</option>
        }
      </select>
      <select
        aria-label="وضعیت پرداخت"
        class="h-10 rounded-md border border-border bg-surface px-3 text-sm"
        [value]="paymentStatus()"
        (change)="setPayment($any($event.target).value)"
      >
        <option value="">همه پرداخت‌ها</option>
        @for (s of paymentStatuses; track s.value) {
          <option [value]="s.value">{{ s.label }}</option>
        }
      </select>
      <select
        aria-label="مرتب‌سازی"
        class="h-10 rounded-md border border-border bg-surface px-3 text-sm"
        [value]="sort()"
        (change)="setSort($any($event.target).value)"
      >
        @for (s of sorts; track s.value) {
          <option [value]="s.value">{{ s.label }}</option>
        }
      </select>
    </div>

    <app-data-table
      [columns]="columns"
      [rows]="list.items()"
      [rowKey]="rowKey"
      [loading]="list.loading()"
      [error]="list.error()"
      caption="فهرست سفارش‌ها"
      emptyText="سفارشی یافت نشد."
      (retry)="reload()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('number') {
            <a
              [routerLink]="row.id"
              class="ltr-field font-medium text-primary no-underline hover:underline"
              >{{ row.number }}</a
            >
          }
          @case ('status') {
            <span class="rounded-full px-2 py-0.5 text-xs" [class]="tone(row.status)">{{
              orderLabel(row.status)
            }}</span>
          }
          @case ('payment') {
            <span class="rounded-full px-2 py-0.5 text-xs" [class]="tone(row.paymentStatus)">{{
              paymentLabel(row.paymentStatus)
            }}</span>
          }
          @case ('shipping') {
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              [class]="tone(row.shippingStatus ?? '')"
              >{{ shippingLabel(row.shippingStatus) }}</span
            >
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
  `,
})
export class OrdersListPage {
  private readonly api = inject(OrdersApi);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);
  protected readonly status = signal('');
  protected readonly paymentStatus = signal('');
  protected readonly sort = signal('-createdAt');
  private readonly search = signal('');

  protected readonly sorts = SORTS;
  protected readonly orderStatuses = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  protected readonly paymentStatuses = Object.entries(PAYMENT_STATUS_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

  protected readonly list = new PagedList<OrderSummary, OrderListQuery>(
    (q) => this.api.list(q),
    (e) => ApiError.from(e).message,
  );

  protected readonly columns: TableColumn<OrderSummary>[] = [
    { key: 'number', header: 'شماره سفارش' },
    { key: 'customer', header: 'مشتری', cell: (o) => o.customerName || '—' },
    { key: 'status', header: 'وضعیت' },
    { key: 'payment', header: 'پرداخت' },
    { key: 'shipping', header: 'ارسال' },
    { key: 'total', header: 'مبلغ نهایی', cell: (o) => formatMoney(o.totalRial) },
    { key: 'createdAt', header: 'زمان ثبت', cell: (o) => formatJalaliDateTime(o.createdAt) },
  ];
  protected readonly rowKey = (o: OrderSummary) => o.id;

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

  private query(): OrderListQuery {
    return {
      page: this.page(),
      pageSize: 20,
      sort: this.sort(),
      search: this.search() || undefined,
      status: this.status() || undefined,
      paymentStatus: this.paymentStatus() || undefined,
    };
  }

  protected setStatus(v: string): void {
    this.status.set(v);
    this.page.set(1);
  }
  protected setPayment(v: string): void {
    this.paymentStatus.set(v);
    this.page.set(1);
  }
  protected setSort(v: string): void {
    this.sort.set(v);
    this.page.set(1);
  }
  protected reload(): void {
    this.list.load(this.query());
  }

  protected tone = (key: string): string => TONE_CLASSES[toneOf(key)];
  protected orderLabel = (k: string) => labelOf(ORDER_STATUS_LABELS, k);
  protected paymentLabel = (k: string) => labelOf(PAYMENT_STATUS_LABELS, k);
  protected shippingLabel = (k: string | null | undefined) => labelOf(SHIPPING_STATUS_LABELS, k);
}
