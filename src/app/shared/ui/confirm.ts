import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injectable,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<Pending | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.pending.set({ ...options, resolve });
    });
  }

  settle(ok: boolean): void {
    const p = this.pending();
    this.pending.set(null);
    p?.resolve(ok);
  }
}

/** Single host rendered once in the app root; uses the native <dialog> for focus trap and Esc handling. */
@Component({
  selector: 'app-confirm-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    dialog::backdrop {
      background: rgb(0 0 0 / 0.45);
    }
  `,
  template: `
    <dialog
      #dlg
      class="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-foreground shadow-overlay"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-msg"
      (cancel)="onCancel($event)"
      (close)="onClosed()"
    >
      @if (svc.pending(); as p) {
        <div class="p-5">
          <h2 id="confirm-title" class="m-0 mb-2">{{ p.title }}</h2>
          <p id="confirm-msg" class="m-0 text-sm text-muted">{{ p.message }}</p>
        </div>
        <div class="flex justify-end gap-2 border-t border-border bg-surface-muted p-3">
          <button
            type="button"
            class="h-10 cursor-pointer rounded-md px-4 text-sm hover:bg-border"
            (click)="svc.settle(false)"
          >
            {{ p.cancelLabel ?? 'انصراف' }}
          </button>
          <button
            type="button"
            class="h-10 cursor-pointer rounded-md px-4 text-sm font-medium text-primary-contrast"
            [class.bg-danger]="p.danger"
            [class.bg-primary]="!p.danger"
            (click)="svc.settle(true)"
          >
            {{ p.confirmLabel ?? 'تأیید' }}
          </button>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmHostComponent {
  protected readonly svc = inject(ConfirmService);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      const open = this.svc.pending() !== null;
      if (open && !el.open && typeof el.showModal === 'function') el.showModal();
      if (!open && el.open && typeof el.close === 'function') el.close();
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault(); // we close through settle() so the promise always resolves
    this.svc.settle(false);
  }

  protected onClosed(): void {
    if (this.svc.pending()) this.svc.settle(false);
  }
}
