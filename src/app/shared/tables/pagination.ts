import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="mt-3 flex items-center justify-between gap-3 text-sm" aria-label="صفحه‌بندی">
        <span class="text-muted">{{ summary() }}</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="h-9 cursor-pointer rounded-md border border-border px-3 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="page() <= 1"
            (click)="pageChange.emit(page() - 1)"
          >
            قبلی
          </button>
          <span aria-current="page">{{ fa(page()) }} / {{ fa(totalPages()) }}</span>
          <button
            type="button"
            class="h-9 cursor-pointer rounded-md border border-border px-3 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="page() >= totalPages()"
            (click)="pageChange.emit(page() + 1)"
          >
            بعدی
          </button>
        </div>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalItems = input(0);
  readonly pageChange = output<number>();

  protected readonly summary = computed(() => `${this.fa(this.totalItems())} مورد`);
  protected fa(n: number): string {
    return new Intl.NumberFormat('fa-IR').format(n);
  }
}
