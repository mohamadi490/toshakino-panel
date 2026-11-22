import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { AttributeCreate, AttributeRead, AttributeUpdate } from '../../core/api/schemas';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { changedFields, parseBoundedInt } from '../../shared/forms/patch';
import { ButtonComponent } from '../../shared/ui/button';
import { ConfirmService } from '../../shared/ui/confirm';
import { IconComponent } from '../../shared/ui/icon';
import { TaxonomyApi } from './taxonomy.api';

function positionValidator(c: AbstractControl): ValidationErrors | null {
  return parseBoundedInt(c.value, 0, 100000) === null ? { integer: true } : null;
}

/**
 * `requireValue`: existing values (edit mode) must keep a text; blank rows added while creating are
 * simply ignored on submit, so they never block the form without an error message.
 */
function valueRow(fb: FormBuilder, id = 0, value = '', position = '0', requireValue = true) {
  return fb.nonNullable.group({
    id: [id],
    value: [
      value,
      requireValue ? [Validators.required, Validators.maxLength(100)] : [Validators.maxLength(100)],
    ],
    position: [position, [positionValidator]],
  });
}
type ValueRow = ReturnType<typeof valueRow>;

@Component({
  selector: 'app-attribute-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ButtonComponent, IconComponent],
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a
        routerLink="/catalog/attributes"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">{{ isEdit() ? 'ویرایش ویژگی' : 'ویژگی جدید' }}</h1>
    </header>

    @if (loadError(); as err) {
      <p class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">{{ err }}</p>
    } @else {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        class="max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-card"
      >
        @if (summaryError(); as s) {
          <p class="mb-4 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{{ s }}</p>
        }
        <div class="grid gap-x-4 sm:grid-cols-3">
          <div class="sm:col-span-2">
            <app-form-field
              label="نام ویژگی"
              for="name"
              [control]="form.controls.name"
              [required]="true"
            >
              <input
                id="name"
                formControlName="name"
                placeholder="مثلاً سایز"
                class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
            </app-form-field>
          </div>
          <app-form-field label="ترتیب" for="position" [control]="form.controls.position">
            <input
              id="position"
              inputmode="numeric"
              formControlName="position"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
        </div>

        @if (!isEdit()) {
          <h3 class="mb-2 mt-2">مقدارها</h3>
          @for (row of rows.controls; track row; let i = $index) {
            <div class="mb-2 flex items-start gap-2" [formGroup]="row">
              <input
                [attr.aria-label]="'مقدار ' + (i + 1)"
                formControlName="value"
                placeholder="مثلاً ۹۰×۲۰۰"
                class="h-10 grow rounded-md border border-border bg-background px-3 text-sm"
              />
              <input
                [attr.aria-label]="'ترتیب مقدار ' + (i + 1)"
                formControlName="position"
                inputmode="numeric"
                class="ltr-field h-10 w-24 rounded-md border border-border bg-background px-3 text-sm"
              />
              @if (canWrite()) {
                <button
                  type="button"
                  class="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-danger"
                  [attr.aria-label]="'حذف مقدار ' + (i + 1)"
                  (click)="rows.removeAt(i)"
                >
                  <app-icon name="trash" [size]="18" />
                </button>
              }
            </div>
          }
          @if (canWrite()) {
            <button app-button variant="ghost" type="button" (click)="addLocalRow()">
              <app-icon name="plus" [size]="16" /> افزودن مقدار
            </button>
          }
        }

        <div class="mt-4 flex gap-2">
          @if (canWrite()) {
            <button app-button type="submit" [loading]="saving()">
              {{ isEdit() ? 'ذخیره نام و ترتیب' : 'ایجاد ویژگی' }}
            </button>
          }
          <a
            routerLink="/catalog/attributes"
            class="inline-flex h-10 items-center rounded-md px-4 text-sm text-foreground no-underline hover:bg-surface-muted"
            >بازگشت</a
          >
        </div>
      </form>

      @if (isEdit() && attribute(); as attr) {
        <section
          class="mt-4 max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-card"
          aria-labelledby="values-h"
        >
          <h2 id="values-h" class="mb-1 mt-0">مقدارها</h2>
          <p class="mb-3 mt-0 text-xs text-muted">
            هر تغییر همان لحظه ذخیره می‌شود. مقداری که Variant ای از آن استفاده می‌کند حذف نمی‌شود.
          </p>
          @for (row of rows.controls; track row.controls.id.value; let i = $index) {
            <div class="mb-2 flex items-start gap-2" [formGroup]="row">
              <input
                [attr.aria-label]="'مقدار ' + (i + 1)"
                formControlName="value"
                class="h-10 grow rounded-md border border-border bg-background px-3 text-sm"
              />
              <input
                [attr.aria-label]="'ترتیب مقدار ' + (i + 1)"
                formControlName="position"
                inputmode="numeric"
                class="ltr-field h-10 w-24 rounded-md border border-border bg-background px-3 text-sm"
              />
              @if (canWrite()) {
                <button
                  app-button
                  variant="secondary"
                  type="button"
                  [disabled]="!rowChanged(row, attr)"
                  (click)="saveRow(row)"
                >
                  ذخیره
                </button>
                <button
                  type="button"
                  class="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-danger"
                  [attr.aria-label]="'حذف مقدار ' + (i + 1)"
                  (click)="removeRow(row)"
                >
                  <app-icon name="trash" [size]="18" />
                </button>
              }
            </div>
          } @empty {
            <p class="m-0 text-sm text-muted">هنوز مقداری ندارد.</p>
          }
          @if (canWrite()) {
            <form
              class="mt-4 flex items-start gap-2 border-t border-border pt-4"
              [formGroup]="addForm"
              (ngSubmit)="addValue()"
              novalidate
            >
              <input
                aria-label="مقدار جدید"
                formControlName="value"
                placeholder="مقدار جدید"
                class="h-10 grow rounded-md border border-border bg-background px-3 text-sm"
              />
              <input
                aria-label="ترتیب مقدار جدید"
                formControlName="position"
                inputmode="numeric"
                class="ltr-field h-10 w-24 rounded-md border border-border bg-background px-3 text-sm"
              />
              <button app-button type="submit" [loading]="addingValue()">افزودن</button>
            </form>
          }
        </section>
      }
    }
  `,
})
export class AttributeFormPage {
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TaxonomyApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly attribute = signal<AttributeRead | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly addingValue = signal(false);
  protected readonly canWrite = computed(() =>
    this.store.can({ all: [Permissions.ProductsWrite] }),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    position: ['0', [positionValidator]],
  });
  protected readonly rows = this.fb.array<ValueRow>([]);
  protected readonly addForm = this.fb.nonNullable.group({
    value: ['', [Validators.required, Validators.maxLength(100)]],
    position: ['0', [positionValidator]],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id)
        this.api
          .attribute(Number(id))
          .subscribe({
            next: (a) => this.hydrate(a),
            error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
          });
      if (!this.canWrite()) {
        this.form.disable();
        this.rows.disable();
        this.addForm.disable();
      }
    });
  }

  private hydrate(a: AttributeRead): void {
    this.attribute.set(a);
    this.form.patchValue({ name: a.name, position: String(a.position) });
    this.form.markAsPristine();
    this.rows.clear();
    [...a.values]
      .sort((x, y) => x.position - y.position || x.id - y.id)
      .forEach((v) => this.rows.push(valueRow(this.fb, v.id, v.value, String(v.position))));
    if (!this.canWrite()) this.rows.disable();
  }

  protected addLocalRow(): void {
    this.rows.push(valueRow(this.fb, 0, '', '0', false));
  }

  protected rowChanged(row: ValueRow, attr: AttributeRead): boolean {
    const orig = attr.values.find((v) => v.id === row.controls.id.value);
    if (!orig) return false;
    return (
      row.controls.value.value.trim() !== orig.value ||
      parseBoundedInt(row.controls.position.value, 0, 100000) !== orig.position
    );
  }

  // ---- create / rename

  protected submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    this.rows.markAllAsTouched();
    this.summaryError.set(null);
    if (this.form.invalid || (!this.isEdit() && this.rows.invalid)) return;

    const v = this.form.getRawValue();
    const position = parseBoundedInt(v.position, 0, 100000) ?? 0;
    const id = this.id();
    let request;
    if (id) {
      const a = this.attribute();
      if (!a) return;
      const body = changedFields<Record<string, unknown>>(
        { name: a.name, position: a.position },
        { name: v.name.trim(), position },
      );
      if (body === null) {
        this.notify.info('تغییری برای ذخیره وجود ندارد.');
        return;
      }
      request = this.api.updateAttribute(Number(id), body as AttributeUpdate);
    } else {
      const values = this.rows
        .getRawValue()
        .map((r) => ({
          value: r.value.trim(),
          position: parseBoundedInt(r.position, 0, 100000) ?? 0,
        }))
        .filter((r) => r.value !== '');
      const dup = new Set(values.map((r) => r.value.toLowerCase()));
      if (dup.size !== values.length) {
        this.summaryError.set('مقدارهای ویژگی نباید تکراری باشند.');
        return;
      }
      const body: AttributeCreate = { name: v.name.trim(), position, values };
      request = this.api.createAttribute(body);
    }

    this.saving.set(true);
    request.subscribe({
      next: (a) => {
        this.notify.success(id ? 'تغییرات ذخیره شد.' : 'ویژگی ایجاد شد.');
        this.saving.set(false);
        if (id) this.hydrate(a);
        else void this.router.navigate(['/catalog/attributes']);
      },
      error: (e: unknown) => {
        const err = ApiError.from(e);
        const unmatched = applyFieldErrors(this.form, err.fieldErrors);
        this.summaryError.set(
          unmatched.length > 0 || Object.keys(err.fieldErrors).length === 0 ? err.message : null,
        );
        this.saving.set(false);
      },
    });
  }

  // ---- values (edit mode): each operation answers with the whole attribute

  protected addValue(): void {
    const id = this.id();
    if (!id || this.addingValue()) return;
    this.addForm.markAllAsTouched();
    if (this.addForm.invalid) return;
    const v = this.addForm.getRawValue();
    this.addingValue.set(true);
    this.api
      .addAttributeValue(Number(id), {
        value: v.value.trim(),
        position: parseBoundedInt(v.position, 0, 100000) ?? 0,
      })
      .subscribe({
        next: (a) => {
          this.hydrate(a);
          this.addForm.reset({ value: '', position: '0' });
          this.notify.success('مقدار افزوده شد.');
          this.addingValue.set(false);
        },
        error: (e: unknown) => {
          this.notify.error(ApiError.from(e).message);
          this.addingValue.set(false);
        },
      });
  }

  protected saveRow(row: ValueRow): void {
    const id = this.id();
    const a = this.attribute();
    if (!id || !a) return;
    row.markAllAsTouched();
    if (row.invalid) return;
    const orig = a.values.find((v) => v.id === row.controls.id.value);
    if (!orig) return;
    const body = changedFields<Record<string, unknown>>(
      { value: orig.value, position: orig.position },
      {
        value: row.controls.value.value.trim(),
        position: parseBoundedInt(row.controls.position.value, 0, 100000),
      },
    );
    if (body === null) return;
    this.api.updateAttributeValue(Number(id), orig.id, body).subscribe({
      next: (updated) => {
        this.hydrate(updated);
        this.notify.success('مقدار ذخیره شد.');
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }

  protected async removeRow(row: ValueRow): Promise<void> {
    const id = this.id();
    if (!id) return;
    const ok = await this.confirm.confirm({
      title: 'حذف مقدار',
      message: `مقدار «${row.controls.value.value}» حذف می‌شود. اگر Variant ای از آن استفاده کند، حذف انجام نمی‌شود. ادامه می‌دهید؟`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteAttributeValue(Number(id), row.controls.id.value).subscribe({
      next: (updated) => {
        this.hydrate(updated);
        this.notify.success('مقدار حذف شد.');
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }
}
