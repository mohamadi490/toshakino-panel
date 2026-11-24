import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { IconComponent } from '../../shared/ui/icon';
import { ApiError } from '../api/api-error';
import { MediaRead } from '../api/schemas';
import { NotificationService } from '../error-handling/notification.service';
import { MediaApi } from './media.api';

/**
 * Modal image chooser backed by the media library (`media.write`). Opens when `open` becomes true,
 * lets the user pick an existing image or upload a new one (which is then selected), and emits the
 * chosen `MediaRead`. Uses the native <dialog> for focus trapping and Esc handling.
 */
@Component({
  selector: 'app-media-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  styles: `dialog::backdrop { background: rgb(0 0 0 / 0.45); }`,
  template: `
    <dialog #dlg aria-labelledby="picker-title" (cancel)="onCancel($event)"
            class="m-auto w-[min(48rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-foreground shadow-overlay">
      <div class="flex items-center justify-between gap-3 border-b border-border p-4">
        <h2 id="picker-title" class="m-0">انتخاب تصویر از کتابخانه</h2>
        <button type="button" class="cursor-pointer text-muted hover:text-foreground" aria-label="بستن" (click)="closed.emit()"><app-icon name="close" /></button>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <label class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast">
          <app-icon name="upload" [size]="16" /> {{ uploading() ? 'در حال آپلود… ' + progress() + '٪' : 'آپلود تصویر جدید' }}
          <input type="file" class="sr-only" accept="image/jpeg,image/png,image/gif,image/webp" [disabled]="uploading()" (change)="onFile($event)" />
        </label>
        <span class="text-xs text-muted">JPEG، PNG، GIF یا WebP تا ۵ مگابایت</span>
      </div>

      <div class="max-h-[60vh] overflow-y-auto p-3">
        @if (error(); as e) {
          <p class="rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{{ e }}
            <button type="button" class="ms-2 cursor-pointer text-primary underline" (click)="load(page())">تلاش دوباره</button></p>
        } @else if (loading() && items().length === 0) {
          <p class="m-0 p-6 text-center text-sm text-muted" role="status">در حال بارگذاری…</p>
        } @else if (items().length === 0) {
          <p class="m-0 p-6 text-center text-sm text-muted">هنوز تصویری در کتابخانه نیست. یکی آپلود کنید.</p>
        } @else {
          <ul class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4" [class.opacity-60]="loading()">
            @for (m of items(); track m.id) {
              <li>
                <button type="button" class="block w-full cursor-pointer overflow-hidden rounded-md border border-border bg-surface-muted text-start hover:border-primary"
                        [attr.aria-label]="'انتخاب ' + m.originalName" (click)="pick(m)">
                  <img [src]="api.src(m.url)" [alt]="m.alt || m.originalName" loading="lazy" class="aspect-square w-full object-cover" referrerpolicy="no-referrer" />
                  <span class="block truncate px-2 py-1 text-xs">{{ m.originalName }}</span>
                </button>
              </li>
            }
          </ul>
        }
      </div>

      @if (totalPages() > 1) {
        <div class="flex items-center justify-between border-t border-border p-3 text-sm">
          <button type="button" class="h-9 cursor-pointer rounded-md border border-border px-3 disabled:opacity-50" [disabled]="page() <= 1" (click)="load(page() - 1)">قبلی</button>
          <span>{{ fa(page()) }} / {{ fa(totalPages()) }}</span>
          <button type="button" class="h-9 cursor-pointer rounded-md border border-border px-3 disabled:opacity-50" [disabled]="page() >= totalPages()" (click)="load(page() + 1)">بعدی</button>
        </div>
      }
    </dialog>
  `,
})
export class MediaPickerComponent {
  readonly open = input.required<boolean>();
  readonly picked = output<MediaRead>();
  readonly closed = output<void>();

  protected readonly api = inject(MediaApi);
  private readonly notify = inject(NotificationService);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly items = signal<MediaRead[]>([]);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly progress = signal(0);

  constructor() {
    effect(() => {
      const open = this.open();
      const el = this.dlg().nativeElement;
      if (open && !el.open && typeof el.showModal === 'function') el.showModal();
      if (!open && el.open && typeof el.close === 'function') el.close();
      if (open) untracked(() => this.load(1));
    });
  }

  protected fa(n: number): string {
    return new Intl.NumberFormat('fa-IR').format(n);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(page).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.page.set(res.pagination.page);
        this.totalPages.set(res.pagination.totalPages);
        this.loading.set(false);
      },
      error: (e: unknown) => { this.error.set(ApiError.from(e).message); this.loading.set(false); },
    });
  }

  protected pick(m: MediaRead): void {
    this.picked.emit(m);
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading()) return;
    const problem = this.api.validate(file);
    if (problem) { this.notify.error(problem); return; }
    this.uploading.set(true);
    this.progress.set(0);
    this.api.upload(file).subscribe({
      next: (e) => {
        this.progress.set(e.progress);
        if (e.media) { this.uploading.set(false); this.picked.emit(e.media); }
      },
      error: (err: unknown) => { this.notify.error(ApiError.from(err).message); this.uploading.set(false); },
    });
  }
}
