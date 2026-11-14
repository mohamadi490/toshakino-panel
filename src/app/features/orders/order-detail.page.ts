import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { DataTableComponent, TableColumn } from '../../shared/tables/data-table';
import { ButtonComponent } from '../../shared/ui/button';
import { ConfirmService } from '../../shared/ui/confirm';
import { newIdempotencyKey } from '../../shared/utilities/idempotency';
import { formatJalaliDateTime } from '../../shared/utilities/jalali-date';
import { formatMoney } from '../../shared/utilities/money';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_STATUS_LABELS,
  TONE_CLASSES,
  isCancelStatus,
  labelOf,
  toneOf,
} from '../../shared/domain/status-labels';
import { OrdersApi } from './orders.api';
import { OrderDetail, OrderItem } from './orders.models';

@Component({
  selector: 'app-order-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormFieldComponent,
    DataTableComponent,
    ButtonComponent,
  ],
  template: `
    <header class="mb-4 flex flex-wrap items-center gap-3">
      <a
        routerLink="/orders"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">
        سفارش <span class="ltr-field">{{ order()?.number ?? '' }}</span>
      </h1>
      @if (order(); as o) {
        <span class="rounded-full px-2 py-0.5 text-xs" [class]="tone(o.status)">{{
          statusLabel(o.status)
        }}</span>
        <span class="rounded-full px-2 py-0.5 text-xs" [class]="tone(o.paymentStatus)"
          >پرداخت: {{ paymentLabel(o.paymentStatus) }}</span
        >
      }
    </header>

    @if (loadError(); as err) {
      <div class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">
        <p class="m-0">{{ err }}</p>
        <button type="button" class="mt-2 cursor-pointer text-primary underline" (click)="reload()">
          تلاش دوباره
        </button>
      </div>
    } @else if (order(); as o) {
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <section
            class="rounded-lg border border-border bg-surface p-5 shadow-card"
            aria-labelledby="items-h"
          >
            <h2 id="items-h" class="mb-3 mt-0">اقلام (قیمت‌های زمان خرید)</h2>
            <app-data-table
              [columns]="itemColumns"
              [rows]="o.items"
              [rowKey]="itemKey"
              caption="اقلام سفارش"
              emptyText="سفارش قلمی ندارد."
            />
            <dl class="mb-0 mt-4 grid max-w-sm grid-cols-2 gap-y-1 text-sm ms-auto">
              <dt class="text-muted">جمع اقلام</dt>
              <dd class="m-0 text-end">{{ money(o.subtotalRial) }}</dd>
              <dt class="text-muted">تخفیف</dt>
              <dd class="m-0 text-end">{{ money(o.discountRial) }}</dd>
              <dt class="text-muted">هزینه ارسال</dt>
              <dd class="m-0 text-end">{{ money(o.shippingRial) }}</dd>
              <dt class="font-semibold">مبلغ نهایی</dt>
              <dd class="m-0 text-end font-semibold">{{ money(o.totalRial) }}</dd>
            </dl>
          </section>

          <section
            class="rounded-lg border border-border bg-surface p-5 shadow-card"
            aria-labelledby="pay-h"
          >
            <h2 id="pay-h" class="mb-3 mt-0">پرداخت‌ها</h2>
            @for (p of o.payments; track p.id) {
              <div
                class="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-sm first:border-t-0"
              >
                <span class="rounded-full px-2 py-0.5 text-xs" [class]="tone(p.status)">{{
                  paymentLabel(p.status)
                }}</span>
                <span>{{ money(p.amountRial) }}</span>
                <span class="ltr-field text-xs text-muted"
                  >{{ p.gateway || '' }} {{ p.referenceId || '' }}</span
                >
                <span class="text-xs text-muted">{{ date(p.createdAt) }}</span>
              </div>
            } @empty {
              <p class="m-0 text-sm text-muted">تراکنشی ثبت نشده است.</p>
            }
          </section>

          <section
            class="rounded-lg border border-border bg-surface p-5 shadow-card"
            aria-labelledby="hist-h"
          >
            <h2 id="hist-h" class="mb-3 mt-0">سوابق تغییر وضعیت</h2>
            <ol class="m-0 list-none space-y-3 p-0">
              @for (h of o.history; track $index) {
                <li class="border-s-2 border-border ps-3 text-sm">
                  <p class="m-0 font-medium">
                    @if (h.from) {
                      {{ statusLabel(h.from) }} ←
                    }
                    {{ statusLabel(h.to) }}
                  </p>
                  <p class="m-0 text-xs text-muted">
                    {{ date(h.at) }}
                    @if (h.actor) {
                      · {{ h.actor }}
                    }
                  </p>
                  @if (h.note) {
                    <p class="m-0 mt-1 text-sm">{{ h.note }}</p>
                  }
                </li>
              } @empty {
                <li class="text-sm text-muted">سابقه‌ای ثبت نشده است.</li>
              }
            </ol>
          </section>
        </div>

        <div class="space-y-4">
          @if (canChange() && o.allowedTransitions.length > 0) {
            <section
              class="rounded-lg border border-border bg-surface p-5 shadow-card"
              aria-labelledby="st-h"
            >
              <h2 id="st-h" class="mb-3 mt-0">تغییر وضعیت</h2>
              @if (summaryError(); as s) {
                <p class="mb-3 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">
                  {{ s }}
                </p>
              }
              <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
                <app-form-field
                  label="وضعیت جدید"
                  for="new-status"
                  [control]="form.controls.status"
                  [required]="true"
                >
                  <select
                    id="new-status"
                    formControlName="status"
                    class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">انتخاب کنید…</option>
                    @for (t of transitions(); track t) {
                      <option [value]="t">{{ statusLabel(t) }}</option>
                    }
                  </select>
                </app-form-field>
                <app-form-field
                  label="یادداشت"
                  for="status-note"
                  [control]="form.controls.note"
                  [required]="needsNote()"
                  [hint]="needsNote() ? 'برای لغو سفارش، ثبت دلیل الزامی است.' : null"
                >
                  <textarea
                    id="status-note"
                    formControlName="note"
                    rows="2"
                    class="w-full rounded-md border border-border bg-background p-3 text-sm"
                  ></textarea>
                </app-form-field>
                <button app-button type="submit" [loading]="saving()">ثبت وضعیت</button>
              </form>
            </section>
          } @else if (o.allowedTransitions.length === 0) {
            <p class="m-0 rounded-md bg-surface-muted p-3 text-sm text-muted" role="status">
              برای این سفارش تغییر وضعیت دیگری مجاز نیست.
            </p>
          }

          <section
            class="rounded-lg border border-border bg-surface p-5 shadow-card"
            aria-labelledby="cu-h"
          >
            <h2 id="cu-h" class="mb-3 mt-0">مشتری</h2>
            @if (canSeeCustomer()) {
              <p class="m-0 text-sm font-medium">{{ o.customer?.name || o.customerName || '—' }}</p>
              <p class="ltr-field m-0 text-sm text-muted">{{ o.customer?.mobile || '' }}</p>
              <p class="ltr-field m-0 text-sm text-muted">{{ o.customer?.email || '' }}</p>
            } @else {
              <p class="m-0 text-sm font-medium">{{ o.customerName || '—' }}</p>
              <p class="m-0 text-xs text-muted">اطلاعات تماس برای نقش شما قابل نمایش نیست.</p>
            }
          </section>

          <section
            class="rounded-lg border border-border bg-surface p-5 shadow-card"
            aria-labelledby="sh-h"
          >
            <h2 id="sh-h" class="mb-3 mt-0">ارسال</h2>
            <p class="m-0 text-sm">
              <span class="text-muted">وضعیت:</span> {{ shippingLabel(o.shippingStatus) }}
            </p>
            @if (o.shippingMethod) {
              <p class="m-0 text-sm"><span class="text-muted">روش:</span> {{ o.shippingMethod }}</p>
            }
            @if (canSeeCustomer() && o.shippingAddress; as a) {
              <p class="mb-0 mt-2 text-sm">
                {{ a.recipient }}<br />{{ a.province }}، {{ a.city }}<br />{{ a.address }}
                @if (a.postalCode) {
                  <br /><span class="ltr-field">{{ a.postalCode }}</span>
                }
              </p>
            } @else if (!canSeeCustomer()) {
              <p class="mb-0 mt-2 text-xs text-muted">آدرس تحویل برای نقش شما قابل نمایش نیست.</p>
            }
          </section>
        </div>
      </div>
    } @else {
      <p class="text-muted" role="status">در حال بارگذاری…</p>
    }
  `,
})
export class OrderDetailPage {
  readonly id = input.required<string>();

