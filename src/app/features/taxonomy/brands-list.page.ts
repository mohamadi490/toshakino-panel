import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { BrandAdminRead } from '../../core/api/schemas';
import { NotificationService } from '../../core/error-handling/notification.service';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { ButtonComponent } from '../../shared/ui/button';
import { ConfirmService } from '../../shared/ui/confirm';
import { IconComponent } from '../../shared/ui/icon';
import { SegmentedComponent } from '../../shared/ui/segmented';
import { TaxonomyApi } from './taxonomy.api';

type View = 'active' | 'deleted';

@Component({
  selector: 'app-brands-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DataTableComponent, IconComponent, ButtonComponent, SegmentedComponent],
  template: `
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="m-0">برندها</h1>
      <a routerLink="new" class="no-underline">
        <span
          class="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast"
        >
          <app-icon name="plus" [size]="16" /> برند جدید
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
      [rows]="items()"
      [rowKey]="rowKey"
      [loading]="loading()"
      [error]="error()"
      caption="فهرست برندها"
      [emptyText]="view() === 'active' ? 'هنوز برندی ثبت نشده است.' : 'برند حذف‌شده‌ای وجود ندارد.'"
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
              @if (view() === 'active') {
                <button app-button variant="ghost" type="button" (click)="remove(row)">حذف</button>
              } @else {
                <button app-button variant="ghost" type="button" (click)="restore(row)">
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
export class BrandsListPage {
  private readonly api = inject(TaxonomyApi);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);

  protected readonly views: { value: View; label: string }[] = [
    { value: 'active', label: 'فعال' },
    { value: 'deleted', label: 'حذف‌شده‌ها' },
  ];
  protected readonly view = signal<View>('active');
  protected readonly items = signal<BrandAdminRead[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly columns: TableColumn<BrandAdminRead>[] = [
    { key: 'name', header: 'نام' },
    { key: 'slug', header: 'اسلاگ', cell: (b) => b.slug, class: 'ltr-field' },
    { key: 'description', header: 'توضیحات', cell: (b) => b.description || '—' },
    { key: 'actions', header: '' },
  ];
  protected readonly rowKey = (b: BrandAdminRead) => b.id;

  constructor() {
    effect(() => {
      this.view();
      untracked(() => this.load());
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.brands(this.view() === 'deleted').subscribe({
      next: (list) => {
        this.items.set([...list].sort((a, b) => a.name.localeCompare(b.name, 'fa')));
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(ApiError.from(e).message);
        this.loading.set(false);
      },
    });
  }

  protected async remove(b: BrandAdminRead): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'حذف برند',
      message: `«${b.name}» حذف می‌شود (قابل بازیابی است). اگر محصولی به آن وصل باشد، حذف انجام نمی‌شود. ادامه می‌دهید؟`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteBrand(b.id).subscribe({
      next: () => {
        this.notify.success('برند حذف شد.');
        this.load();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }

  protected restore(b: BrandAdminRead): void {
    this.api.restoreBrand(b.id).subscribe({
      next: () => {
        this.notify.success('برند بازیابی شد.');
        this.load();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }
}
