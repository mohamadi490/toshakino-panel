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
import { formatJalaliDate } from '../../shared/utilities/jalali-date';
import { formatMoney } from '../../shared/utilities/money';
import { CustomersApi } from './customers.api';
import { CustomerListQuery, CustomerSummary } from './customers.models';

const SORTS = [
  { value: '-createdAt', label: 'جدیدترین عضو' },
  { value: '-ordersCount', label: 'بیشترین سفارش' },
  { value: '-totalSpent', label: 'بیشترین خرید' },
];

@Component({
  selector: 'app-customers-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DataTableComponent, PaginationComponent],
  template: `
    <header class="mb-4"><h1 class="m-0">مشتری‌ها</h1></header>
    <div class="mb-3 flex flex-wrap gap-3">
      <input
        type="search"
        [formControl]="searchControl"
        placeholder="جستجو بر اساس نام، موبایل یا ایمیل"
        aria-label="جستجو"
        class="h-10 min-w-64 grow rounded-md border border-border bg-surface px-3 text-sm"
      />
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
      caption="فهرست مشتری‌ها"
      emptyText="مشتری‌ای یافت نشد."
      (retry)="reload()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('name') {
            <a
              [routerLink]="row.id"
              class="font-medium text-primary no-underline hover:underline"
              >{{ row.name }}</a
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
export class CustomersListPage {
  private readonly api = inject(CustomersApi);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);
  protected readonly sort = signal('-createdAt');
  private readonly search = signal('');
  protected readonly sorts = SORTS;

  protected readonly list = new PagedList<CustomerSummary, CustomerListQuery>(
    (q) => this.api.list(q),
    (e) => ApiError.from(e).message,
  );

  protected readonly columns: TableColumn<CustomerSummary>[] = [
    { key: 'name', header: 'نام' },
    { key: 'contact', header: 'تماس', cell: (c) => c.mobile || c.email || '—', class: 'ltr-field' },
    {
      key: 'orders',
      header: 'سفارش‌ها',
      cell: (c) => new Intl.NumberFormat('fa-IR').format(c.ordersCount),
    },
    { key: 'spent', header: 'جمع خرید', cell: (c) => formatMoney(c.totalSpentRial) },
    { key: 'lastOrder', header: 'آخرین سفارش', cell: (c) => formatJalaliDate(c.lastOrderAt) },
    { key: 'createdAt', header: 'تاریخ عضویت', cell: (c) => formatJalaliDate(c.createdAt) },
  ];
  protected readonly rowKey = (c: CustomerSummary) => c.id;

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

  private query(): CustomerListQuery {
    return {
      page: this.page(),
      pageSize: 20,
      sort: this.sort(),
      search: this.search() || undefined,
    };
  }
  protected setSort(v: string): void {
    this.sort.set(v);
    this.page.set(1);
  }
  protected reload(): void {
    this.list.load(this.query());
  }
}
