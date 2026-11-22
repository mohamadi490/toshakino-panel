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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/api-error';
import {
  CategoryCreate,
  CategoryRead,
  CategoryUpdate,
  PublishStatus,
} from '../../core/api/schemas';
import { AuthStore } from '../../core/auth/auth.store';
import { Permissions } from '../../core/authorization/permissions';
import { NotificationService } from '../../core/error-handling/notification.service';
import { PUBLISH_STATUS_LABELS } from '../../shared/domain/status-labels';
import { flattenTree, selfAndDescendantIds } from '../../shared/domain/tree';
import { applyFieldErrors } from '../../shared/forms/apply-field-errors';
import { FormFieldComponent } from '../../shared/forms/form-field';
import { blankToNull, changedFields, parseBoundedInt } from '../../shared/forms/patch';
import { httpUrlValidator } from '../../shared/forms/validators';
import { ButtonComponent } from '../../shared/ui/button';
import { TaxonomyApi } from './taxonomy.api';

function positionValidator(c: AbstractControl): ValidationErrors | null {
  return parseBoundedInt(c.value, 0, 100000) === null ? { integer: true } : null;
}

@Component({
  selector: 'app-category-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FormFieldComponent, ButtonComponent],
  template: `
    <header class="mb-4 flex items-center gap-3">
      <a
        routerLink="/catalog/categories"
        class="text-muted no-underline hover:text-foreground"
        aria-label="بازگشت به فهرست"
        >→</a
      >
      <h1 class="m-0">{{ isEdit() ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید' }}</h1>
    </header>

    @if (loadError(); as err) {
      <p class="rounded-md bg-danger-soft p-4 text-sm text-danger" role="alert">{{ err }}</p>
    } @else {
      @if (detail()?.deletedAt) {
        <div
          class="mb-4 flex items-center justify-between gap-3 rounded-md bg-warning-soft p-3 text-sm text-warning"
          role="status"
        >
          <span>این دسته‌بندی حذف شده است و برای ویرایش باید بازیابی شود.</span>
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
          [hint]="isEdit() ? null : 'اگر خالی بگذارید از روی نام ساخته می‌شود (فارسی هم مجاز است).'"
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
            تغییر اسلاگ آدرس عمومی دسته‌بندی را عوض می‌کند و ریدایرکت از آدرس قبلی ثبت می‌شود.
          </p>
        }

        <div class="grid gap-x-4 sm:grid-cols-2">
          <app-form-field label="دسته والد" for="parentId" [control]="form.controls.parentId">
            <select
              id="parentId"
              formControlName="parentId"
              class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— دسته اصلی (بدون والد) —</option>
              @for (o of parentOptions(); track o.id) {
                <option [value]="o.id">{{ '— '.repeat(o.depth) }}{{ o.name }}</option>
              }
            </select>
          </app-form-field>
          <app-form-field label="وضعیت" for="status" [control]="form.controls.status">
            <select
              id="status"
              formControlName="status"
              class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              @for (s of statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </app-form-field>
        </div>

        <app-form-field
          label="ترتیب نمایش"
          for="position"
          [control]="form.controls.position"
          hint="عدد ۰ تا ۱۰۰٬۰۰۰؛ کوچک‌تر بالاتر نمایش داده می‌شود."
        >
          <input
            id="position"
            inputmode="numeric"
            formControlName="position"
            class="ltr-field h-10 w-40 rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

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
            label="آدرس تصویر"
            for="imageUrl"
            [control]="form.controls.imageUrl"
            hint="آدرس کامل http(s)؛ در مرحله رسانه از کتابخانه انتخاب می‌شود."
          >
            <input
              id="imageUrl"
              formControlName="imageUrl"
              class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </app-form-field>
          <app-form-field
            label="متن جایگزین تصویر"
            for="imageAlt"
            [control]="form.controls.imageAlt"
          >
            <input
              id="imageAlt"
              formControlName="imageAlt"
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
        <app-form-field
          label="Canonical URL"
          for="canonicalUrl"
          [control]="form.controls.canonicalUrl"
          hint="اختیاری؛ آدرس کامل http(s)"
        >
          <input
            id="canonicalUrl"
            formControlName="canonicalUrl"
            class="ltr-field h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </app-form-field>

        <div class="mt-2 flex gap-2">
          @if (canSave()) {
            <button app-button type="submit" [loading]="saving()">
              {{ isEdit() ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی' }}
            </button>
          }
          <a
            routerLink="/catalog/categories"
            class="inline-flex h-10 items-center rounded-md px-4 text-sm text-foreground no-underline hover:bg-surface-muted"
            >بازگشت</a
          >
        </div>
      </form>
    }
  `,
})
export class CategoryFormPage {
  readonly id = input<string>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TaxonomyApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly detail = signal<CategoryRead | null>(null);
  protected readonly all = signal<CategoryRead[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly summaryError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly statuses = Object.entries(PUBLISH_STATUS_LABELS).map(([value, label]) => ({
    value: value as PublishStatus,
    label,
  }));

  protected readonly canSave = computed(
    () => this.store.can({ all: [Permissions.CategoriesWrite] }) && !this.detail()?.deletedAt,
  );

  /** A category cannot become its own parent or move under one of its descendants (`category_cycle`). */
  protected readonly parentOptions = computed(() => {
    const id = this.id();
    const blocked = id ? selfAndDescendantIds(this.all(), Number(id)) : new Set<number>();
    return flattenTree(this.all())
      .filter((n) => !blocked.has(n.item.id))
      .map((n) => ({ id: n.item.id, name: n.item.name, depth: n.depth }));
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', [Validators.maxLength(280)]],
    parentId: [''],
    status: ['draft' as PublishStatus],
    position: ['0', [positionValidator]],
    description: [''],
    imageUrl: ['', [Validators.maxLength(500), httpUrlValidator]],
    imageAlt: ['', [Validators.maxLength(200)]],
    seoTitle: ['', [Validators.maxLength(200)]],
    seoDescription: ['', [Validators.maxLength(500)]],
    canonicalUrl: ['', [Validators.maxLength(500), httpUrlValidator]],
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
      this.api
        .categories()
        .subscribe({ next: (list) => this.all.set(list), error: () => this.all.set([]) });
      if (id) {
        this.form.controls.slug.setValidators([Validators.required, Validators.maxLength(280)]);
        this.form.controls.slug.updateValueAndValidity();
        this.load(Number(id));
      }
      if (!this.store.can({ all: [Permissions.CategoriesWrite] })) this.form.disable();
    });
  }

