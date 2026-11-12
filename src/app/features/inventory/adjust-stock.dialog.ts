import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ApiError } from '../../core/api/api-error';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { ButtonComponent } from '../../shared/ui/button';
import { normalizeDigits } from '../../shared/utilities/digits';
import { newIdempotencyKey } from '../../shared/utilities/idempotency';
import { InventoryApi } from './inventory.api';
import {
  AdjustmentReason,
  AdjustmentRequest,
  InventoryItem,
  REASON_LABELS,
} from './inventory.models';

const MAX_QTY = 1_000_000;

function parseQuantity(raw: unknown): number | null {
  const v = normalizeDigits(String(raw ?? '')).replace(/[,٬\s]/g, '');
  if (!/^\d{1,7}$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= MAX_QTY ? n : null;
}

function quantityValidator(c: AbstractControl): ValidationErrors | null {
  return parseQuantity(c.value) === null ? { quantity: true } : null;
}

@Component({
  selector: 'app-adjust-stock-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormFieldComponent, ButtonComponent],
  styles: `
    dialog::backdrop {
      background: rgb(0 0 0 / 0.45);
    }
  `,
  template: `
    <dialog
      #dlg
      aria-labelledby="adjust-title"
      (cancel)="onCancel($event)"
      class="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-foreground shadow-overlay"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="p-5">
          <h2 id="adjust-title" class="m-0 mb-1">تعدیل موجودی</h2>
          <p class="m-0 mb-4 text-sm text-muted">
            {{ item().productTitle }}<span class="ltr-field"> · {{ item().sku }}</span> <br />موجودی
            فعلی انبار: <strong>{{ fa(item().onHand) }}</strong>
          </p>

          @if (summaryError(); as s) {
            <p class="mb-3 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">
              {{ s }}
            </p>
          }

          <fieldset class="mb-3 flex gap-4 border-0 p-0">
            <legend class="mb-1 text-sm font-medium">نوع تغییر</legend>
            <label class="flex cursor-pointer items-center gap-2 text-sm"
              ><input type="radio" value="increase" formControlName="direction" /> افزایش</label
            >
            <label class="flex cursor-pointer items-center gap-2 text-sm"
              ><input type="radio" value="decrease" formControlName="direction" /> کاهش</label
            >
          </fieldset>

          <app-form-field
            label="تعداد"
            for="adjust-qty"
            [control]="form.controls.quantity"
            [required]="true"
          >
            <input
              id="adjust-qty"
              inputmode="numeric"
              formControlName="quantity"
              autocomplete="off"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>

          <p class="mb-3 mt-0 text-sm" role="status">
            موجودی پس از تعدیل:
            @if (resulting() === null) {
              <span class="text-muted">—</span>
            } @else {
              <strong [class.text-danger]="resulting()! < 0">{{ fa(resulting()!) }}</strong>
            }
            @if (negative()) {
              <span class="text-danger"> (موجودی نمی‌تواند منفی شود)</span>
            }
          </p>

          <app-form-field
            label="دلیل"
            for="adjust-reason"
            [control]="form.controls.reason"
            [required]="true"
          >
            <select
              id="adjust-reason"
              formControlName="reason"
              class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              @for (r of reasons; track r.value) {
                <option [value]="r.value">{{ r.label }}</option>
              }
            </select>
          </app-form-field>

          <app-form-field
            label="توضیح"
            for="adjust-note"
            [control]="form.controls.note"
            [required]="form.controls.reason.value === 'other'"
          >
            <textarea
              id="adjust-note"
              formControlName="note"
              rows="2"
              class="w-full rounded-md border border-border bg-background p-3 text-sm"
            ></textarea>
          </app-form-field>
        </div>
        <div class="flex justify-end gap-2 border-t border-border bg-surface-muted p-3">
          <button
            type="button"
            class="h-10 cursor-pointer rounded-md px-4 text-sm hover:bg-border"
            (click)="closed.emit()"
          >
            انصراف
          </button>
          <button app-button type="submit" [loading]="saving()" [disabled]="negative()">
            ثبت تعدیل
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class AdjustStockDialogComponent {
  readonly item = input.required<InventoryItem>();
  readonly closed = output<void>();
  readonly adjusted = output<InventoryItem>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventoryApi);
  private readonly notify = inject(NotificationService);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly saving = signal(false);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly reasons = (Object.keys(REASON_LABELS) as AdjustmentReason[]).map((value) => ({
    value,
    label: REASON_LABELS[value],
  }));

  protected readonly form = this.fb.nonNullable.group({
    direction: ['increase' as 'increase' | 'decrease'],
    quantity: ['', [Validators.required, quantityValidator]],
    reason: ['received' as AdjustmentReason, [Validators.required]],
    note: ['', [Validators.maxLength(300)]],
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** On-hand after the adjustment, for the preview only (the server stays the authority). */
  protected readonly resulting = computed<number | null>(() => {
    const v = this.value();
    const qty = parseQuantity(v.quantity);
    if (qty === null) return null;
    return this.item().onHand + (v.direction === 'decrease' ? -qty : qty);
  });
  protected readonly negative = computed(() => (this.resulting() ?? 0) < 0);

  /** One key per distinct payload: retrying the same intent is safe, a changed payload gets a fresh key. */
  private idempotencyKey = newIdempotencyKey();

  constructor() {
    this.form.valueChanges.subscribe(() => {
      this.idempotencyKey = newIdempotencyKey();
    });
    afterNextRender(() => {
      const el = this.dlg().nativeElement;
      if (typeof el.showModal === 'function' && !el.open) el.showModal();
    });
  }

  protected fa(n: number): string {
    return new Intl.NumberFormat('fa-IR').format(n);
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  protected submit(): void {
    if (this.saving()) return;
    this.summaryError.set(null);
    const v = this.form.getRawValue();
    this.form.controls.note.setValidators([
      Validators.maxLength(300),
      ...(v.reason === 'other' ? [Validators.required] : []),
    ]);
    this.form.controls.note.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched();
    const qty = parseQuantity(v.quantity);
    if (this.form.invalid || qty === null || this.negative()) return;

    const note = v.note.trim();
    const body: AdjustmentRequest = {
      variantId: this.item().variantId,
      delta: v.direction === 'decrease' ? -qty : qty,
      reasonCode: v.reason,
      ...(note ? { note } : {}),
    };
    this.saving.set(true);
    this.api.adjust(body, this.idempotencyKey).subscribe({
      next: (updated) => {
        this.notify.success('موجودی تعدیل شد.');
        this.saving.set(false);
        this.adjusted.emit(updated);
      },
      error: (e: unknown) => {
        const err = ApiError.from(e);
        // Backend names fields after the wire contract; map them to the form's control names.
        const mapped: Record<string, string[]> = {};
        for (const [k, msgs] of Object.entries(err.fieldErrors))
          mapped[k === 'delta' ? 'quantity' : k === 'reasonCode' ? 'reason' : k] = msgs;
        const unmatched = applyFieldErrors(this.form, mapped);
        this.summaryError.set(
          unmatched.length > 0 || Object.keys(err.fieldErrors).length === 0 ? err.message : null,
        );
        this.saving.set(false);
      },
    });
  }
}
