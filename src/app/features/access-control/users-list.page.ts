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
import { RoleRead, UserRead } from '../../core/api/schemas';
import { userDisplayName } from '../../core/auth/auth.models';
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
import { AccessApi } from './access.api';
import { UserListQuery } from './access.models';

type StatusFilter = '' | 'active' | 'inactive';

@Component({
  selector: 'app-users-list-page',
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
      <h1 class="m-0">کاربران</h1>
      <a *appCan="{ all: [P.UsersWrite] }" routerLink="new" class="no-underline">
        <span
          class="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
        >
          <app-icon name="plus" [size]="16" /> کاربر جدید
        </span>
      </a>
    </header>

    <div class="mb-3 flex flex-wrap gap-3">
      <input
        type="search"
        [formControl]="searchControl"
        placeholder="جستجو بر اساس نام، ایمیل، نام کاربری یا موبایل"
        aria-label="جستجو"
        class="h-10 min-w-64 grow rounded-md border border-border bg-surface px-3 text-sm"
      />
      @if (roles().length > 0) {
        <select
          aria-label="نقش"
          class="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          [value]="roleId()"
          (change)="setRole($any($event.target).value)"
        >
          <option value="">همه نقش‌ها</option>
          @for (r of roles(); track r.id) {
            <option [value]="r.id">{{ r.name }}</option>
          }
        </select>
      }
      <select
        aria-label="وضعیت"
        class="h-10 rounded-md border border-border bg-surface px-3 text-sm"
        [value]="status()"
        (change)="setStatus($any($event.target).value)"
      >
        <option value="">همه وضعیت‌ها</option>
        <option value="active">فعال</option>
        <option value="inactive">غیرفعال</option>
      </select>
    </div>

    <app-data-table
      [columns]="columns"
      [rows]="list.items()"
      [rowKey]="rowKey"
      [loading]="list.loading()"
      [error]="list.error()"
      caption="فهرست کاربران"
      emptyText="کاربری یافت نشد."
      (retry)="reload()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('name') {
            <a
              [routerLink]="row.id"
              class="font-medium text-primary no-underline hover:underline"
              >{{ name(row) }}</a
            >
          }
          @case ('role') {
            {{ row.role.name }}
            <span
              class="ms-1 rounded-full px-2 py-0.5 text-xs"
              [class]="row.role.isStaff ? 'bg-info-soft text-info' : 'bg-surface-muted text-muted'"
            >
              {{ row.role.isStaff ? 'کارمند' : 'مشتری' }}
            </span>
          }
          @case ('isActive') {
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              [class]="row.isActive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'"
            >
              {{ row.isActive ? 'فعال' : 'غیرفعال' }}
            </span>
          }
          @case ('actions') {
            <div class="flex justify-end">
              @if (canToggle(row)) {
                <button app-button variant="ghost" type="button" (click)="toggle(row)">
                  {{ row.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی' }}
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

    @if (list.pagination(); as m) {
      <app-pagination
        [page]="m.page"
        [totalPages]="m.totalPages"
        [totalItems]="m.totalItems"
        (pageChange)="page.set($event)"
      />
    }
  `,
})
export class UsersListPage {
  protected readonly P = Permissions;
  private readonly api = inject(AccessApi);
  private readonly store = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);
  protected readonly status = signal<StatusFilter>('');
  protected readonly roleId = signal('');
  protected readonly roles = signal<RoleRead[]>([]);
  private readonly q = signal('');

  protected readonly list = new PagedList<UserRead, UserListQuery>(
    (query) => this.api.users(query),
    (e) => ApiError.from(e).message,
  );

  protected readonly columns: TableColumn<UserRead>[] = [
    { key: 'name', header: 'نام' },
    {
      key: 'contact',
      header: 'شناسه‌ها',
      cell: (u) => [u.username, u.email, u.mobile].filter(Boolean).join(' · ') || '—',
      class: 'ltr-field',
    },
    { key: 'role', header: 'نقش' },
    { key: 'isActive', header: 'وضعیت' },
    { key: 'createdAt', header: 'تاریخ ثبت', cell: (u) => formatJalaliDate(u.createdAt) },
    { key: 'actions', header: '' },
  ];
  protected readonly rowKey = (u: UserRead) => u.id;
  protected readonly name = (u: UserRead) => userDisplayName(u);

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((v) => {
        this.q.set(v.trim());
        this.page.set(1);
      });

    effect(() => {
      const query = this.query();
      untracked(() => this.list.load(query));
    });
    inject(DestroyRef).onDestroy(() => this.list.destroy());

    // The role filter is optional: without `roles.read` the list still works.
    if (this.store.can({ all: [Permissions.RolesRead] })) {
      this.api
        .roles()
        .subscribe({ next: (r) => this.roles.set(r), error: () => this.roles.set([]) });
    }
  }

  private query(): UserListQuery {
    return {
      page: this.page(),
      pageSize: 20,
      q: this.q() || undefined,
      roleId: this.roleId() ? Number(this.roleId()) : undefined,
      isActive: this.status() === '' ? undefined : this.status() === 'active',
    };
  }

  protected setStatus(v: StatusFilter): void {
    this.status.set(v);
    this.page.set(1);
  }
  protected setRole(v: string): void {
    this.roleId.set(v);
    this.page.set(1);
  }
  protected reload(): void {
    this.list.load(this.query());
  }

  /** UX only: the backend enforces `cannot_modify_self` and `last_super_admin`. */
  protected canToggle(u: UserRead): boolean {
    return this.store.can({ all: [Permissions.UsersWrite] }) && u.id !== this.store.user()?.id;
  }

  protected async toggle(u: UserRead): Promise<void> {
    const disabling = u.isActive;
    const ok = await this.confirm.confirm({
      title: disabling ? 'غیرفعال‌سازی کاربر' : 'فعال‌سازی کاربر',
      message: disabling
        ? `«${userDisplayName(u)}» دیگر نمی‌تواند وارد شود. ادامه می‌دهید؟`
        : `«${userDisplayName(u)}» دوباره می‌تواند وارد شود. ادامه می‌دهید؟`,
      confirmLabel: disabling ? 'غیرفعال‌سازی' : 'فعال‌سازی',
      danger: disabling,
    });
    if (!ok) return;
    this.api.updateUser(u.id, { isActive: !u.isActive }).subscribe({
      next: () => {
        this.notify.success(disabling ? 'کاربر غیرفعال شد.' : 'کاربر فعال شد.');
        this.reload();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }
}