  private load(id: number): void {
    this.api.category(id).subscribe({
      next: (c) => this.hydrate(c),
      error: (e: unknown) => this.loadError.set(ApiError.from(e).message),
    });
  }

  private hydrate(c: CategoryRead): void {
    this.detail.set(c);
    this.form.patchValue({
      name: c.name,
      slug: c.slug,
      parentId: c.parentId === null ? '' : String(c.parentId),
      status: c.status,
      position: String(c.position),
      description: c.description ?? '',
      imageUrl: c.imageUrl ?? '',
      imageAlt: c.imageAlt ?? '',
      seoTitle: c.seoTitle ?? '',
      seoDescription: c.seoDescription ?? '',
      canonicalUrl: c.canonicalUrl ?? '',
    });
    if (c.deletedAt) this.form.disable();
  }

  protected restore(): void {
    const id = this.id();
    if (!id) return;
    this.api.restoreCategory(Number(id)).subscribe({
      next: (c) => {
        this.notify.success('دسته‌بندی بازیابی شد.');
        this.hydrate(c);
        if (this.store.can({ all: [Permissions.CategoriesWrite] })) this.form.enable();
        this.form.controls.slug.updateValueAndValidity();
      },
      error: (e: unknown) => this.notify.error(ApiError.from(e).message),
    });
  }

  protected submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    this.summaryError.set(null);
    if (this.form.invalid) return;

    const id = this.id();
    let request;
    if (id) {
      const d = this.detail();
      if (!d) return;
      const body = changedFields<Record<string, unknown>>(
        this.initialValues(d),
        this.currentValues({ keepSlug: true }),
      );
      if (body === null) {
        this.notify.info('تغییری برای ذخیره وجود ندارد.');
        return;
      }
      request = this.api.updateCategory(Number(id), body as CategoryUpdate);
    } else {
      request = this.api.createCategory(this.buildCreate());
    }

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.notify.success(id ? 'تغییرات ذخیره شد.' : 'دسته‌بندی ایجاد شد.');
        void this.router.navigate(['/catalog/categories']);
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

  private currentValues(opts: { keepSlug: boolean }): Record<string, unknown> {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      slug: opts.keepSlug ? v.slug.trim() : blankToNull(v.slug),
      parentId: v.parentId === '' ? null : Number(v.parentId),
      status: v.status,
      position: parseBoundedInt(v.position, 0, 100000),
      description: blankToNull(v.description),
      imageUrl: blankToNull(v.imageUrl),
      imageAlt: blankToNull(v.imageAlt),
      seoTitle: blankToNull(v.seoTitle),
      seoDescription: blankToNull(v.seoDescription),
      canonicalUrl: blankToNull(v.canonicalUrl),
    };
  }

  private initialValues(d: CategoryRead): Record<string, unknown> {
    return {
      name: d.name,
      slug: d.slug,
      parentId: d.parentId,
      status: d.status,
      position: d.position,
      description: d.description,
      imageUrl: d.imageUrl,
      imageAlt: d.imageAlt,
      seoTitle: d.seoTitle,
      seoDescription: d.seoDescription,
      canonicalUrl: d.canonicalUrl,
    };
  }

  /** Create sends only what was filled; an empty slug makes the server derive it from the name. */
  private buildCreate(): CategoryCreate {
    const c = this.currentValues({ keepSlug: false });
    const body: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(c)) if (val !== null) body[k] = val;
    return body as unknown as CategoryCreate;
  }
}
