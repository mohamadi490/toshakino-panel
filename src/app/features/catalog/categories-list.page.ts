import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { CanDirective } from '../../core/authorization/can.directive';
import { Permissions } from '../../core/authorization/permissions';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { PagedList } from '../../shared/tables/paged-list';
import { IconComponent } from '../../shared/ui/icon';
import { CatalogApi } from './catalog.api';
import { Category, STATUS_LABELS } from './catalog.models';
import { CategoryNode, flattenCategoryTree } from './category-tree';

@Component({
  selector: 'app-categories-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CanDirective, DataTableComponent, IconComponent],
  template: `
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="m-0">دسته‌بندی‌ها</h1>
      <a *appCan="{ all: [P.CategoriesManage] }" routerLink="new" class="no-underline">
        <span
          class="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
        >
          <app-icon name="plus" [size]="16" /> دسته‌بندی جدید
        </span>
      </a>
    </header>
    <app-data-table
      [columns]="columns"
      [rows]="nodes()"
      [rowKey]="rowKey"
      [loading]="list.loading()"
      [error]="list.error()"
      caption="درخت دسته‌بندی‌ها"
      emptyText="هنوز دسته‌بندی‌ای ثبت نشده است."
      (retry)="load()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('title') {
            <span [style.padding-inline-start.rem]="row.depth * 1.25">
              @if (row.depth > 0) {
                <span class="text-muted" aria-hidden="true">↳ </span>
              }
              <a
                [routerLink]="row.category.id"
                class="font-medium text-primary no-underline hover:underline"
                >{{ row.category.title }}</a
              >
            </span>
          }
          @case ('status') {
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              [class]="
                row.category.status === 'published'
                  ? 'bg-success-soft text-success'
                  : row.category.status === 'draft'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-surface-muted text-muted'
              "
            >
              {{ statusLabel(row.category) }}
            </span>
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
  protected readonly P = Permissions;
  private readonly api = inject(CatalogApi);

  protected readonly list = new PagedList<Category, void>(
    () => this.api.categories(),
    (e) => ApiError.from(e).message,
  );
  protected readonly nodes = computed(() => flattenCategoryTree(this.list.items()));

  protected readonly columns: TableColumn<CategoryNode>[] = [
    { key: 'title', header: 'عنوان' },
    { key: 'slug', header: 'اسلاگ', cell: (n) => n.category.slug, class: 'ltr-field' },
    { key: 'status', header: 'وضعیت' },
    {
      key: 'sortOrder',
      header: 'ترتیب',
      cell: (n) => new Intl.NumberFormat('fa-IR').format(n.category.sortOrder),
    },
    {
      key: 'productCount',
      header: 'محصولات',
      cell: (n) =>
        n.category.productCount === undefined
          ? '—'
          : new Intl.NumberFormat('fa-IR').format(n.category.productCount),
    },
  ];
  protected readonly rowKey = (n: CategoryNode) => n.category.id;

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.list.destroy());
  }

  protected load(): void {
    this.list.load(undefined);
  }

  protected statusLabel(c: Category): string {
    return STATUS_LABELS[c.status] ?? c.status;
  }
}
