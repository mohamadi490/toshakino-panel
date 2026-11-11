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
import { AuthStore } from '../../core/auth/auth.store';
import { CanDirective } from '../../core/authorization/can.directive';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { PagedList } from '../../shared/tables/paged-list';
import { PaginationComponent } from '../../shared/tables/pagination';
import { ButtonComponent } from '../../shared/ui/button';
import { ConfirmService } from '../../shared/ui/confirm';
import { IconComponent } from '../../shared/ui/icon';
import { formatJalaliDate } from '../../shared/utilities/jalali-date';
import { formatMoney } from '../../shared/utilities/money';
import { CatalogApi } from './catalog.api';
import {
  Category,
  ProductListQuery,
  ProductSummary,
  PublishStatus,
  STATUS_LABELS,
} from './catalog.models';
import { flattenCategoryTree } from './category-tree';

@Component({
  selector: 'app-products-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CanDirective,
    DataTableComponent,
    PaginationComponent,
    IconComponent,
    ButtonComponent,
  ],
  template: `
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="m-0">محصولات</h1>
      <a *appCan="{ all: [P.ProductsCreate] }" routerLink="new" class="no-underline">
        <span
          class="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
        >
          <app-icon name="plus" [size]="16" /> محصول جدید
        </span>
      </a>
    </header>

    <div class="mb-3 flex flex-wrap gap-3">
      <input
        type="search"
        [formControl]="searchControl"
        placeholder="جستجو بر اساس عنوان یا اسلاگ"
        aria-label="جستجو"
        class="h-10 min-w-64 grow rounded-md border border-border bg-surface px-3 text-sm"
      />
      <select
        aria-label="وضعیت"
        class="h-10 rounded-md border border-border bg-surface px-3 text-sm"
        [value]="status()"
        (change)="setStatus($any($event.target).value)"
      >
        <option value="">همه وضعیت‌ها</option>
        @for (s of statuses; track s.value) {
          <option [value]="s.value">{{ s.label }}</option>
        }
      </select>
      @if (categoryOptions().length > 0) {
        <select
          aria-label="دسته‌بندی"
          class="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          [value]="categoryId()"
          (change)="setCategory($any($event.target).value)"
        >
          <option value="">همه دسته‌بندی‌ها</option>
          @for (c of categoryOptions(); track c.id) {
            <option [value]="c.id">{{ '— '.repeat(c.depth) }}{{ c.title }}</option>
          }
        </select>
      }
    </div>

    <app-data-table
      [columns]="columns"
      [rows]="list.items()"
      [rowKey]="rowKey"
      [loading]="list.loading()"
      [error]="list.error()"
      caption="فهرست محصولات"
      emptyText="محصولی یافت نشد."
      (retry)="reload()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('title') {
            <a
              [routerLink]="row.id"
              class="font-medium text-primary no-underline hover:underline"
              >{{ row.title }}</a
            >
            <span class="ltr-field block text-xs text-muted">{{ row.slug }}</span>
          }
          @case ('status') {
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              [class]="
                row.status === 'published'
                  ? 'bg-success-soft text-success'
                  : row.status === 'draft'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-surface-muted text-muted'
              "
            >
              {{ statusLabel(row.status) }}
            </span>
          }
          @case ('actions') {
            <div class="flex justify-end">
              @if (canPublish() && row.status !== 'archived') {
                <button app-button variant="ghost" type="button" (click)="togglePublish(row)">
                  {{ row.status === 'published' ? 'لغو انتشار' : 'انتشار' }}
                </button>
              }
            </div>
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
export class ProductsListPage {
  protected readonly P = Permissions;
  private readonly api = inject(CatalogApi);
  private readonly store = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);
  protected readonly status = signal<'' | PublishStatus>('');
  protected readonly categoryId = signal('');
  private readonly search = signal('');
  protected readonly categoryOptions = signal<{ id: string; title: string; depth: number }[]>([]);
  protected readonly statuses = (Object.keys(STATUS_LABELS) as PublishStatus[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  }));

  protected readonly list = new PagedList<ProductSummary, ProductListQuery>(
    (q) => this.api.products(q),
    (e) => ApiError.from(e).message,
  );

  protected readonly columns: TableColumn<ProductSummary>[] = [
    { key: 'title', header: 'محصول' },
    { key: 'category', header: 'دسته‌بندی', cell: (p) => p.categoryTitle || '—' },
    { key: 'status', header: 'وضعیت' },
    {
      key: 'variants',
      header: 'Variant',
      cell: (p) => new Intl.NumberFormat('fa-IR').format(p.variantCount),
    },
    { key: 'price', header: 'قیمت از', cell: (p) => formatMoney(p.minPriceRial) },
    { key: 'updatedAt', header: 'آخرین ویرایش', cell: (p) => formatJalaliDate(p.updatedAt) },
    { key: 'actions', header: '' },
  ];
  protected readonly rowKey = (p: ProductSummary) => p.id;

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

    if (this.store.can({ all: [Permissions.CategoriesRead] })) {
      this.api.categories().subscribe({
        next: (p: { data: Category[] }) =>
          this.categoryOptions.set(
            flattenCategoryTree(p.data).map((n) => ({
              id: n.category.id,
              title: n.category.title,
              depth: n.depth,
            })),
          ),
        error: () => this.categoryOptions.set([]), // the filter is optional; the list still works
      });
    }
  }

  private query(): ProductListQuery {
    return {
      page: this.page(),
      pageSize: 20,
      search: this.search() || undefined,
      status: this.status() || undefined,
      categoryId: this.categoryId() || undefined,
    };
  }

  protected setStatus(v: '' | PublishStatus): void {
    this.status.set(v);
    this.page.set(1);
  }
  protected setCategory(v: string): void {
    this.categoryId.set(v);
    this.page.set(1);
  }
  protected reload(): void {
    this.list.load(this.query());
  }
  protected canPublish(): boolean {
    return this.store.can({ all: [Permissions.ProductsPublish] });
  }
  protected statusLabel(s: PublishStatus): string {
    return STATUS_LABELS[s] ?? s;
  }

  protected async togglePublish(p: ProductSummary): Promise<void> {
    const publishing = p.status !== 'published';
    const ok = await this.confirm.confirm({
      title: publishing ? 'انتشار محصول' : 'لغو انتشار محصول',
      message: publishing
        ? `«${p.title}» برای مشتریان قابل مشاهده و خرید می‌شود. ادامه می‌دهید؟`
        : `«${p.title}» از فروشگاه مخفی می‌شود. ادامه می‌دهید؟`,
      confirmLabel: publishing ? 'انتشار' : 'لغو انتشار',
      danger: !publishing,
    });
    if (!ok) return;
    (publishing ? this.api.publishProduct(p.id) : this.api.unpublishProduct(p.id)).subscribe({
      next: () => {
        this.notify.success(publishing ? 'محصول منتشر شد.' : 'انتشار محصول لغو شد.');
        this.reload();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }
}
