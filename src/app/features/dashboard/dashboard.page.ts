import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import {
  ORDER_STATUS_LABELS,
  TONE_CLASSES,
  labelOf,
  toneOf,
} from '../../shared/domain/status-labels';
import { BarChartComponent, BarDatum } from '../../shared/ui/bar-chart';
import { formatJalaliDate, formatJalaliShort } from '../../shared/utilities/jalali-date';
import { formatMoney } from '../../shared/utilities/money';
import { DashboardApi } from './dashboard.api';
import { DashboardRange, DashboardSummary, RANGE_LABELS } from './dashboard.models';

const fa = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BarChartComponent],
  template: `
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="m-0">سلام {{ store.user()?.displayName }}</h1>
        @if (periodText(); as p) {
          <p class="m-0 text-sm text-muted">{{ p }}</p>
        }
      </div>
      @if (canView()) {
        <div
          class="inline-flex rounded-md border border-border bg-surface-muted p-0.5"
          role="group"
          aria-label="بازه زمانی"
        >
          @for (r of ranges; track r.value) {
            <button
              type="button"
              class="h-8 cursor-pointer rounded-sm px-3 text-sm"
              [class.bg-surface]="range() === r.value"
              [class.shadow-card]="range() === r.value"
              [attr.aria-pressed]="range() === r.value"
              (click)="range.set(r.value)"
            >
              {{ r.label }}
            </button>
          }
        </div>
      }
    </header>

    @if (!canView()) {
      <p class="rounded-md bg-surface-muted p-4 text-sm text-muted" role="status">
        برای دیدن آمار فروش به دسترسی «مشاهده گزارش‌ها» نیاز دارید. از منوی کناری بخش‌های مجاز خود
        را باز کنید.
      </p>
    } @else if (error(); as err) {
      <div class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">
        <p class="m-0">{{ err }}</p>
        <button
          type="button"
          class="mt-2 cursor-pointer text-primary underline"
          (click)="load(range())"
        >
          تلاش دوباره
        </button>
      </div>
    } @else if (summary(); as s) {
      <div
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        [class.opacity-60]="loading()"
        [attr.aria-busy]="loading() || null"
      >
        <section
          class="rounded-lg border border-border bg-surface p-4 shadow-card"
          aria-labelledby="k-orders"
        >
          <p id="k-orders" class="m-0 text-sm text-muted">تعداد سفارش‌ها</p>
          <p class="m-0 mt-1 text-2xl font-bold">{{ fa(s.ordersCount) }}</p>
        </section>
        <section
          class="rounded-lg border border-border bg-surface p-4 shadow-card"
          aria-labelledby="k-sales"
        >
          <p id="k-sales" class="m-0 text-sm text-muted">فروش (پرداخت‌شده)</p>
          <p class="m-0 mt-1 text-2xl font-bold">{{ money(s.salesRial) }}</p>
        </section>
        @if (hasNumber(s.averageOrderRial)) {
          <section
            class="rounded-lg border border-border bg-surface p-4 shadow-card"
            aria-labelledby="k-avg"
          >
            <p id="k-avg" class="m-0 text-sm text-muted">میانگین سفارش</p>
            <p class="m-0 mt-1 text-2xl font-bold">{{ money(s.averageOrderRial!) }}</p>
          </section>
        }
        @if (hasNumber(s.pendingOrdersCount)) {
          <section
            class="rounded-lg border border-border bg-surface p-4 shadow-card"
            aria-labelledby="k-pending"
          >
            <p id="k-pending" class="m-0 text-sm text-muted">سفارش‌های در انتظار</p>
            <p class="m-0 mt-1 text-2xl font-bold text-warning">{{ fa(s.pendingOrdersCount!) }}</p>
            @if (canSeeOrders()) {
              <a routerLink="/orders" class="text-xs text-primary">مشاهده سفارش‌ها</a>
            }
          </section>
        }
        @if (hasNumber(s.lowStockCount)) {
          <section
            class="rounded-lg border border-border bg-surface p-4 shadow-card"
            aria-labelledby="k-stock"
          >
            <p id="k-stock" class="m-0 text-sm text-muted">SKU کم‌موجود</p>
            <p class="m-0 mt-1 text-2xl font-bold text-warning">{{ fa(s.lowStockCount!) }}</p>
            @if (canSeeInventory()) {
              <a routerLink="/inventory" class="text-xs text-primary">مشاهده موجودی</a>
            }
          </section>
        }
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-3">
        <section
          class="rounded-lg border border-border bg-surface p-5 shadow-card lg:col-span-2"
          aria-labelledby="h-sales"
        >
          <h2 id="h-sales" class="mb-3 mt-0">روند فروش</h2>
          @if (series().length > 0 && hasSales()) {
            <app-bar-chart [data]="series()" ariaLabel="فروش روزانه به تومان" [format]="money" />
          } @else {
            <p class="m-0 py-8 text-center text-sm text-muted">در این بازه فروشی ثبت نشده است.</p>
          }
        </section>

        <section
          class="rounded-lg border border-border bg-surface p-5 shadow-card"
          aria-labelledby="h-status"
        >
          <h2 id="h-status" class="mb-3 mt-0">وضعیت سفارش‌ها</h2>
          @for (row of statusRows(); track row.status) {
            <div class="mb-3">
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="rounded-full px-2 py-0.5 text-xs" [class]="row.tone">{{
                  row.label
                }}</span>
                <span>{{ fa(row.count) }}</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                <div class="h-full rounded-full bg-primary" [style.width.%]="row.percent"></div>
              </div>
            </div>
          } @empty {
            <p class="m-0 text-sm text-muted">سفارشی در این بازه وجود ندارد.</p>
          }
        </section>
      </div>
    } @else {
      <div
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-busy="true"
        role="status"
        aria-label="در حال بارگذاری"
      >
        @for (n of [1, 2, 3, 4]; track n) {
          <div class="h-24 animate-pulse rounded-lg bg-surface-muted"></div>
        }
      </div>
    }
  `,
})
export class DashboardPage {
  protected readonly store = inject(AuthStore);
  private readonly api = inject(DashboardApi);

