import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AttributeRead } from '../../core/api/schemas';
import { AuthStore } from '../../core/auth/auth.store';
import { CanDirective } from '../../core/authorization/can.directive';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { ButtonComponent } from '../../shared/ui/button';
import { ConfirmService } from '../../shared/ui/confirm';
import { IconComponent } from '../../shared/ui/icon';
import { TaxonomyApi } from './taxonomy.api';

@Component({
  selector: 'app-attributes-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CanDirective, DataTableComponent, IconComponent, ButtonComponent],
  template: `
    <header class="mb-1 flex flex-wrap items-center justify-between gap-3">
      <h1 class="m-0">ویژگی‌ها</h1>
      <a *appCan="{ all: [P.ProductsWrite] }" routerLink="new" class="no-underline">
        <span
          class="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
        >
          <app-icon name="plus" [size]="16" /> ویژگی جدید
        </span>
      </a>
    </header>
    <p class="mb-4 mt-0 text-sm text-muted">
      هر محصول فقط یک ویژگی (مثل «سایز») دارد و هر Variant یکی از مقدارهای آن را می‌گیرد.
    </p>

    <app-data-table
      [columns]="columns"
      [rows]="items()"
      [rowKey]="rowKey"
      [loading]="loading()"
      [error]="error()"
      caption="فهرست ویژگی‌ها"
      emptyText="هنوز ویژگی‌ای ثبت نشده است."
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
          }
          @case ('actions') {
            <div class="flex justify-end">
              @if (canWrite()) {
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
export class AttributesListPage {
  protected readonly P = Permissions;
  private readonly api = inject(TaxonomyApi);
  private readonly store = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly items = signal<AttributeRead[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly columns: TableColumn<AttributeRead>[] = [
    { key: 'name', header: 'نام' },
    {
      key: 'values',
      header: 'مقدارها',
      cell: (a) => a.values.map((v) => v.value).join('، ') || '—',
    },
    {
      key: 'count',
      header: 'تعداد',
      cell: (a) => new Intl.NumberFormat('fa-IR').format(a.values.length),
    },
    {
      key: 'position',
      header: 'ترتیب',
      cell: (a) => new Intl.NumberFormat('fa-IR').format(a.position),
    },
    { key: 'actions', header: '' },
  ];
  protected readonly rowKey = (a: AttributeRead) => a.id;

  constructor() {
    this.load();
  }

  protected canWrite(): boolean {
    return this.store.can({ all: [Permissions.ProductsWrite] });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.attributes().subscribe({
      next: (list) => {
        this.items.set(
          [...list].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fa')),
        );
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(ApiError.from(e).message);
        this.loading.set(false);
      },
    });
  }

  protected async remove(a: AttributeRead): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'حذف ویژگی',
      message: `ویژگی «${a.name}» با همه مقدارهایش حذف می‌شود. اگر Variant ای از آن استفاده کند، حذف انجام نمی‌شود. ادامه می‌دهید؟`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteAttribute(a.id).subscribe({
      next: () => {
        this.notify.success('ویژگی حذف شد.');
        this.load();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }
}
