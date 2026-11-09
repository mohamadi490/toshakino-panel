import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../core/error-handling/notification.service';
import { IconComponent } from '../../shared/ui/icon';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="fixed bottom-4 start-4 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      style="z-index: var(--ds-z-toast)"
      role="region"
      aria-label="اعلان‌ها"
      aria-live="polite"
    >
      @for (t of notify.toasts(); track t.id) {
        <div
          class="flex items-start gap-3 rounded-md border border-border bg-surface p-3 shadow-overlay"
          [class.border-s-4]="true"
          [class.border-s-success]="t.kind === 'success'"
          [class.border-s-danger]="t.kind === 'error'"
          [class.border-s-info]="t.kind === 'info'"
          [class.border-s-warning]="t.kind === 'warning'"
          [attr.role]="t.kind === 'error' ? 'alert' : 'status'"
        >
          <p class="m-0 grow text-sm">{{ t.message }}</p>
          <button
            type="button"
            class="cursor-pointer text-muted hover:text-foreground"
            aria-label="بستن"
            (click)="notify.dismiss(t.id)"
          >
            <app-icon name="close" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly notify = inject(NotificationService);
}