  private readonly api = inject(OrdersApi);
  private readonly store = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly order = signal<OrderDetail | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly canChange = computed(() =>
    this.store.can({ any: [Permissions.OrdersUpdateStatus, Permissions.OrdersCancel] }),
  );
  protected readonly canSeeCustomer = computed(() =>
    this.store.can({ all: [Permissions.CustomersRead] }),
  );

  /** Only server-allowed transitions, and cancelling only with `orders.cancel` (other targets need `orders.update_status`). */
  protected readonly transitions = computed(() => {
    const allowed = this.order()?.allowedTransitions ?? [];
    return allowed.filter((t) =>
      isCancelStatus(t)
        ? this.store.can({ all: [Permissions.OrdersCancel] })
        : this.store.can({ all: [Permissions.OrdersUpdateStatus] }),
    );
  });

  protected readonly form = this.fb.nonNullable.group({
    status: ['', [Validators.required]],
    note: ['', [Validators.maxLength(500)]],
  });
  protected readonly needsNote = signal(false);
  private idempotencyKey = newIdempotencyKey();

  protected readonly itemColumns: TableColumn<OrderItem>[] = [
    {
      key: 'title',
      header: 'کالا',
      cell: (i) => (i.optionsLabel ? `${i.title} — ${i.optionsLabel}` : i.title),
    },
    { key: 'sku', header: 'SKU', cell: (i) => i.sku, class: 'ltr-field' },
    { key: 'qty', header: 'تعداد', cell: (i) => new Intl.NumberFormat('fa-IR').format(i.quantity) },
    { key: 'unit', header: 'قیمت واحد', cell: (i) => formatMoney(i.unitPriceRial) },
    { key: 'discount', header: 'تخفیف', cell: (i) => formatMoney(i.discountRial) },
    { key: 'line', header: 'جمع ردیف', cell: (i) => formatMoney(i.lineTotalRial) },
  ];
  protected readonly itemKey = (i: OrderItem) => `${i.sku}`;

