import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { CategoryRead } from '../../core/api/schemas';
import { NotificationService } from '../../core/error-handling/notification.service';
import { PUBLISH_STATUS_LABELS } from '../../shared/domain/status-labels';
import { flattenTree } from '../../shared/domain/tree';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { ButtonComponent } from '../../shared/ui/button';
import { ConfirmService } from '../../shared/ui/confirm';
import { IconComponent } from '../../shared/ui/icon';
import { SegmentedComponent } from '../../shared/ui/segmented';
import { TaxonomyApi } from './taxonomy.api';

type View = 'active' | 'deleted';
interface Row {
  item: CategoryRead;
  depth: number;
}

@Component({
  selector: 'app-categories-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DataTableComponent, IconComponent, ButtonComponent, SegmentedComponent],
  template: `
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="m-0">دسته‌بندی‌ها</h1>
      <a routerLink="new" class="no-underline">
        <span
          class="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
        >
          <app-icon name="plus" [size]="16" /> دسته‌بندی جدید
        </span>
      </a>
    </header>
    <div class="mb-3">
      <app-segmented
        label="نمایش"
        [options]="views"
        [value]="view()"
        (valueChange)="view.set($event)"
      />
    </div>

    <app-data-table
      [columns]="columns"
      [rows]="rows()"
      [rowKey]="rowKey"
      [loading]="loading()"
      [error]="error()"
      caption="درخت دسته‌بندی‌ها"
      [emptyText]="
        view() === 'active' ? 'هنوز دسته‌بندی‌ای ثبت نشده است.' : 'دسته‌بندی حذف‌شده‌ای وجود ندارد.'
      "
      (retry)="load()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('name') {
            <span [style.padding-inline-start.rem]="row.depth * 1.25">
              @if (row.depth > 0) {
                <span class="text-muted" aria-hidden="true">↳ </span>
              }
              <a
                [routerLink]="row.item.id"
                class="font-medium text-primary no-underline hover:underline"
                >{{ row.item.name }}</a
              >
            </span>
          }
          @case ('status') {
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              [class]="
                row.item.status === 'published'
                  ? 'bg-success-soft text-success'
                  : 'bg-warning-soft text-warning'
              "
            >
              {{ statusLabel(row.item.status) }}
            </span>
          }
          @case ('actions') {
            <div class="flex justify-end">
              @if (view() === 'active') {
                <button app-button variant="ghost" type="button" (click)="remove(row.item)">
                  حذف
                </button>
              } @else {
                <button app-button variant="ghost" type="button" (click)="restore(row.item)">
                  بازیابی
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
  `,
})
export class CategoriesListPage {
  private readonly api = inject(TaxonomyApi);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly views: { value: View; label: string }[] = [
    { value: 'active', label: 'فعال' },
    { value: 'deleted', label: 'حذف‌شده‌ها' },
  ];
  protected readonly view = signal<View>('active');
  protected readonly items = signal<CategoryRead[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Active categories are shown as a tree; the deleted list is flat (their parents may be gone). */
  protected readonly rows = computed<Row[]>(() =>
    this.view() === 'active'
      ? flattenTree(this.items()).map((n) => ({ item: n.item, depth: n.depth }))
      : [...this.items()]
          .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
          .map((item) => ({ item, depth: 0 })),
  );

  protected readonly columns: TableColumn<Row>[] = [
    { key: 'name', header: 'نام' },
    { key: 'slug', header: 'اسلاگ', cell: (r) => r.item.slug, class: 'ltr-field' },
    { key: 'status', header: 'وضعیت' },
    {
      key: 'position',
      header: 'ترتیب',
      cell: (r) => new Intl.NumberFormat('fa-IR').format(r.item.position),
    },
    { key: 'actions', header: '' },
  ];
  protected readonly rowKey = (r: Row) => r.item.id;
  protected readonly statusLabel = (s: string) => PUBLISH_STATUS_LABELS[s] ?? s;

  constructor() {
    effect(() => {
      this.view();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.categories(this.view() === 'deleted').subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(ApiError.from(e).message);
        this.loading.set(false);
      },
    });
  }

  protected async remove(c: CategoryRead): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'حذف دسته‌بندی',
      message: `«${c.name}» حذف می‌شود (قابل بازیابی است). اگر محصول یا زیرمجموعه داشته باشد، حذف انجام نمی‌شود. ادامه می‌دهید؟`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteCategory(c.id).subscribe({
      next: () => {
        this.notify.success('دسته‌بندی حذف شد.');
        this.load();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }

  protected restore(c: CategoryRead): void {
    this.api.restoreCategory(c.id).subscribe({
      next: () => {
        this.notify.success('دسته‌بندی بازیابی شد.');
        this.load();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }
}
