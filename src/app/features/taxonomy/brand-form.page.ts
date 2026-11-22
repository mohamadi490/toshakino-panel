import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import { BrandAdminRead, BrandCreate, BrandUpdate } from '../../core/api/schemas';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { blankToNull, changedFields } from '../../shared/forms/patch';
import { httpUrlValidator } from '../../shared/forms/validators';
import { ButtonComponent } from '../../shared/ui/button';
import { TaxonomyApi } from './taxonomy.api';

@Component({
  selector: 'app-brand-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ButtonComponent],
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a
        routerLink="/catalog/brands"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">{{ isEdit() ? 'ویرایش برند' : 'برند جدید' }}</h1>
    </header>

    @if (loadError(); as err) {
      <p class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">{{ err }}</p>
    } @else {
      @if (detail()?.deletedAt) {
        <div
          class="mb-4 flex items-center justify-between gap-3 rounded-md bg-warning-soft p-3 text-sm text-warning"
          role="status"
        >
          <span>این برند حذف شده است و برای ویرایش باید بازیابی شود.</span>
          <button app-button variant="secondary" type="button" (click)="restore()">بازیابی</button>
        </div>
      }
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        class="max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-card"
      >
        @if (summaryError(); as s) {
          <p class="mb-4 rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{{ s }}</p>
        }
        <app-form-field label="نام" for="name" [control]="form.controls.name" [required]="true">
          <input
            id="name"
            formControlName="name"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>
        <app-form-field
          label="اسلاگ (بخشی از آدرس)"
          for="slug"
          [control]="form.controls.slug"
          [required]="isEdit()"
          [hint]="isEdit() ? null : 'اگر خالی بگذارید از روی نام ساخته می‌شود.'"
        >
          <input
            id="slug"
            formControlName="slug"
            autocomplete="off"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>
        @if (slugChanged()) {
          <p class="mb-3 mt-0 rounded-md bg-warning-soft p-2 text-xs text-warning" role="status">
            تغییر اسلاگ آدرس عمومی برند را عوض می‌کند و ریدایرکت ثبت می‌شود.
          </p>
        }
        <app-form-field label="توضیحات" for="description" [control]="form.controls.description">
          <textarea
            id="description"
            formControlName="description"
            rows="3"
            class="w-full rounded-md border border-border bg-background p-3 text-sm"
          ></textarea>
        </app-form-field>
        <div class="grid gap-x-4 sm:grid-cols-2">
          <app-form-field
            label="آدرس لوگو"
            for="logoUrl"
            [control]="form.controls.logoUrl"
            hint="آدرس کامل http(s)"
          >
            <input
              id="logoUrl"
              formControlName="logoUrl"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
          <app-form-field label="متن جایگزین لوگو" for="logoAlt" [control]="form.controls.logoAlt">
            <input
              id="logoAlt"
              formControlName="logoAlt"
              class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
        </div>
        <h3 class="mb-2 mt-4">سئو</h3>
        <app-form-field
          label="عنوان سئو"
          for="seoTitle"
          [control]="form.controls.seoTitle"
          hint="پیشنهاد: حداکثر ۷۰ کاراکتر"
        >
          <input
            id="seoTitle"
            formControlName="seoTitle"
            class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>
        <app-form-field
          label="توضیحات سئو"
          for="seoDescription"
          [control]="form.controls.seoDescription"
          hint="پیشنهاد: حداکثر ۱۶۰ کاراکتر"
        >
          <textarea
            id="seoDescription"
            formControlName="seoDescription"
            rows="2"
            class="w-full rounded-md border border-border bg-background p-3 text-sm"
          ></textarea>
        </app-form-field>
        <div class="mt-2 flex gap-2">
          @if (canSave()) {
            <button app-button type="submit" [loading]="saving()">
              {{ isEdit() ? 'ذخیره تغییرات' : 'ایجاد برند' }}
            </button>
          }
          <a
            routerLink="/catalog/brands"
            class="inline-flex h-10 items-center rounded-md px-4 text-sm text-foreground no-underline hover:bg-surface-muted"
            >بازگشت</a
          >
        </div>
      </form>
    }
  `,
})
export class BrandFormPage {
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TaxonomyApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly detail = signal<BrandAdminRead | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly canSave = computed(
    () => this.store.can({ all: [Permissions.CategoriesWrite] }) && !this.detail()?.deletedAt,
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', [Validators.maxLength(280)]],
    description: [''],
    logoUrl: ['', [Validators.maxLength(500), httpUrlValidator]],
    logoAlt: ['', [Validators.maxLength(200)]],
    seoTitle: ['', [Validators.maxLength(200)]],
    seoDescription: ['', [Validators.maxLength(500)]],
  });

  private readonly slugValue = toSignal(this.form.controls.slug.valueChanges, { initialValue: '' });
  protected readonly slugChanged = computed(() => {
    const d = this.detail();
    const v = this.slugValue().trim();
    return !!d && v !== '' && v !== d.slug;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) {
        this.form.controls.slug.setValidators([Validators.required, Validators.maxLength(280)]);
        this.form.controls.slug.updateValueAndValidity();
        this.api
          .brand(Number(id))
          .subscribe({
            next: (b) => this.hydrate(b),
            error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
          });
      }
      if (!this.store.can({ all: [Permissions.CategoriesWrite] })) this.form.disable();
    });
  }

  private hydrate(b: BrandAdminRead): void {
    this.detail.set(b);
    this.form.patchValue({
      name: b.name,
      slug: b.slug,
      description: b.description ?? '',
      logoUrl: b.logoUrl ?? '',
      logoAlt: b.logoAlt ?? '',
      seoTitle: b.seoTitle ?? '',
      seoDescription: b.seoDescription ?? '',
    });
    if (b.deletedAt) this.form.disable();
  }

  protected restore(): void {
    const id = this.id();
    if (!id) return;
    this.api.restoreBrand(Number(id)).subscribe({
      next: (b) => {
        this.notify.success('برند بازیابی شد.');
        this.hydrate(b);
        if (this.store.can({ all: [Permissions.CategoriesWrite] })) this.form.enable();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }

  protected submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    this.summaryError.set(null);
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const id = this.id();
    let request;
    if (id) {
      const d = this.detail();
      if (!d) return;
      const body = changedFields<Record<string, unknown>>(
        {
          name: d.name,
          slug: d.slug,
          description: d.description,
          logoUrl: d.logoUrl,
          logoAlt: d.logoAlt,
          seoTitle: d.seoTitle,
          seoDescription: d.seoDescription,
        },
        {
          name: v.name.trim(),
          slug: v.slug.trim(),
          description: blankToNull(v.description),
          logoUrl: blankToNull(v.logoUrl),
          logoAlt: blankToNull(v.logoAlt),
          seoTitle: blankToNull(v.seoTitle),
          seoDescription: blankToNull(v.seoDescription),
        },
      );
      if (body === null) {
        this.notify.info('تغییری برای ذخیره وجود ندارد.');
        return;
      }
      request = this.api.updateBrand(Number(id), body as BrandUpdate);
    } else {
      const raw: Record<string, unknown> = {
        name: v.name.trim(),
        slug: blankToNull(v.slug),
        description: blankToNull(v.description),
        logoUrl: blankToNull(v.logoUrl),
        logoAlt: blankToNull(v.logoAlt),
        seoTitle: blankToNull(v.seoTitle),
        seoDescription: blankToNull(v.seoDescription),
      };
      const body: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(raw)) if (val !== null) body[k] = val;
      request = this.api.createBrand(body as unknown as BrandCreate);
    }

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notify.success(id ? 'تغییرات ذخیره شد.' : 'برند ایجاد شد.');
        void this.router.navigate(['/catalog/brands']);
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
}