  constructor() {
    effect(() => this.load(this.id()));
    // A changed payload is a different intent, so it gets a fresh idempotency key; a retry of the same one reuses it.
    this.form.valueChanges.subscribe((v) => {
      this.idempotencyKey = newIdempotencyKey();
      this.needsNote.set(isCancelStatus(v.status ?? ''));
    });
  }

  protected tone = (key: string): string => TONE_CLASSES[toneOf(key)];
  protected statusLabel = (k: string) => labelOf(ORDER_STATUS_LABELS, k);
  protected paymentLabel = (k: string) => labelOf(PAYMENT_STATUS_LABELS, k);
  protected shippingLabel = (k: string | null | undefined) => labelOf(SHIPPING_STATUS_LABELS, k);
  protected money = (rial: number) => formatMoney(rial);
  protected date = (iso: string) => formatJalaliDateTime(iso);

  protected reload(): void {
    this.load(this.id());
  }

  private load(id: string): void {
    this.loadError.set(null);
    this.api.get(id).subscribe({
      next: (o) => this.order.set(o),
      error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
    });
  }

  protected async submit(): Promise<void> {
    const o = this.order();
    if (!o || this.saving()) return;
    this.summaryError.set(null);
    const v = this.form.getRawValue();
    const note = v.note.trim();
    this.form.controls.note.setValidators([
      Validators.maxLength(500),
      ...(isCancelStatus(v.status) ? [Validators.required] : []),
    ]);
    this.form.controls.note.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched();
    // Defence in depth: never send a status the server did not offer for this order.
    if (this.form.invalid || !this.transitions().includes(v.status)) return;

    if (isCancelStatus(v.status)) {
      const ok = await this.confirm.confirm({
        title: 'لغو سفارش',
        message: `سفارش ${o.number} لغو می‌شود. این کار ممکن است بازگشت‌ناپذیر باشد. ادامه می‌دهید؟`,
        confirmLabel: 'لغو سفارش',
        danger: true,
      });
      if (!ok) return;
    }

    this.saving.set(true);
    this.api
      .changeStatus(o.id, { status: v.status, ...(note ? { note } : {}) }, this.idempotencyKey)
      .subscribe({
        next: (updated) => {
          this.order.set(updated);
          this.form.reset({ status: '', note: '' });
          this.notify.success('وضعیت سفارش ثبت شد.');
          this.saving.set(false);
        },
        error: (e: unknown) => {
          const err = ApiError.from(e);
          const unmatched = applyFieldErrors(this.form, err.fieldErrors);
          this.summaryError.set(
            unmatched.length > 0 || Object.keys(err.fieldErrors).length === 0 ? err.message : null,
          );
          if (err.kind === 'conflict') this.reload(); // state changed elsewhere: show the fresh status and transitions
          this.saving.set(false);
        },
      });
  }
}
