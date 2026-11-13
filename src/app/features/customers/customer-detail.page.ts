import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { PagedList } from '../../shared/tables/paged-list';
import { PaginationComponent } from '../../shared/tables/pagination';
import { formatJalaliDate, formatJalaliDateTime } from '../../shared/utilities/jalali-date';
import { formatMoney } from '../../shared/utilities/money';
import { CustomersApi } from './customers.api';
import { CustomerDetail, CustomerOrder } from './customers.models';

@Component({
  selector: 'app-customer-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DataTableComponent, PaginationComponent],
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a
        routerLink="/customers"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">{{ customer()?.name ?? 'پروفایل مشتری' }}</h1>
      @if (customer()?.isActive === false) {
        <span class="rounded-full bg-danger-soft px-2 py-0.5 text-xs text-danger">غیرفعال</span>
      }
    </header>

    @if (loadError(); as err) {
      <div class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">
        <p class="m-0">{{ err }}</p>
        <button type="button" class="mt-2 cursor-pointer text-primary underline" (click)="load()">
          تلاش دوباره
        </button>
      </div>
    } @else if (customer(); as c) {
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-1">
          <section
            class="rounded-lg border border-border bg-surface p-5 shadow-card"
            aria-labelledby="pf-h"
          >
            <h2 id="pf-h" class="mb-3 mt-0">اطلاعات</h2>
            <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt class="text-muted">موبایل</dt>
              <dd class="ltr-field m-0 text-end">{{ c.mobile || '—' }}</dd>
              <dt class="text-muted">ایمیل</dt>
              <dd class="ltr-field m-0 text-end">{{ c.email || '—' }}</dd>
              <dt class="text-muted">عضویت</dt>
              <dd class="m-0 text-end">{{ date(c.createdAt) }}</dd>
              <dt class="text-muted">سفارش‌ها</dt>
              <dd class="m-0 text-end">{{ fa(c.ordersCount) }}</dd>
              <dt class="text-muted">جمع خرید</dt>
              <dd class="m-0 text-end">{{ money(c.totalSpentRial) }}</dd>
            </dl>
          </section>

          <section
            class="rounded-lg border border-border bg-surface p-5 shadow-card"
            aria-labelledby="ad-h"
          >
            <h2 id="ad-h" class="mb-3 mt-0">آدرس‌ها</h2>
            @for (a of c.addresses; track $index) {
              <address
                class="mb-3 border-t border-border pt-3 text-sm not-italic first:border-t-0 first:pt-0"
              >
                @if (a.title) {
                  <strong>{{ a.title }}</strong
                  ><br />
                }
                {{ a.recipient }}<br />{{ a.province }}، {{ a.city }}<br />{{ a.address }}
                @if (a.postalCode) {
                  <br /><span class="ltr-field text-muted">{{ a.postalCode }}</span>
                }
              </address>
            } @empty {
              <p class="m-0 text-sm text-muted">آدرسی ثبت نشده است.</p>
            }
          </section>
        </div>

        <section
          class="rounded-lg border border-border bg-surface p-5 shadow-card lg:col-span-2"
          aria-labelledby="oh-h"
        >
          <h2 id="oh-h" class="mb-3 mt-0">تاریخچه سفارش‌ها</h2>
          @if (canSeeOrders()) {
            <app-data-table
              [columns]="orderColumns"
              [rows]="orders.items()"
              [rowKey]="orderKey"
              [loading]="orders.loading()"
              [error]="orders.error()"
              caption="سفارش‌های مشتری"
              emptyText="این مشتری هنوز سفارشی ندارد."
              (retry)="loadOrders(ordersPage())"
            >
              <ng-template #cell let-row let-col="column">
                @switch (col.key) {
                  @case ('number') {
                    <a
                      [routerLink]="['/orders', row.id]"
                      class="ltr-field text-primary no-underline hover:underline"
                      >{{ row.number }}</a
                    >
                  }
                  @default {
                    {{ col.cell ? col.cell(row) : '' }}
                  }
                }
              </ng-template>
            </app-data-table>
            @if (orders.meta(); as m) {
              <app-pagination
                [page]="m.page"
                [totalPages]="m.totalPages"
                [totalItems]="m.totalItems"
                (pageChange)="loadOrders($event)"
              />
            }
          } @else {
            <p class="m-0 text-sm text-muted" role="status">
              برای دیدن سفارش‌های مشتری به دسترسی «مشاهده سفارش‌ها» نیاز دارید.
            </p>
          }
        </section>
      </div>
    } @else {
      <p class="text-muted" role="status">در حال بارگذاری…</p>
    }
  `,
})
export class CustomerDetailPage {
  readonly id = input.required<string>();

  private readonly api = inject(CustomersApi);
  private readonly store = inject(AuthStore);

  protected readonly customer = signal<CustomerDetail | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly ordersPage = signal(1);
  protected readonly canSeeOrders = computed(() =>
    this.store.can({ all: [Permissions.OrdersRead] }),
  );

  protected readonly orders = new PagedList<CustomerOrder, { id: string; page: number }>(
    (q) => this.api.orders(q.id, q.page),
    (e) => ApiError.from(e).message,
  );

  protected readonly orderColumns: TableColumn<CustomerOrder>[] = [
    { key: 'number', header: 'شماره سفارش' },
    { key: 'status', header: 'وضعیت', cell: (o) => o.status },
    { key: 'payment', header: 'پرداخت', cell: (o) => o.paymentStatus },
    { key: 'total', header: 'مبلغ', cell: (o) => formatMoney(o.totalRial) },
    { key: 'createdAt', header: 'زمان', cell: (o) => formatJalaliDateTime(o.createdAt) },
  ];
  protected readonly orderKey = (o: CustomerOrder) => o.id;

  constructor() {
    effect(() => {
      this.id();
      this.load();
    });
  }

  protected fa = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
  protected money = (rial: number | null | undefined) => formatMoney(rial);
  protected date = (iso: string) => formatJalaliDate(iso);

  protected load(): void {
    this.loadError.set(null);
    this.api.get(this.id()).subscribe({
      next: (c) => {
        this.customer.set(c);
        if (this.canSeeOrders()) this.loadOrders(1);
      },
      error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
    });
  }

  protected loadOrders(page: number): void {
    this.ordersPage.set(page);
    this.orders.load({ id: this.id(), page });
  }
}
