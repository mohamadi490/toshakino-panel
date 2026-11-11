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
import { formatJalaliDateTime } from '../../shared/utilities/jalali-date';
import { AccessApi } from './access.api';
import { AdminUserSummary, UserListQuery } from './access.models';

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
      <h1 class="m-0">کاربران پنل</h1>
      <a *appCan="{ all: [P.UsersCreate] }" routerLink="new" class="no-underline">
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
        placeholder="جستجو بر اساس نام، ایمیل یا موبایل"
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
      caption="فهرست کاربران پنل"
      emptyText="کاربری یافت نشد."
      (retry)="reload()"
    >
      <ng-template #cell let-row let-col="column">
        @switch (col.key) {
          @case ('displayName') {
            <a
              [routerLink]="row.id"
              class="font-medium text-primary no-underline hover:underline"
              >{{ row.displayName }}</a
            >
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
            <div class="flex justify-end gap-2">
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
export class UsersListPage {
  protected readonly P = Permissions;
  private readonly api = inject(AccessApi);
  private readonly store = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);
  protected readonly status = signal<StatusFilter>('');
  private readonly search = signal('');

  protected readonly list = new PagedList<AdminUserSummary, UserListQuery>(
    (q) => this.api.users(q),
    (e) => ApiError.from(e).message,
  );

  protected readonly columns: TableColumn<AdminUserSummary>[] = [
    { key: 'displayName', header: 'نام' },
    { key: 'contact', header: 'تماس', cell: (u) => u.email || u.mobile || '—', class: 'ltr-field' },
    { key: 'roles', header: 'نقش‌ها', cell: (u) => u.roles.map((r) => r.name).join('، ') || '—' },
    { key: 'isActive', header: 'وضعیت' },
    { key: 'lastLoginAt', header: 'آخرین ورود', cell: (u) => formatJalaliDateTime(u.lastLoginAt) },
    { key: 'actions', header: '' },
  ];
  protected readonly rowKey = (u: AdminUserSummary) => u.id;

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((v) => {
        this.search.set(v.trim());
        this.page.set(1);
      });

    effect(() => {
      const query: UserListQuery = {
        page: this.page(),
        pageSize: 20,
        search: this.search() || undefined,
        isActive: this.status() === '' ? undefined : this.status() === 'active',
      };
      untracked(() => this.list.load(query));
    });
    this.destroyRef.onDestroy(() => this.list.destroy());
  }

  protected setStatus(v: StatusFilter): void {
    this.status.set(v);
    this.page.set(1);
  }

  protected reload(): void {
    this.page.update((p) => p); // same value does not re-run the effect, so reload explicitly
    this.list.load({
      page: this.page(),
      pageSize: 20,
      search: this.search() || undefined,
      isActive: this.status() === '' ? undefined : this.status() === 'active',
    });
  }

  /** UX only: backend decides. Users cannot disable themselves from here. */
  protected canToggle(u: AdminUserSummary): boolean {
    return this.store.can({ all: [Permissions.UsersDisable] }) && u.id !== this.store.user()?.id;
  }

  protected async toggle(u: AdminUserSummary): Promise<void> {
    const disabling = u.isActive;
    const ok = await this.confirm.confirm({
      title: disabling ? 'غیرفعال‌سازی کاربر' : 'فعال‌سازی کاربر',
      message: disabling
        ? `«${u.displayName}» دیگر نمی‌تواند وارد پنل شود. ادامه می‌دهید؟`
        : `«${u.displayName}» دوباره می‌تواند وارد پنل شود. ادامه می‌دهید؟`,
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
