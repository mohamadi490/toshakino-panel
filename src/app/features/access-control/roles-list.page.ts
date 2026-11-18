import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { RoleRead } from '../../core/api/schemas';
import { AuthStore } from '../../core/auth/auth.store';
import { CanDirective } from '../../core/authorization/can.directive';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { ButtonComponent } from '../../shared/ui/button';
import { ConfirmService } from '../../shared/ui/confirm';
import { IconComponent } from '../../shared/ui/icon';
import { AccessApi } from './access.api';

@Component({
  selector: 'app-roles-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CanDirective, DataTableComponent, IconComponent, ButtonComponent],
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
      [rows]="roles()"
      [rowKey]="rowKey"
      [loading]="loading()"
      [error]="error()"
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
          @case ('type') {
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              [class]="row.isStaff ? 'bg-info-soft text-info' : 'bg-surface-muted text-muted'"
              >{{ row.isStaff ? 'کارمند' : 'مشتری' }}</span
            >
          }
          @case ('actions') {
            <div class="flex justify-end">
              @if (canDelete(row)) {
                <button app-button variant="ghost" type="button" (click)="remove(row)">حذف</button>
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
export class RolesListPage {
  protected readonly P = Permissions;
  private readonly api = inject(AccessApi);
  private readonly store = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly roles = signal<RoleRead[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly columns: TableColumn<RoleRead>[] = [
    { key: 'name', header: 'نقش' },
    { key: 'type', header: 'نوع' },
    { key: 'description', header: 'توضیحات', cell: (r) => r.description || '—' },
    {
      key: 'permissions',
      header: 'تعداد مجوز',
      cell: (r) => new Intl.NumberFormat('fa-IR').format(r.permissions.length),
    },
    { key: 'actions', header: '' },
  ];
  protected readonly rowKey = (r: RoleRead) => r.id;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.roles().subscribe({
      next: (r) => {
        this.roles.set(r);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(ApiError.from(e).message);
        this.loading.set(false);
      },
    });
  }

  /** System roles are protected by the backend (`role_protected`); `role_in_use` is reported after the attempt. */
  protected canDelete(r: RoleRead): boolean {
    return !r.isSystem && this.store.can({ all: [Permissions.RolesDelete] });
  }

  protected async remove(r: RoleRead): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'حذف نقش',
      message: `نقش «${r.name}» حذف می‌شود. اگر به کاربری اختصاص داشته باشد، حذف انجام نمی‌شود. ادامه می‌دهید؟`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteRole(r.id).subscribe({
      next: () => {
        this.notify.success('نقش حذف شد.');
        this.load();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }
}
