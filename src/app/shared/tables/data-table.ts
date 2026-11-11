import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  contentChild,
  input,
  output,
} from '@angular/core';

export interface TableColumn<T> {
  key: string;
  header: string;
  /** Plain text accessor; use the `#cell` template for rich cells. */
  cell?: (row: T) => string;
  class?: string;
}

export interface CellContext<T> {
  $implicit: T;
  column: TableColumn<T>;
}

@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    @if (error(); as message) {
      <div
        class="rounded-md border border-border bg-danger-soft p-4 text-sm text-danger"
        role="alert"
      >
        <p class="m-0">{{ message }}</p>
        <button
          type="button"
          class="mt-2 cursor-pointer text-primary underline"
          (click)="retry.emit()"
        >
          تلاش دوباره
        </button>
      </div>
    } @else {
      <div class="overflow-x-auto rounded-md border border-border bg-surface">
        <table class="w-full border-collapse text-sm" [attr.aria-busy]="loading() || null">
          <caption class="sr-only">
            {{
              caption()
            }}
          </caption>
          <thead class="bg-surface-muted text-muted">
            <tr>
              @for (col of columns(); track col.key) {
                <th scope="col" class="px-4 py-2 text-start font-medium" [class]="col.class ?? ''">
                  {{ col.header }}
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @if (loading() && rows().length === 0) {
              @for (n of skeletonRows; track n) {
                <tr class="border-t border-border">
                  @for (col of columns(); track col.key) {
                    <td class="px-4 py-3">
                      <div class="h-4 animate-pulse rounded bg-surface-muted"></div>
                    </td>
                  }
                </tr>
              }
            } @else if (rows().length === 0) {
              <tr>
                <td class="px-4 py-10 text-center text-muted" [attr.colspan]="columns().length">
                  {{ emptyText() }}
                </td>
              </tr>
            } @else {
              @for (row of rows(); track rowKey()(row)) {
                <tr
                  class="border-t border-border hover:bg-surface-muted/50"
                  [class.opacity-60]="loading()"
                >
                  @for (col of columns(); track col.key) {
                    <td class="px-4 py-3 align-middle" [class]="col.class ?? ''">
                      @if (cellTpl(); as tpl) {
                        <ng-container
                          [ngTemplateOutlet]="tpl"
                          [ngTemplateOutletContext]="{ $implicit: row, column: col }"
                        />
                      } @else {
                        {{ col.cell ? col.cell(row) : '' }}
                      }
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class DataTableComponent<T> {
  readonly columns = input.required<TableColumn<T>[]>();
  readonly rows = input<T[]>([]);
  readonly rowKey = input.required<(row: T) => string | number>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly emptyText = input('موردی برای نمایش وجود ندارد.');
  readonly caption = input('جدول داده‌ها');
  readonly retry = output<void>();

  protected readonly cellTpl = contentChild<TemplateRef<CellContext<T>>>('cell');
  protected readonly skeletonRows = [1, 2, 3, 4, 5];
}
