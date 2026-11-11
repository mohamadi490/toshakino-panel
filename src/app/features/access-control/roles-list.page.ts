import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { CanDirective } from '../../core/authorization/can.directive';
import { Permissions } from '../../core/authorization/permissions';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { PagedList } from '../../shared/tables/paged-list';
import { IconComponent } from '../../shared/ui/icon';
import { AccessApi } from './access.api';
import { AdminRole } from './access.models';

@Component({
  selector: 'app-roles-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CanDirective, DataTableComponent, IconComponent],
  template: `
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="m-0">نقش‌ها و مجوزها</h1>
      <a *appCan="{ all: [P.RolesCreate] }" routerLink="new" class="no-underline">
        <span
          class="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
        >
          <app-icon name="plus" [size]="16" /> نقش جدید
        </span>
      </a>
    </header>
    <app-data-table
      [columns]="columns"
      [rows]="list.items()"
      [rowKey]="rowKey"
      [loading]="list.loading()"
      [error]="list.error()"
      caption="فهرست نقش‌ها"
      emptyText="نقشی تعریف نشده است."
      (retry)="load()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('name') {
            <a
              [routerLink]="row.id"
              class="font-medium text-primary no-underline hover:underline"
              >{{ row.name }}</a
            >
            @if (row.isSystem) {
              <span class="ms-2 rounded-full bg-info-soft px-2 py-0.5 text-xs text-info"
                >سیستمی</span
              >
            }
          }
          @default {
            {{ col.cell ? col.cell(row) : '' }}
          }
        }
      </ng-template>
    </app-data-table>
  `,
})
export class RolesListPage {
  protected readonly P = Permissions;
  private readonly api = inject(AccessApi);

  protected readonly list = new PagedList<AdminRole, void>(
    () => this.api.roles(),
    (e) => ApiError.from(e).message,
  );
  protected readonly columns: TableColumn<AdminRole>[] = [
    { key: 'name', header: 'نقش' },
    { key: 'description', header: 'توضیحات', cell: (r) => r.description || '—' },
    {
      key: 'permissions',
      header: 'تعداد مجوز',
      cell: (r) => new Intl.NumberFormat('fa-IR').format(r.permissions.length),
    },
    {
      key: 'userCount',
      header: 'تعداد کاربر',
      cell: (r) =>
        r.userCount === undefined ? '—' : new Intl.NumberFormat('fa-IR').format(r.userCount),
    },
  ];
  protected readonly rowKey = (r: AdminRole) => r.id;

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.list.destroy());
  }

  protected load(): void {
    this.list.load(undefined);
  }
}