  protected readonly ranges = (Object.keys(RANGE_LABELS) as DashboardRange[]).map((value) => ({
    value,
    label: RANGE_LABELS[value],
  }));
  protected readonly range = signal<DashboardRange>('7d');
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canView = computed(() => this.store.can({ all: [Permissions.ReportsRead] }));
  protected readonly canSeeOrders = computed(() =>
    this.store.can({ all: [Permissions.OrdersRead] }),
  );
  protected readonly canSeeInventory = computed(() =>
    this.store.can({ all: [Permissions.InventoryRead] }),
  );

  protected readonly series = computed<BarDatum[]>(() =>
    (this.summary()?.salesSeries ?? []).map((p) => ({
      label: formatJalaliShort(p.date),
      value: p.salesRial,
    })),
  );
  protected readonly hasSales = computed(() => this.series().some((d) => d.value > 0));

  protected readonly statusRows = computed(() => {
    const rows = this.summary()?.ordersByStatus ?? [];
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    return rows.map((r) => ({
      status: r.status,
      label: r.label || labelOf(ORDER_STATUS_LABELS, r.status),
      count: r.count,
      percent: total > 0 ? Math.round((r.count / total) * 100) : 0,
      tone: TONE_CLASSES[toneOf(r.status)],
    }));
  });

  protected readonly periodText = computed(() => {
    const r = this.summary()?.range;
    return r ? `از ${formatJalaliDate(r.from)} تا ${formatJalaliDate(r.to)}` : null;
  });

  private sub: Subscription | null = null;

  constructor() {
    effect(() => {
      const r = this.range();
      if (!this.canView()) return;
      untracked(() => this.load(r));
    });
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  protected fa = fa;
  protected money = (rial: number) => formatMoney(rial);
  protected hasNumber = (v: number | null | undefined): boolean => typeof v === 'number';

  /** A newer range selection cancels the in-flight request so a slow old response cannot overwrite it. */
  protected load(range: DashboardRange): void {
    this.sub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.sub = this.api.summary(range).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(ApiError.from(e).message);
        this.loading.set(false);
      },
    });
  }
}
